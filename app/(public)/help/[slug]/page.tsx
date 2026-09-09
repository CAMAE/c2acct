import Link from "next/link";
import { notFound } from "next/navigation";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";
import { inlineSegments, readHelpArticle, toHelpBlocks } from "@/lib/helpArticles";

/**
 * Depth box 6 (2026-09-09, flag-on): a public help article as a page, so every
 * what/why/how help card can link to the article that explains it. Flag-off
 * this route does not exist (notFound).
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = isNewFrontDoorEnabled() ? readHelpArticle(slug) : null;
  return { title: article ? `${article.title} | PAT help` : "PAT help" };
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  if (!isNewFrontDoorEnabled()) notFound();
  const { slug } = await params;
  const article = readHelpArticle(slug);
  if (!article) notFound();
  const blocks = toHelpBlocks(article.body);
  const sections = blocks.filter((block) => block.kind === "h2");
  const readMinutes = article.words ? Math.max(1, Math.round(article.words / 220)) : null;
  return (
    <div className="pat-container px-6 pb-20 pt-12">
      <p className="pat-label">
        <Link href="/help" className="hover:text-[var(--shell-ink)]">
          Help library
        </Link>
      </p>
      <h1 className="pat-h1 mt-3 max-w-[22em] text-[var(--shell-ink)]">{article.title}</h1>
      <p className="pat-meta mt-3 text-[var(--shell-muted)]">
        {sections.length} section{sections.length === 1 ? "" : "s"}
        {readMinutes ? ` · about ${readMinutes} min` : ""}
      </p>
      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
        <article className="max-w-[44rem]">
          {blocks.map((block, index) => {
            if (block.kind === "h2") {
              return (
                <h2 key={index} id={`s-${index}`} className="pat-h2 mt-10 scroll-mt-24 text-[var(--shell-ink)]">
                  {block.text}
                </h2>
              );
            }
            if (block.kind === "h3") {
              return (
                <h3 key={index} className="pat-h3 mt-6 text-[var(--shell-ink)]">
                  {block.text}
                </h3>
              );
            }
            if (block.kind === "ul") {
              return (
                <ul key={index} className="pat-body mt-3 grid gap-1.5 pl-5 text-[var(--shell-muted)]" style={{ listStyle: "disc" }}>
                  {block.items.map((item) => (
                    <li key={item}>
                      {inlineSegments(item).map((seg, i) =>
                        seg.bold ? (
                          <strong key={i} className="font-semibold text-[var(--shell-ink)]">
                            {seg.text}
                          </strong>
                        ) : (
                          <span key={i}>{seg.text}</span>
                        )
                      )}
                    </li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={index} className="pat-body mt-3 text-[var(--shell-muted)]">
                {inlineSegments(block.text).map((seg, i) =>
                  seg.bold ? (
                    <strong key={i} className="font-semibold text-[var(--shell-ink)]">
                      {seg.text}
                    </strong>
                  ) : (
                    <span key={i}>{seg.text}</span>
                  )
                )}
              </p>
            );
          })}
        </article>
        {sections.length > 1 ? (
          <nav aria-label="On this page" className="order-first lg:order-none lg:sticky lg:top-24 lg:self-start">
            <div className="pat-label">On this page</div>
            <ol className="mt-3 grid gap-2 text-sm text-[var(--shell-muted)]">
              {blocks.map((block, index) =>
                block.kind === "h2" ? (
                  <li key={index}>
                    <a href={`#s-${index}`} className="hover:text-[var(--shell-ink)]">
                      {block.text}
                    </a>
                  </li>
                ) : null
              )}
            </ol>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
