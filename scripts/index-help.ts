/**
 * Seed / index the customer-facing Pat help_doc corpus (Elite Sprint follow-up,
 * 2026-07-07). Turns the portal help content into KnowledgeSource(kind=help_doc)
 * + KnowledgeChunk rows so Ask Pat (/api/pat → retrieveHelp) answers from a local
 * corpus. Retrieval is Postgres lexical FTS (the generated `tsv` column) — no
 * embeddings, no external API at index or query time.
 *
 * Idempotent: sources are keyed by `path`; unchanged content (same contentHash)
 * is skipped. roleAccess scopes each article to its audience ([] = every
 * authenticated audience; consultant/admin are unrestricted and see all).
 *
 *   pnpm index:help                 # local docker DB
 *   pnpm dotenv -e .env.prod -- pnpm index:help   # (only with explicit intent)
 */
import { createHash } from "crypto";
import { KnowledgeSourceKind, type PrismaClient } from "@prisma/client";
import { runWithPrisma } from "./_shared/prismaScript";
import {
  formatCorpusLintReport,
  lintCorpus,
  type CorpusLintReport,
} from "@/lib/corpus/importLint";
import { DEPTH_TIER_CORE, type CorpusDepthTier } from "@/lib/patAssistant/corpusAccess";

type HelpArticle = {
  path: string;
  title: string;
  roleAccess: string[];
  body: string;
  /**
   * Retrieval depth (corpus program). Omitted = CORE, which is what every
   * article below is: the tier wall ships before the content it gates, so no
   * ELITE source can ever be authored into an unguarded corpus.
   */
  depthTier?: CorpusDepthTier;
};

// Faithful to the portal help content (FIRM_HELP_CARDS, vendorHelpCards,
// individualHelpCards) plus two global orientation articles.
export const HELP_ARTICLES: HelpArticle[] = [
  // ---- Global (every audience) ----
  {
    path: "help/global/what-is-patalign.md",
    title: "What is Patalign",
    roleAccess: [],
    body: "Patalign (PAT) is an alignment-measurement platform. Firms complete a five-module alignment assessment, vendors self-assess their products, and PAT turns that into grounded alignment insights, deltas, and benchmarks. Scores are computed from real assessment evidence — a measurement, not a claim.",
  },
  {
    path: "help/global/meet-pat.md",
    title: "Meet Pat, the optional AI assistant",
    roleAccess: [],
    body: "Pat is Patalign's optional AI guide. Turn Pat on to ask questions about using the platform in plain language. Pat is off by default and answers only from Patalign's help library; if it can't find a grounded answer it points you to support rather than guessing. Pat never changes your scores or how aggregated, anonymized benchmarks work.",
  },

  // ---- Firm ----
  {
    path: "help/firm/alignment-assessment.md",
    title: "Firm Alignment Assessment",
    roleAccess: ["firm"],
    body: "The five-module, 100-question firm alignment system — the main intake for firm-side Pro membership and PAT insight unlocking. Open the module overview, complete each module, and submit through the live PAT flow. Find it at /firm/alignment-assessment.",
  },
  {
    path: "help/firm/product-assessments.md",
    title: "Firm Product Assessments",
    roleAccess: ["firm"],
    body: "Firm-side product reviews aligned only to vendor-declared features — the firm-to-vendor product intelligence loop inside PAT. Choose a product, answer the feature-aligned questions, and persist the review. Find it at /firm/product-assessments.",
  },
  {
    path: "help/firm/alignment-insights.md",
    title: "Firm Alignment Insights",
    roleAccess: ["firm"],
    body: "Firm-facing Pro and Elite PAT alignment insights that turn alignment assessment and product signal into current-state decision support. Open firm alignment insight cards, review grounded Pro detail, and inspect staged Elite cards. Find it at /firm/insights.",
  },
  {
    path: "help/firm/admin.md",
    title: "Firm Admin and profile",
    roleAccess: ["firm"],
    body: "The firm admin and profile-management surface: manage profile information, invite users, and review current user status. This is where profile, user insight, and future external sync readiness live. Find it at /firm/admin.",
  },
  {
    path: "help/firm/alignment-board.md",
    title: "Firm Alignment Board (Elite)",
    roleAccess: ["firm"],
    body: "The Alignment Board lays your current product stack out as pieces, each carrying its live alignment score against your firm's five-module shape. Swap a piece for a candidate and your projected firm alignment recomputes, with a confidence band when the sample is thin. Elite reveals candidate product names; Pro shows an anonymized teaser. Find it at /firm/alignment-board.",
  },

  // ---- Vendor ----
  {
    path: "help/vendor/product-assessment.md",
    title: "Vendor Product Assessment",
    roleAccess: ["vendor"],
    body: "A per-product PAT assessment driven by declared feature coverage. Each product carries its own self-signal instead of one generic vendor score. Choose a product, declare features, complete the scaled question bank, and submit. Find it at /vendor/product-assessment.",
  },
  {
    path: "help/vendor/product-insight.md",
    title: "Vendor Product Insight",
    roleAccess: ["vendor"],
    body: "A product intelligence catalog with one standalone intelligence page per product. Open a product to review vendor self-signal, then see current Pro membership and staged Elite membership framing. Find it at /vendor/product-insight.",
  },
  {
    path: "help/vendor/alignment-insight.md",
    title: "Vendor Alignment Insight",
    roleAccess: ["vendor"],
    body: "Vendor-facing alignment insights tied to the current firm alignment layer, connecting vendor decision support back to actual firm assessment signal. Open the insight group, then inspect each detail page for what, why, and how to use it. Find it at /vendor/alignment-insights.",
  },
  {
    path: "help/vendor/profile-management.md",
    title: "Vendor Profile management",
    roleAccess: ["vendor"],
    body: "The editable vendor record for company identity, contact details, payment notes, address, and descriptive profile context. Use it when vendor profile information changes so the PAT record stays current and ready for later sync work.",
  },
  {
    path: "help/vendor/product-management.md",
    title: "Vendor Product management",
    roleAccess: ["vendor"],
    body: "The product-entry surface for adding software products that feed vendor product assessment and insight workflows. Use it when a new product needs to be added or product inventory needs to stay current before assessment work begins.",
  },

  // ---- Individual ----
  {
    path: "help/individual/alignment-assessment.md",
    title: "Individual Alignment Assessment",
    roleAccess: ["individual"],
    body: "The person-level PAT alignment assessment — a clean entry into your own PAT signal, not only firm or vendor views. Open it to use the PAT survey runtime and carry real person-level signal into the individual insight layer. Find it at /user/alignment-assessment.",
  },
  {
    path: "help/individual/insights.md",
    title: "Individual Insights",
    roleAccess: ["individual"],
    body: "The individual-facing PAT insight route with Pro membership presentation and locked Elite membership cards. Open the route to review the initial information architecture and locked-card treatment. Find it at /user/insights.",
  },
  {
    path: "help/individual/profile.md",
    title: "Individual Profile",
    roleAccess: ["individual"],
    body: "The scaffold for individual PAT profile detail. Review the basic structure and signed-in context presentation. Find it at /user/profile.",
  },

  // ---- Global orientation (Block 4 corpus expansion) ----
  {
    path: "help/global/membership-tiers.md",
    title: "Membership tiers: Free, Pro, and Elite",
    roleAccess: [],
    body: "Patalign has three membership tiers. Free keeps workspace entry, help, and the membership path visible. Pro opens the grounded current-state insight catalog. Elite adds the higher-order Elite Insights — directional projection, peer/benchmark comparison, and recommendation or demand surfaces built from firm-reviewed evidence. Manage your plan from your portal's membership page.",
  },
  {
    path: "help/global/sign-out.md",
    title: "How do I sign out?",
    roleAccess: [],
    body: "Open the navigation menu (the menu button at the top right of any page). At the bottom of the menu you'll see 'Signed in as' your email and a Sign out button — select Sign out to end your session. A Sign out link is also available in the page footer. Sign out is available from every portal (firm, vendor, consultant, admin).",
  },
  {
    path: "help/global/methodology.md",
    title: "How Patalign computes its scores (methodology)",
    roleAccess: [],
    body: "Patalign publishes its methodology at /methodology. Scores are plain averages with the sample size shown — never weighted, percentile, or significance-tested statistics. Alignment uses equal-weight module averaging; divergence needs at least three firm reviews before it is asserted; peer benchmarks are suppressed unless at least five firms contribute with no single firm dominating. The page is versioned with a changelog.",
  },
  {
    path: "help/global/directional-not-advice.md",
    title: "Are Patalign's numbers professional advice?",
    roleAccess: [],
    body: "No. Every score, benchmark, recommendation, and projection is directional and informational — not professional advice. You'll see this disclaimer near the numbers, with a link to the methodology. Figures are grounded in real assessment evidence, but they are decision support, not a substitute for professional judgment.",
  },
  {
    path: "help/global/confidence-bands.md",
    title: "What do the confidence bands mean?",
    roleAccess: [],
    body: "Confidence bands keep thin evidence visibly qualified. They are user-experience conventions, not statistical tests: no signal (no current evidence), sample-thin (fewer than 3 data points), emerging (3 to 5), and grounded (6 or more). A band never implies a p-value or significance — it just tells you how much evidence sits behind a reading.",
  },
  {
    path: "help/global/insufficient-peer-data.md",
    title: "Why does a benchmark say 'insufficient peer data'?",
    roleAccess: [],
    body: "Patalign will not publish a cross-firm or peer benchmark unless at least five distinct firms contribute and no single firm supplies more than a quarter of the cut. When a cut falls short, the surface shows an 'insufficient peer data' state instead of a number — the benchmark is withheld, not estimated. This protects you from reading a trend into too little data.",
  },
  {
    path: "help/global/demo-vs-real-data.md",
    title: "Is demo data mixed into my benchmarks?",
    roleAccess: [],
    body: "No. Demo and synthetic accounts are walled out of every customer-facing pool, so a real firm's benchmarks and averages are built only from real customer and pilot data. Demo accounts only ever see demo data. This data-boundary rule is enforced in code across every cross-firm aggregate.",
  },
  {
    path: "help/global/trust-center.md",
    title: "Where is Patalign's trust and security information?",
    roleAccess: [],
    body: "The Trust Center at /trust links the privacy, terms, security, support, billing, methodology, and release-proof pages. The security page lists Patalign's subprocessors (Vercel for hosting, Neon for the database, Stripe for payments, Anthropic for optional AI) and its data practices, including encryption in transit and tested tenant export and deletion paths.",
  },

  // ---- Firm Elite Insights (Block 3 surfaces) ----
  {
    path: "help/firm/elite-insights.md",
    title: "Firm Elite Insights",
    roleAccess: ["firm"],
    body: "Elite Insights are the higher-order firm surfaces, live with Elite membership. Open them from the Elite Insights tab on /firm/insights. There are three decision products: a Peer Position Report (where you rank against peer firms), a Gap-to-Top-Quartile Plan (ranked fixes with point deficits), and a Trajectory (your alignment over time with a directional projection). Every projection is labelled directional, not verified.",
  },
  {
    path: "help/firm/future-state-projection.md",
    title: "Firm future-state projection",
    roleAccess: ["firm"],
    body: "The future-state projection models where your alignment could move if you swap a product in your stack. It is computed from your own firm-reviewed evidence, per product-fit dimension, and re-means the stack with the candidate in place. It is a directional projection, not a verified outcome, and carries a confidence band based on how many reviewed products back it.",
  },
  {
    path: "help/firm/peer-benchmark.md",
    title: "Firm peer benchmark view",
    roleAccess: ["firm"],
    body: "The peer benchmark compares your alignment index — overall and per module — to an anonymized platform aggregate of other firms, with the contributing firm count shown. Any cut below the minimum-n safe harbor (five firms, no single firm dominating) is withheld as 'insufficient peer data'. It is a directional aggregate, never a ranking or percentile.",
  },
  {
    path: "help/firm/recommendation-engine.md",
    title: "Firm recommendation engine",
    roleAccess: ["firm"],
    body: "The recommendation engine sequences prioritized next actions across 30, 60, and 90-day windows, ranked by how strongly your firm-reviewed evidence points to each. Recommendations are grounded in your own gaps, not generic advice, and carry a confidence band based on how much alignment evidence you have completed.",
  },

  // ---- Vendor Elite Insights + BattleCard ----
  {
    path: "help/vendor/battlecard-secret-firms.md",
    title: "How do I unlock Secret Firms on the BattleCard?",
    roleAccess: ["vendor"],
    body: "On the vendor BattleCard, the firms that best fit your product are ranked by alignment fit. With Pro membership those firms are shown anonymized as 'Secret Firm 1', 'Secret Firm 2', and so on — you can see the fit and the ranking, but not who they are. Upgrading to Elite membership reveals the real firm names next to each ranked fit, so you can act on the match. To unlock Secret Firms, move from Pro to Elite on your vendor membership page; the ranking itself is the same, Elite simply names the firms.",
  },
  {
    path: "help/vendor/battlecard.md",
    title: "Vendor BattleCard",
    roleAccess: ["vendor"],
    body: "The BattleCard ranks the firms in your ecosystem by how well your product fits them, using firm-reviewed evidence where it exists. Alignment delta is the core metric on the BattleCard: it is how much your product's strengths sit above a firm's current alignment — the headroom you could lift them. Firms with the most headroom (the highest alignment delta) rank first. A large positive alignment delta is a Strong fit; a smaller positive delta is a Good fit; a delta at or below the firm's own alignment is a Weak fit. Deltas stay directional while a firm's review sample is still thin. Filter by fit tier (Strong, Good, Weak), open a firm to see the per-module gap table and headroom, and review the ranked next actions. Pro shows firms anonymized as Secret Firms; Elite names them. Find it at /vendor/battlecard.",
  },
  {
    path: "help/vendor/elite-insights.md",
    title: "Vendor Elite Insights",
    roleAccess: ["vendor"],
    body: "Vendor Elite Insights are live with Elite membership. Open them from the Elite Insights tab on /vendor/alignment-insights. There are three decision products: Category Position (where your product ranks in its category distribution), Demand Signals (which firm segments review you, review velocity, and how your products move in and out of simulated stacks), and an Alignment Gap Map (per-module divergence heatmap of where firms confirm or dispute your story). Every projection is labelled directional, not verified.",
  },
  {
    path: "help/vendor/benchmark-comparison.md",
    title: "Vendor benchmark comparison",
    roleAccess: ["vendor"],
    body: "Benchmark comparison shows how your products compare to an anonymized platform aggregate of firm reviews, with the contributing firm count. Cuts below the minimum-n safe harbor are withheld rather than estimated. It is a directional aggregate, not a market ranking.",
  },
  {
    path: "help/vendor/future-demand.md",
    title: "Vendor future demand projection",
    roleAccess: ["vendor"],
    body: "Future demand reads where firms are weakest across the platform — the lower a module's firm-side average, the stronger the directional demand for help there. Each signal shows its contributing firm count and confidence band; modules below the minimum-n safe harbor are withheld. It is a directional signal, not a forecast.",
  },
  {
    path: "help/vendor/expansion-simulation.md",
    title: "Vendor expansion simulation",
    roleAccess: ["vendor"],
    body: "Expansion simulation is a sandbox for vendors: it simulates adding or expanding a product across the five product-fit dimensions. Firm-reviewed fits are ranked; products with only vendor self-report are shown separately and floored below — they never outrank firm-reviewed fits until real firm reviews exist. It is directional, not a guaranteed outcome.",
  },
  {
    path: "help/vendor/membership.md",
    title: "Vendor membership and upgrading",
    roleAccess: ["vendor"],
    body: "Your vendor membership controls what opens: Pro unlocks the current-state alignment and product insight catalog and the anonymized BattleCard; Elite adds the Elite Insights and reveals Secret Firm names on the BattleCard. Manage or upgrade your plan at /vendor/membership.",
  },

  // ---- Consultant ----
  {
    path: "help/consultant/vendor-brief.md",
    title: "Consultant vendor brief",
    roleAccess: ["consultant"],
    body: "The consultant vendor brief summarizes a vendor across its ecosystem: firm averages, vendor self-report deltas, a per-firm heatmap, and an action roadmap. Firm-reviewed evidence is primary and self-report is always labelled. Divergence is only asserted once at least three firm reviews exist.",
  },
  {
    path: "help/consultant/ecosystems.md",
    title: "Consultant ecosystems",
    roleAccess: ["consultant"],
    body: "Consultants review one ecosystem per login, with each firm and vendor scoped to that ecosystem. Open an ecosystem to see its firm league table, per-firm alignment detail, and the vendor briefs for products in play. All cross-firm numbers exclude demo data and follow the same methodology as the rest of Patalign.",
  },
];

/**
 * The import lint (corpus program (d)) — the gate every write path runs first.
 *
 * Placed at the IMPORT boundary rather than in review, because the corpus is the
 * one place Pat is allowed to speak from: anything indexed here is something the
 * assistant will state to a customer as fact, in our voice, with a citation.
 * A banned construct that reaches the table is a claim we have already made.
 *
 * Throws rather than warns. A lint that only warns during a seed is a lint
 * nobody sees — seeds run unattended, and the offending row lands anyway.
 */
export class CorpusLintError extends Error {
  constructor(public readonly report: CorpusLintReport) {
    super(formatCorpusLintReport(report));
    this.name = "CorpusLintError";
  }
}

export function lintHelpArticles(articles: readonly HelpArticle[] = HELP_ARTICLES): CorpusLintReport {
  return lintCorpus(articles.map(({ path, title, body }) => ({ path, title, body })));
}

/** Lint, or throw with the full report. Called by every path that writes. */
export function assertHelpArticlesClean(articles: readonly HelpArticle[] = HELP_ARTICLES): void {
  const report = lintHelpArticles(articles);
  if (!report.ok) {
    throw new CorpusLintError(report);
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function estimateTokens(value: string): number {
  return Math.ceil(value.length / 4);
}

type HelpIndexClient = Pick<PrismaClient, "knowledgeSource" | "knowledgeChunk">;

/**
 * Read-only plan: which articles WOULD be (re)indexed vs. left unchanged, without
 * writing anything. Backs the dry-run default of scripts/seed-help-prod.ts.
 */
export async function planHelpDocs(
  prisma: Pick<PrismaClient, "knowledgeSource">
): Promise<{ toIndex: string[]; unchanged: string[]; total: number }> {
  // The dry-run lints too: a plan that reports "3 articles would be indexed" for
  // content the real run will reject is a dry-run that tested nothing.
  assertHelpArticlesClean();
  const toIndex: string[] = [];
  const unchanged: string[] = [];
  for (const article of HELP_ARTICLES) {
    const contentHash = sha256(`${article.title}\n\n${article.body}`);
    const existing = await prisma.knowledgeSource.findUnique({
      where: { path: article.path },
      select: { contentHash: true },
    });
    if (existing?.contentHash === contentHash) unchanged.push(article.path);
    else toIndex.push(article.path);
  }
  return { toIndex, unchanged, total: HELP_ARTICLES.length };
}

/**
 * Idempotently upsert the help_doc corpus. Reusable from seeds (pass the shared
 * prisma client) and from the standalone `pnpm index:help` runner. Returns the
 * counts so callers can log them.
 */
export async function indexHelpDocs(prisma: HelpIndexClient): Promise<{ indexed: number; skipped: number; total: number }> {
  // Gate before the first write, not per article: a corpus that is half-indexed
  // and then rejected is worse than one that is not indexed at all.
  assertHelpArticlesClean();
  let indexed = 0;
  let skipped = 0;
  for (const article of HELP_ARTICLES) {
    const text = `${article.title}\n\n${article.body}`;
    const contentHash = sha256(text);
    const existing = await prisma.knowledgeSource.findUnique({
      where: { path: article.path },
      select: { id: true, contentHash: true },
    });

    if (existing?.contentHash === contentHash) {
      skipped += 1;
      continue;
    }

    if (existing) {
      await prisma.knowledgeChunk.deleteMany({ where: { sourceId: existing.id } });
      await prisma.knowledgeSource.update({
        where: { id: existing.id },
        data: {
          kind: KnowledgeSourceKind.help_doc,
          contentHash,
          lastIndexedAt: new Date(),
          roleAccess: article.roleAccess,
          verticalId: "accounting",
          depthTier: article.depthTier ?? DEPTH_TIER_CORE,
        },
      });
      await prisma.knowledgeChunk.create({
        data: { sourceId: existing.id, chunkIdx: 0, text, tokens: estimateTokens(text) },
      });
    } else {
      const source = await prisma.knowledgeSource.create({
        data: {
          kind: KnowledgeSourceKind.help_doc,
          path: article.path,
          contentHash,
          lastIndexedAt: new Date(),
          roleAccess: article.roleAccess,
          verticalId: "accounting",
          depthTier: article.depthTier ?? DEPTH_TIER_CORE,
        },
      });
      await prisma.knowledgeChunk.create({
        data: { sourceId: source.id, chunkIdx: 0, text, tokens: estimateTokens(text) },
      });
    }
    indexed += 1;
  }
  return { indexed, skipped, total: HELP_ARTICLES.length };
}

// Only run the standalone flow when invoked directly (not when imported by a seed).
if (process.argv[1] && process.argv[1].endsWith("index-help.ts")) {
  runWithPrisma(async (prisma) => {
    const { indexed, skipped, total } = await indexHelpDocs(prisma);
    console.log(`help_doc index complete: ${indexed} indexed, ${skipped} unchanged, ${total} total articles.`);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
