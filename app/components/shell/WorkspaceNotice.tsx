/**
 * Depth box 9 (2026-09-09, APPROVED flag-off): one-line notice a workspace home
 * shows after a redirect from a route that is not built yet. Keys are the only
 * accepted values; anything else renders nothing.
 */
const NOTICES: Record<string, string> = {
  "user-insight": "User insight is not built yet — you were brought back to your workspace.",
  "engagement-score": "Engagement scoring is not part of PAT yet — you were brought back to your workspace.",
};

export default function WorkspaceNotice({ notice }: { notice: string | undefined }) {
  const text = notice ? NOTICES[notice] : undefined;
  if (!text) return null;
  return (
    <p className="pat-soft-panel px-4 py-3 text-sm leading-6 text-[var(--shell-muted)]" role="status" data-testid="workspace-notice">
      {text}
    </p>
  );
}
