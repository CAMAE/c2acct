/**
 * In-memory stand-in for the Prisma client, covering the agent-runtime tables.
 *
 * The agent hardening contracts (timeout cancellation, approval pause/resume,
 * idempotency, orphan sweep, circuit breaker) are all about ORDERING and
 * CONDITIONAL WRITES — "does this updateMany still match after that one ran?".
 * A fake that honours `where` clauses and returns real affected-row counts lets
 * those be asserted deterministically, with no database and no clock skew.
 *
 * Only the operations the runtime actually calls are implemented; anything else
 * throws loudly rather than silently returning undefined.
 */

export interface FakeRow {
  [key: string]: unknown;
}

export interface FakeDb {
  definitions: FakeRow[];
  runs: FakeRow[];
  steps: FakeRow[];
  approvals: FakeRow[];
  audits: FakeRow[];
  triggers: FakeRow[];
  states: FakeRow[];
}

export function emptyDb(): FakeDb {
  return { definitions: [], runs: [], steps: [], approvals: [], audits: [], triggers: [], states: [] };
}

let idCounter = 0;
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${String(idCounter).padStart(6, "0")}`;
}

/** Matches one row against a Prisma-shaped `where` (the subset the runtime uses). */
function matches(row: FakeRow, where: FakeRow | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([field, condition]) => {
    const value = row[field];
    if (condition === null) return value === null || value === undefined;
    if (condition instanceof Date) return value instanceof Date && value.getTime() === condition.getTime();
    if (typeof condition === "object" && condition !== null) {
      const c = condition as Record<string, unknown>;
      if ("lt" in c) return value instanceof Date && value.getTime() < (c.lt as Date).getTime();
      if ("lte" in c) return value instanceof Date && value.getTime() <= (c.lte as Date).getTime();
      if ("gte" in c) return value instanceof Date && value.getTime() >= (c.gte as Date).getTime();
      if ("in" in c) return (c.in as unknown[]).includes(value);
      if ("notIn" in c) return !(c.notIn as unknown[]).includes(value);
      if ("not" in c) return value !== c.not;
      throw new Error(`fake prisma: unsupported condition ${JSON.stringify(condition)}`);
    }
    return value === condition;
  });
}

function applyOrder(rows: FakeRow[], orderBy: FakeRow | FakeRow[] | undefined): FakeRow[] {
  if (!orderBy) return rows;
  const clauses = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...rows].sort((a, b) => {
    for (const clause of clauses) {
      const [field, dir] = Object.entries(clause)[0] as [string, string];
      const av = a[field];
      const bv = b[field];
      const an = av instanceof Date ? av.getTime() : (av as number | string);
      const bn = bv instanceof Date ? bv.getTime() : (bv as number | string);
      if (an === bn) continue;
      const cmp = an < bn ? -1 : 1;
      return dir === "desc" ? -cmp : cmp;
    }
    return 0;
  });
}

function project(row: FakeRow, select: FakeRow | undefined): FakeRow {
  if (!select) return { ...row };
  const out: FakeRow = {};
  for (const key of Object.keys(select)) {
    if (select[key]) out[key] = row[key];
  }
  return out;
}

interface TableOptions {
  /** Defaults applied on create (id, timestamps, nullable columns). */
  defaults: () => FakeRow;
}

function makeTable(rows: FakeRow[], options: TableOptions) {
  return {
    async create({ data, select }: { data: FakeRow; select?: FakeRow }) {
      const row = { ...options.defaults(), ...data };
      rows.push(row);
      return project(row, select);
    },
    async findUnique({ where, select }: { where: FakeRow; select?: FakeRow }) {
      const row = rows.find((candidate) => matches(candidate, where));
      return row ? project(row, select) : null;
    },
    async findUniqueOrThrow({ where, select }: { where: FakeRow; select?: FakeRow }) {
      const row = rows.find((candidate) => matches(candidate, where));
      if (!row) throw new Error(`fake prisma: no row for ${JSON.stringify(where)}`);
      return project(row, select);
    },
    async findFirst({ where, orderBy, select }: { where?: FakeRow; orderBy?: FakeRow; select?: FakeRow }) {
      const found = applyOrder(rows.filter((candidate) => matches(candidate, where)), orderBy)[0];
      return found ? project(found, select) : null;
    },
    async findMany({
      where,
      orderBy,
      select,
      take,
    }: {
      where?: FakeRow;
      orderBy?: FakeRow | FakeRow[];
      select?: FakeRow;
      take?: number;
    } = {}) {
      let found = applyOrder(rows.filter((candidate) => matches(candidate, where)), orderBy);
      if (typeof take === "number") found = found.slice(0, take);
      return found.map((row) => project(row, select));
    },
    async update({ where, data, select }: { where: FakeRow; data: FakeRow; select?: FakeRow }) {
      const row = rows.find((candidate) => matches(candidate, where));
      if (!row) throw new Error(`fake prisma: update matched no row for ${JSON.stringify(where)}`);
      Object.assign(row, data);
      return project(row, select);
    },
    /** Returns a real affected-row count — this is what the CAS guards assert on. */
    async updateMany({ where, data }: { where: FakeRow; data: FakeRow }) {
      const affected = rows.filter((candidate) => matches(candidate, where));
      for (const row of affected) Object.assign(row, data);
      return { count: affected.length };
    },
    async upsert({ where, create, update }: { where: FakeRow; create: FakeRow; update: FakeRow }) {
      const row = rows.find((candidate) => matches(candidate, where));
      if (row) {
        Object.assign(row, update);
        return { ...row };
      }
      const created = { ...options.defaults(), ...create };
      rows.push(created);
      return { ...created };
    },
    async count({ where }: { where?: FakeRow } = {}) {
      return rows.filter((candidate) => matches(candidate, where)).length;
    },
  };
}

/**
 * Captures raw-SQL calls so a test can assert on the generated WHERE clause —
 * the retrieval walls live in SQL, so that is where they must be proven.
 * `rawResult` is what the next $queryRaw returns.
 */
export interface RawCapture {
  calls: Array<{ sql: string; values: unknown[] }>;
  rawResult: unknown[];
}

export function createFakePrisma(db: FakeDb, raw?: RawCapture) {
  return {
    async $queryRaw(query: { sql?: string; strings?: string[]; values?: unknown[] }) {
      const sql = query.sql ?? (query.strings ?? []).join("?");
      raw?.calls.push({ sql, values: query.values ?? [] });
      return raw?.rawResult ?? [];
    },
    agentDefinition: makeTable(db.definitions, { defaults: () => ({ id: nextId("def") }) }),
    agentRun: makeTable(db.runs, {
      defaults: () => ({
        id: nextId("run"),
        startedAt: new Date(),
        finishedAt: null,
        durationMs: null,
        tokensInput: null,
        tokensOutput: null,
        estCostUsd: null,
        finalSummary: null,
        errorClass: null,
        errorMessage: null,
        triggerSource: null,
      }),
    }),
    agentStep: makeTable(db.steps, {
      defaults: () => ({ id: nextId("step"), toolName: null, toolArgs: null, toolResult: null, finishedAt: null }),
    }),
    agentApproval: makeTable(db.approvals, {
      defaults: () => ({
        id: nextId("apr"),
        createdAt: new Date(),
        decidedAt: null,
        decidedBy: null,
        decision: null,
        editedArgs: null,
        decisionNote: null,
        telegramMsgId: null,
        telegramHmac: null,
        toolName: null,
        idempotencyKey: null,
        consumedAt: null,
        rationale: null,
        blastRadius: null,
        estCostUsd: null,
      }),
    }),
    agentAuditLogEntry: makeTable(db.audits, {
      defaults: () => ({ id: nextId("aud"), createdAt: new Date(), runId: null, agentKey: null, outcome: null }),
    }),
    agentTriggerRequest: makeTable(db.triggers, {
      defaults: () => ({
        id: nextId("trg"),
        status: "pending",
        createdAt: new Date(),
        claimedAt: null,
        finishedAt: null,
        runId: null,
        resumeRunId: null,
        error: null,
        message: null,
        taskEnv: null,
        requestedBy: null,
      }),
    }),
    agentState: makeTable(db.states, { defaults: () => ({ id: nextId("st") }) }),
  };
}

/**
 * Install the fake as the default export of `@/lib/prisma`. Call from inside a
 * `vi.mock` factory (which vitest hoists above the imports under test).
 */
export function fakePrismaModule(db: FakeDb, raw?: RawCapture) {
  const client = createFakePrisma(db, raw);
  return { default: client, __esModule: true, prisma: client };
}
