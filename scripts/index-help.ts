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

type HelpArticle = { path: string; title: string; roleAccess: string[]; body: string };

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
];

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function estimateTokens(value: string): number {
  return Math.ceil(value.length / 4);
}

type HelpIndexClient = Pick<PrismaClient, "knowledgeSource" | "knowledgeChunk">;

/**
 * Idempotently upsert the help_doc corpus. Reusable from seeds (pass the shared
 * prisma client) and from the standalone `pnpm index:help` runner. Returns the
 * counts so callers can log them.
 */
export async function indexHelpDocs(prisma: HelpIndexClient): Promise<{ indexed: number; skipped: number; total: number }> {
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
