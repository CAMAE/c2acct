import prisma from "@/lib/prisma";
import { VENDOR_BRIEF_VARIANT_IDS } from "@/lib/briefs/executive-summary-templates";
import { FIRM_BRIEF_VARIANT_IDS } from "@/lib/firmBriefs/template-bank";

/**
 * Phase-4 Day-17 server-action API for BriefEditChoice (Mock v2.1 §7 +
 * §8 decision #13). Three bounded choice types — PHRASING_VARIANT,
 * EMPHASIS, ORDERING — replace a free-text editor so the consultant
 * polishes, never rewrites.
 *
 * Invariant 3 (docs/tenancy.md): briefId is a logical reference. Every
 * write resolves through consultantAssignment for the calling consultant
 * before touching BriefEditChoice — never trust a raw briefId from the
 * client.
 *
 * Failure-code discipline: tenancy short-circuits before validation, so a
 * forged briefId always returns 'not-found' (never leaks the section-key
 * allowlist or variant-id allowlist by returning 'invalid-section' /
 * 'invalid-choice'). Enforced by tests/brief-edit-choice-tenancy.contract.test.ts
 * assertion 8.
 *
 * Append-only audit shape: writes use upsert keyed on the unique index, so
 * a consultant who changes their mind replaces the prior row rather than
 * inserting a stale-row trail. The read layer composes the latest choice
 * per (briefId, sectionKey, choiceType).
 */

export type BriefKind = "vendor" | "firm";

export type BriefEditSectionKey =
  | "vendor.executive-summary"
  | "vendor.self-vs-market-delta"
  | "vendor.action-roadmap"
  | "firm.alignment-header"
  | "firm.stack-fit-analysis"
  | "firm.six-quarter-roadmap";

export type BriefEditChoiceType = "PHRASING_VARIANT" | "EMPHASIS" | "ORDERING";

export type BriefEditChoiceInput = {
  briefKind: BriefKind;
  /** vendor: companyId of the vendor; firm: companyId of the firm. */
  briefId: string;
  ecosystemId: string;
  sectionKey: BriefEditSectionKey;
  choiceType: BriefEditChoiceType;
  /**
   * Interpretation depends on choiceType:
   *   - PHRASING_VARIANT: variant id (must be in the section's variant allowlist).
   *   - EMPHASIS: comma-joined target-element ids (must each be in the section's emphasis allowlist).
   *   - ORDERING: comma-joined item ids (each non-empty + unique).
   */
  choiceValue: string;
};

export type BriefEditChoiceResult =
  | { ok: true; choice: { id: string; choiceValue: string; updatedAt: Date } }
  | { ok: false; reason: "not-found" | "invalid-choice" | "invalid-section" };

// ---------- Section x choice-type allowlist ----------

/**
 * The single source of truth for which (sectionKey, choiceType) tuples are
 * valid. Vendor + Firm Briefs each expose three sections; PHRASING_VARIANT
 * and EMPHASIS apply to all six. ORDERING only applies to the two sections
 * whose render shape is a reorderable list (vendor.action-roadmap items,
 * firm.six-quarter-roadmap action chips within quarters).
 */
const SECTION_CHOICE_ALLOWLIST: Record<BriefEditSectionKey, ReadonlySet<BriefEditChoiceType>> = {
  "vendor.executive-summary": new Set(["PHRASING_VARIANT", "EMPHASIS"]),
  "vendor.self-vs-market-delta": new Set(["PHRASING_VARIANT", "EMPHASIS"]),
  "vendor.action-roadmap": new Set(["PHRASING_VARIANT", "EMPHASIS", "ORDERING"]),
  "firm.alignment-header": new Set(["PHRASING_VARIANT", "EMPHASIS"]),
  "firm.stack-fit-analysis": new Set(["PHRASING_VARIANT", "EMPHASIS"]),
  "firm.six-quarter-roadmap": new Set(["PHRASING_VARIANT", "EMPHASIS", "ORDERING"]),
};

const VALID_SECTION_KEYS: ReadonlySet<string> = new Set(
  Object.keys(SECTION_CHOICE_ALLOWLIST)
);

/**
 * Emphasis target-element id allowlist per section. Components render
 * known element ids alongside data-emphasis-id attributes; this allowlist
 * is the schema the API enforces.
 */
const EMPHASIS_TARGETS: Record<BriefEditSectionKey, ReadonlySet<string>> = {
  "vendor.executive-summary": new Set(["headline", "confidence-callout"]),
  "vendor.self-vs-market-delta": new Set(["row-0", "row-1", "row-2"]),
  "vendor.action-roadmap": new Set(["bullet-commitment", "thirty-day", "sixty-day", "ninety-day"]),
  "firm.alignment-header": new Set(["score", "headline", "confidence-callout"]),
  "firm.stack-fit-analysis": new Set(["top-row", "reviewed-count"]),
  "firm.six-quarter-roadmap": new Set(["trajectory", "current-quarter"]),
};

function isValidSectionKey(value: string): value is BriefEditSectionKey {
  return VALID_SECTION_KEYS.has(value);
}

function variantIdsForSection(sectionKey: BriefEditSectionKey): readonly string[] | undefined {
  if (sectionKey.startsWith("vendor.")) {
    return VENDOR_BRIEF_VARIANT_IDS[sectionKey];
  }
  if (sectionKey.startsWith("firm.")) {
    return FIRM_BRIEF_VARIANT_IDS[sectionKey];
  }
  return undefined;
}

function validateChoiceValue(
  sectionKey: BriefEditSectionKey,
  choiceType: BriefEditChoiceType,
  choiceValue: string
): boolean {
  // Empty-string sentinel = "clear my choice". The read layer treats empty
  // as "no choice applied" so the brief falls back to the default render.
  // This is intentional: a consultant who wants to revert doesn't need a
  // separate API surface, and we keep the audit row instead of deleting.
  if (choiceValue === "") return true;

  if (choiceType === "PHRASING_VARIANT") {
    const allowed = variantIdsForSection(sectionKey);
    if (!allowed) return false;
    return allowed.includes(choiceValue);
  }

  if (choiceType === "EMPHASIS") {
    const allowed = EMPHASIS_TARGETS[sectionKey];
    const tokens = choiceValue.split(",").map((t) => t.trim());
    if (tokens.some((t) => t === "")) return false;
    if (new Set(tokens).size !== tokens.length) return false;
    return tokens.every((t) => allowed.has(t));
  }

  if (choiceType === "ORDERING") {
    const tokens = choiceValue.split(",").map((t) => t.trim());
    if (tokens.length === 0) return false;
    if (tokens.some((t) => t === "")) return false;
    if (new Set(tokens).size !== tokens.length) return false;
    return true;
  }

  return false;
}

// ---------- Tenancy resolution ----------

type EcosystemContext = {
  vendorCompanyId: string | null;
  firmCompanyIds: ReadonlySet<string>;
};

async function resolveEcosystemForConsultant(
  consultantProfileId: string,
  ecosystemId: string
): Promise<EcosystemContext | null> {
  // Invariant 1 + 3: assignment lookup is the first prisma call. No model
  // read or write may precede it.
  const assignment = await prisma.consultantAssignment.findFirst({
    where: { consultantProfileId, ecosystemId, active: true },
    select: {
      Ecosystem: {
        select: {
          vendorCompanyId: true,
          EcosystemFirm: { select: { firmCompanyId: true } },
        },
      },
    },
  });
  if (!assignment || !assignment.Ecosystem) return null;
  return {
    vendorCompanyId: assignment.Ecosystem.vendorCompanyId,
    firmCompanyIds: new Set(
      assignment.Ecosystem.EcosystemFirm.map((entry) => entry.firmCompanyId)
    ),
  };
}

function briefIsInEcosystem(
  briefKind: BriefKind,
  briefId: string,
  ecosystem: EcosystemContext
): boolean {
  if (briefKind === "vendor") {
    return ecosystem.vendorCompanyId === briefId;
  }
  return ecosystem.firmCompanyIds.has(briefId);
}

// ---------- Public API ----------

/**
 * Upsert a BriefEditChoice for the calling consultant.
 *
 * Order of operations is load-bearing:
 *   1. Tenancy gate — assignment lookup, fail-closed on miss.
 *   2. Brief-in-ecosystem check — fail-closed on cross-ecosystem briefId.
 *   3. Section-key validation — known-section allowlist.
 *   4. Choice-value validation — per-type, against per-section allowlists.
 *   5. Upsert via the (briefId, sectionKey, consultantProfileId, choiceType)
 *      unique index.
 *
 * Steps 1+2 fire BEFORE steps 3+4 so a forged briefId returns 'not-found'
 * regardless of payload validity — the response code must never confirm
 * the existence of someone else's brief, and must never leak the section /
 * variant allowlist for that brief. See contract test assertion 8.
 */
export async function upsertBriefEditChoiceForConsultant(
  consultantProfileId: string,
  input: BriefEditChoiceInput
): Promise<BriefEditChoiceResult> {
  const ecosystem = await resolveEcosystemForConsultant(
    consultantProfileId,
    input.ecosystemId
  );
  if (!ecosystem) return { ok: false, reason: "not-found" };
  if (!briefIsInEcosystem(input.briefKind, input.briefId, ecosystem)) {
    return { ok: false, reason: "not-found" };
  }

  if (!isValidSectionKey(input.sectionKey)) {
    return { ok: false, reason: "invalid-section" };
  }
  const allowedTypes = SECTION_CHOICE_ALLOWLIST[input.sectionKey];
  if (!allowedTypes.has(input.choiceType)) {
    return { ok: false, reason: "invalid-section" };
  }
  if (!validateChoiceValue(input.sectionKey, input.choiceType, input.choiceValue)) {
    return { ok: false, reason: "invalid-choice" };
  }

  const choice = await prisma.briefEditChoice.upsert({
    where: {
      briefId_sectionKey_consultantProfileId_choiceType: {
        briefId: input.briefId,
        sectionKey: input.sectionKey,
        consultantProfileId,
        choiceType: input.choiceType,
      },
    },
    update: { choiceValue: input.choiceValue },
    create: {
      briefId: input.briefId,
      sectionKey: input.sectionKey,
      consultantProfileId,
      choiceType: input.choiceType,
      choiceValue: input.choiceValue,
    },
    select: { id: true, choiceValue: true, updatedAt: true },
  });

  return { ok: true, choice };
}

export type BriefEditChoiceMapEntry = {
  choiceType: BriefEditChoiceType;
  choiceValue: string;
};

/**
 * Read the calling consultant's choices for one brief. Empty Map on
 * tenancy mismatch (read-path leak check — must not return "this brief
 * exists" via a richer error code). The brief render layer keys lookups
 * by `${sectionKey}::${choiceType}` so multiple choice types per section
 * coexist cleanly.
 */
export async function getBriefEditChoicesForConsultant(
  consultantProfileId: string,
  briefKind: BriefKind,
  briefId: string,
  ecosystemId: string
): Promise<Map<string, BriefEditChoiceMapEntry>> {
  const ecosystem = await resolveEcosystemForConsultant(
    consultantProfileId,
    ecosystemId
  );
  if (!ecosystem) return new Map();
  if (!briefIsInEcosystem(briefKind, briefId, ecosystem)) return new Map();

  const rows = await prisma.briefEditChoice.findMany({
    where: { consultantProfileId, briefId },
    select: { sectionKey: true, choiceType: true, choiceValue: true },
  });

  const out = new Map<string, BriefEditChoiceMapEntry>();
  for (const row of rows) {
    out.set(`${row.sectionKey}::${row.choiceType}`, {
      choiceType: row.choiceType as BriefEditChoiceType,
      choiceValue: row.choiceValue,
    });
  }
  return out;
}

// ---------- Exports for tests + components ----------

export const BRIEF_EMPHASIS_TARGETS = EMPHASIS_TARGETS;
export const BRIEF_SECTION_CHOICE_ALLOWLIST = SECTION_CHOICE_ALLOWLIST;
