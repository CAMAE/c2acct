/**
 * Display-only rules for the assessment module surface. Nothing here touches
 * what is stored or submitted: prompts stay byte-identical in the database and
 * in the submission payload (which is keyed by question id, not prompt text).
 * These functions decide only what the page SHOWS.
 */

/**
 * Firm alignment modules render every question on one page — Leslie's note:
 * 25 questions, no breaks, no section labels, the module title said once in
 * the header. Other modules keep the paged layout until they are reviewed.
 */
export function isFlatAssessmentLayout(moduleKey: string): boolean {
  return moduleKey.startsWith("firm_alignment_");
}

/**
 * The stored prompt for every firm module question carries the module title as
 * a prefix ("Operating Model and Workflow Discipline: How clearly is …"). The
 * header already says the title once, so the row shows the bare question.
 * Strips exactly one leading "<title>: " and nothing else; a prompt without the
 * prefix, or with a different title, is returned untouched.
 */
export function displayPrompt(prompt: string, moduleTitle: string): string {
  const title = moduleTitle.trim();
  if (!title) return prompt;
  const prefix = `${title}: `;
  if (!prompt.startsWith(prefix)) return prompt;
  const rest = prompt.slice(prefix.length).trim();
  return rest.length > 0 ? rest : prompt;
}
