/**
 * Section-level chunking for the help corpus.
 *
 * Retrieval was storing ONE chunk per article — the whole text at chunkIdx 0.
 * That was adequate while every article was a paragraph, and became the defect
 * the moment the B1 shelf landed 3,000-word articles beside 60-word ones:
 *
 *   - ts_rank compares whole documents, so long essays outrank short operational
 *     docs on the operational docs' own questions (the glossary occupied ranks
 *     1-6 for firm queries and pushed two eval goldens red);
 *   - every hit hands Pat an entire article as context, so a five-hit retrieval
 *     is ~15,000 words of prompt to answer one question — imprecise and
 *     expensive;
 *   - scores across thirty same-topic essays land within ~1% of each other,
 *     because at whole-article granularity they genuinely are all about the same
 *     thing.
 *
 * Length normalization would have fixed the scoreboard and left all three.
 *
 * The B1 corpus was AUTHORED for this: self-contained H2 sections, answer-first
 * openings, no orphan pronouns across section boundaries. That is skeleton law
 * rather than accident, which is what makes splitting at H2 safe — a section
 * lifted out of its article still reads as an answer.
 *
 * The citation shape was already ready too: `path#idx` refs and
 * `RetrievedChunk.chunkIdx` exist precisely so a source can hold many chunks.
 */

export type CorpusChunk = {
  chunkIdx: number;
  /** Text as indexed and as handed to the model. */
  text: string;
  tokens: number;
};

/** Same estimator the importer has always used. */
export function estimateTokens(value: string): number {
  return Math.ceil(value.length / 4);
}

/**
 * Split an article into section chunks.
 *
 * Chunk 0 is the material BEFORE the first H2 — the answer-first opening, which
 * is the highest-value chunk in an answer-first article and must keep index 0 so
 * existing `path#0` citations keep meaning "the top of this article".
 *
 * An article with no H2 (every legacy help doc) yields exactly one chunk whose
 * text is `title\n\nbody` — byte-identical to what the single-chunk indexer
 * produced, so re-indexing the legacy corpus is a no-op for its content and its
 * `#0` golden refs.
 *
 * Each section chunk carries `title — heading` so a section retrieved on its own
 * still says what it is part of. Without it, a chunk reading "It is computed
 * from the five module scores" arrives at the model with nothing to anchor it.
 */
export function splitIntoSections(title: string, body: string): CorpusChunk[] {
  const trimmedBody = body.trim();
  const lines = trimmedBody.split("\n");

  const headingIndexes: number[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (/^##\s+\S/.test(lines[index]!)) {
      headingIndexes.push(index);
    }
  }

  if (headingIndexes.length === 0) {
    const text = `${title}\n\n${trimmedBody}`;
    return [{ chunkIdx: 0, text, tokens: estimateTokens(text) }];
  }

  const chunks: CorpusChunk[] = [];

  // Chunk 0 — the opening, before the first H2.
  const intro = lines.slice(0, headingIndexes[0]).join("\n").trim();
  if (intro) {
    const text = `${title}\n\n${intro}`;
    chunks.push({ chunkIdx: 0, text, tokens: estimateTokens(text) });
  }

  for (let position = 0; position < headingIndexes.length; position += 1) {
    const start = headingIndexes[position]!;
    const end = headingIndexes[position + 1] ?? lines.length;
    const heading = lines[start]!.replace(/^##\s+/, "").trim();
    const sectionBody = lines.slice(start + 1, end).join("\n").trim();
    if (!sectionBody) continue;
    const text = `${title} — ${heading}\n\n${sectionBody}`;
    chunks.push({ chunkIdx: chunks.length, text, tokens: estimateTokens(text) });
  }

  // An article whose every section was empty still indexes as one chunk rather
  // than vanishing from the corpus entirely.
  if (chunks.length === 0) {
    const text = `${title}\n\n${trimmedBody}`;
    return [{ chunkIdx: 0, text, tokens: estimateTokens(text) }];
  }

  return chunks;
}
