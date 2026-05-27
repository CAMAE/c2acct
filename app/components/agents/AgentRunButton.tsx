"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Triggers a run of a specific agent. Used for "Run now" and per-run "Replay". */
export default function AgentRunButton({
  agentKey,
  label = "Run now",
  message,
  variant = "secondary",
}: {
  agentKey: string;
  label?: string;
  message?: string;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function run() {
    if (busy) return;
    setBusy(true);
    setStatus("Triggering…");
    try {
      const res = await fetch(`/api/agents/${agentKey}/run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(message ? { message } : {}),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      setStatus(res.ok && data.ok ? "Triggered." : `Failed: ${data.error ?? res.status}`);
      if (res.ok && data.ok) setTimeout(() => router.refresh(), 1500);
    } catch (error) {
      setStatus(`Failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        className={variant === "primary" ? "pat-button-primary" : "pat-button-secondary"}
        onClick={run}
        disabled={busy}
      >
        {busy ? "…" : label}
      </button>
      {status ? <span className="text-xs text-[var(--shell-muted)]">{status}</span> : null}
    </span>
  );
}
