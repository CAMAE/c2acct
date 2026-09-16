"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  nudgeButtonText,
  nudgeStatusFromResponse,
  type NudgeButtonStatus,
} from "@/lib/notifications/nudgeButtonState";

/**
 * "Draft a reminder" button (Phase B2b → 16c). A consultant/admin clicks it to
 * DRAFT a Pat-composed nudge; it POSTs to /api/notifications/nudge, which creates
 * a PENDING draft — it does NOT send. The nudge only reaches the firm after the
 * consultant approves it in the nudge queue (HITL). Self-contained client
 * component; the server resolves authorization.
 *
 * Box 2c (R42): the label follows the route's answer — "Drafted" only when a
 * draft was created, "Already in your queue" when one was already pending — and
 * a successful draft refreshes the router so the queue panel is re-read from the
 * server instead of any cached snapshot.
 */

type NudgeButtonProps = {
  companyId: string;
  audience: "firm" | "vendor";
  label?: string;
};

export default function NudgeButton({ companyId, audience, label = "Draft a reminder" }: NudgeButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState<NudgeButtonStatus>("idle");

  async function draft() {
    if (status === "drafting" || status === "drafted" || status === "queued") return;
    setStatus("drafting");
    try {
      const res = await fetch("/api/notifications/nudge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyId, audience }),
      });
      const body: unknown = await res.json().catch(() => null);
      const next = nudgeStatusFromResponse(res.ok, body);
      setStatus(next);
      if (next === "drafted") router.refresh();
    } catch {
      setStatus("error");
    }
  }

  const text = nudgeButtonText(status, label);

  return (
    <button
      type="button"
      onClick={() => void draft()}
      disabled={status === "drafting" || status === "drafted" || status === "queued"}
      data-testid="nudge-button"
      className="inline-flex items-center gap-2 rounded-full border border-[rgba(6,54,116,0.16)] bg-[rgba(6,54,116,0.06)] px-4 py-2 text-sm font-semibold text-[var(--shell-ink)] transition-colors hover:bg-[rgba(6,54,116,0.1)] disabled:opacity-60"
    >
      <span aria-hidden="true">🔔</span> {text}
    </button>
  );
}
