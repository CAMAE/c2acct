"use client";

import { useState } from "react";

/**
 * "Draft a reminder" button (Phase B2b → 16c). A consultant/admin clicks it to
 * DRAFT a Pat-composed nudge; it POSTs to /api/notifications/nudge, which creates
 * a PENDING draft — it does NOT send. The nudge only reaches the firm after the
 * consultant approves it in the nudge queue (HITL). Self-contained client
 * component; the server resolves authorization.
 */

type NudgeButtonProps = {
  companyId: string;
  audience: "firm" | "vendor";
  label?: string;
};

type Status = "idle" | "drafting" | "drafted" | "error";

export default function NudgeButton({ companyId, audience, label = "Draft a reminder" }: NudgeButtonProps) {
  const [status, setStatus] = useState<Status>("idle");

  async function draft() {
    if (status === "drafting" || status === "drafted") return;
    setStatus("drafting");
    try {
      const res = await fetch("/api/notifications/nudge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyId, audience }),
      });
      setStatus(res.ok ? "drafted" : "error");
    } catch {
      setStatus("error");
    }
  }

  const text =
    status === "drafted"
      ? "Drafted — review in queue ✓"
      : status === "drafting"
        ? "Drafting…"
        : status === "error"
          ? "Couldn't draft — retry"
          : label;

  return (
    <button
      type="button"
      onClick={() => void draft()}
      disabled={status === "drafting" || status === "drafted"}
      data-testid="nudge-button"
      className="inline-flex items-center gap-2 rounded-full border border-[rgba(6,54,116,0.16)] bg-[rgba(6,54,116,0.06)] px-4 py-2 text-sm font-semibold text-[var(--shell-ink)] transition-colors hover:bg-[rgba(6,54,116,0.1)] disabled:opacity-60"
    >
      <span aria-hidden="true">🔔</span> {text}
    </button>
  );
}
