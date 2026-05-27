"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Deterministic client-side routing (mirrors ops/telegram-bot/routing). Picks the
// agent a command is about; the run endpoint parses the task from the message.
function classifyAgent(text: string): string | null {
  const lower = text.toLowerCase();
  if (/(patalign\.com|dns|nameserver|cloudflare|zone|domain)/.test(lower)) return "cloudflare-watcher";
  if (/(pilot|invite|invitation|provision|onboard|firm|summary|digest)/.test(lower)) return "pilot-ops";
  if (/(health|sign-?in|deploy|fingerprint|smoke|\bqa\b|production|\bprod\b|release)/.test(lower)) return "qa-smoke";
  return null;
}

export default function CommandBar() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const message = value.trim();
    if (!message || busy) return;
    const agentKey = classifyAgent(message);
    if (!agentKey) {
      setStatus("Couldn't route that to an agent. Mention qa, pilot, or domain/cloudflare.");
      return;
    }
    setBusy(true);
    setStatus(`Routing to ${agentKey}…`);
    try {
      const res = await fetch(`/api/agents/${agentKey}/run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = (await res.json()) as { ok?: boolean; task?: string | null; error?: string };
      if (res.ok && data.ok) {
        setStatus(`Triggered ${agentKey}${data.task ? ` (${data.task})` : ""}. Watch the activity feed / approvals.`);
        setValue("");
        setTimeout(() => router.refresh(), 1500);
      } else {
        setStatus(`Failed: ${data.error ?? res.status}`);
      }
    } catch (error) {
      setStatus(`Failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--shell-border)] bg-white/50 p-4">
      <div className="flex flex-wrap gap-3">
        <input
          className="pat-input flex-1"
          placeholder='e.g. "have pilot-ops draft an invitation for Test Firm 1"'
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
        />
        <button type="button" className="pat-button-primary" onClick={submit} disabled={busy}>
          {busy ? "Sending…" : "Send"}
        </button>
      </div>
      {status ? <div className="mt-2 text-sm text-[var(--shell-muted)]">{status}</div> : null}
    </div>
  );
}
