import Link from "next/link";
import { notFound } from "next/navigation";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";
import { listHelpArticleSlugs, readHelpArticle } from "@/lib/helpArticles";

export const dynamic = "force-dynamic";
export const metadata = { title: "Help library | PAT" };

/** Depth box 6 (flag-on): the public help library index. */
export default function HelpIndexPage() {
  if (!isNewFrontDoorEnabled()) notFound();
  const articles = listHelpArticleSlugs()
    .map((slug) => readHelpArticle(slug))
    .filter((article): article is NonNullable<typeof article> => article !== null);
  return (
    <div className="pat-container px-6 pb-20 pt-12">
      <p className="pat-label">Help library</p>
      <h1 className="pat-h1 mt-3 text-[var(--shell-ink)]">What PAT does, in plain terms</h1>
      <p className="pat-meta mt-3 text-[var(--shell-muted)]">{articles.length} articles</p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <li key={article.slug}>
            <Link href={`/help/${article.slug}`} className="pat-card pat-hover-card block p-5">
              <div className="text-base font-semibold text-[var(--shell-ink)]">{article.title}</div>
              {article.words ? <div className="pat-meta mt-1 text-[var(--shell-muted)]">about {Math.max(1, Math.round(article.words / 220))} min</div> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
