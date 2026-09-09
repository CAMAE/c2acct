import Link from "next/link";
import { helpArticleHref } from "@/lib/helpArticleLinks";

/** Depth box 6: "Read: <article> →" under a help card, when an article maps to it. */
export default function HelpArticleLink({ cardTitle }: { cardTitle: string }) {
  const article = helpArticleHref(cardTitle);
  if (!article) return null;
  return (
    <Link href={article.href} className="mt-4 inline-flex text-sm font-semibold text-[var(--brand-c2-blue)] hover:underline" data-testid="help-article-link">
      Read: {article.label} →
    </Link>
  );
}
