"use client";

import { useState } from "react";

/**
 * "Send reminder" button (Phase B2b, 2026-06-18). A consultant/admin clicks it to
 * nudge a firm/vendor; it POSTs to /api/notifications/nudge and the reminder lands
 * in the recipients' notification center. Self-contained client component; the
 * server resolves authorization, so this only triggers the action.
 */

type NudgeButtonProps = {
  companyId: string;
  audience: "firm" | "vendor";
  label?: string;
};

type Status = "idle" | "sending" | "sent" | "error";

export default function NudgeButton({ companyId, audience, label = "Send reminder" }: NudgeButtonProps) {
  const [status, setStatus] = useState<Status>("idle");

  async function send() {
    if (status === "sending" || status === "sent") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/notifications/nudge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyId, audience }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  const text =
    status === "sent"
      ? "Reminder sent ✓"
      : status === "sending"
        ? "Sending…"
        : status === "error"
          ? "Couldn't send — retry"
          : label;

  return (
    <button
      type="button"
      onClick={() => void send()}
      disabled={status === "sending" || status === "sent"}
      data-testid="nudge-button"
      className="inline-flex items-center gap-2 rounded-full border border-[rgba(6,54,116,0.16)] bg-[rgba(6,54,116,0.06)] px-4 py-2 text-sm font-semibold text-[var(--shell-ink)] transition-colors hover:bg-[rgba(6,54,116,0.1)] disabled:opacity-60"
    >
      <span aria-hidden="true">🔔</span> {text}
    </button>
  );
}
