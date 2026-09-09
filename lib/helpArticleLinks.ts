/**
 * Depth box 6 (2026-09-09): every what/why/how help card links to the public
 * help article that explains it (help/public/<slug>.md, served at /help/<slug>
 * flag-on). Titles are the cards' own; slugs are the article file names.
 */
export const HELP_ARTICLE_BY_CARD: Record<string, { slug: string; label: string }> = {
  // firm workspace cards
  "Alignment Assessment": { slug: "inside-a-firm-assessment", label: "Inside a firm assessment" },
  "Product Assessments": { slug: "what-vendors-declare-and-firms-verify", label: "What vendors declare and firms verify" },
  Modules: { slug: "the-five-pillars-briefly", label: "The five pillars, briefly" },
  Insights: { slug: "how-pat-scoring-works", label: "How PAT scoring works" },
  "Alignment Sandbox": { slug: "the-alignment-delta-introduced", label: "The alignment delta, introduced" },
  // vendor workspace cards
  "Product Assessment": { slug: "what-vendors-declare-and-firms-verify", label: "What vendors declare and firms verify" },
  "Product Insight": { slug: "the-alignment-delta-introduced", label: "The alignment delta, introduced" },
  "Alignment Insight": { slug: "pat-for-vendors", label: "PAT for vendors" },
  // assessment help
  "Move one section at a time": { slug: "inside-a-firm-assessment", label: "Inside a firm assessment" },
  "Answer in context": { slug: "your-first-session-with-pat", label: "Your first session with PAT" },
  "Submit once at the end": { slug: "how-pat-scoring-works", label: "How PAT scoring works" },
  // consultant help
  "What is an ecosystem?": { slug: "what-an-ecosystem-is-in-pat", label: "What an ecosystem is in PAT" },
  "Vendor brief vs firm brief": { slug: "pat-for-consultants-and-ecosystem-owners", label: "PAT for consultants and ecosystem owners" },
  "Reading the deltas": { slug: "the-alignment-delta-introduced", label: "The alignment delta, introduced" },
  "Need more?": { slug: "questions-pat-hears-most", label: "Questions PAT hears most" },
};

export function helpArticleHref(cardTitle: string): { href: string; label: string } | null {
  const entry = HELP_ARTICLE_BY_CARD[cardTitle];
  return entry ? { href: `/help/${entry.slug}`, label: entry.label } : null;
}
