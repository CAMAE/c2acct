"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApprovalActions({ id, hmac }: { id: string; hmac: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function decide(decision: "approve" | "deny" | "edit") {
    if (busy) return;
    let editedArgs: Record<string, string> | undefined;
    if (decision === "edit") {
      const subject = window.prompt("New subject (applied to the proposed args):");
      if (subject === null) return;
      editedArgs = { subject };
    }
    setBusy(true);
    setStatus("Recording…");
    try {
      const res = await fetch(`/api/agents/approvals/${id}/decide`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, hmac, editedArgs }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setStatus(decision === "deny" ? "Denied." : decision === "edit" ? "Edited & approved." : "Approved.");
        setTimeout(() => router.refresh(), 800);
      } else {
        setStatus(`Failed: ${data.error ?? res.status}`);
        setBusy(false);
      }
    } catch (error) {
      setStatus(`Failed: ${error instanceof Error ? error.message : String(error)}`);
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button type="button" className="pat-button-primary" onClick={() => decide("approve")} disabled={busy}>
        ✅ Approve
      </button>
      <button type="button" className="pat-button-secondary" onClick={() => decide("deny")} disabled={busy}>
        ❌ Deny
      </button>
      <button type="button" className="pat-button-secondary" onClick={() => decide("edit")} disabled={busy}>
        ✏ Edit
      </button>
      {status ? <span className="text-sm text-[var(--shell-muted)]">{status}</span> : null}
    </div>
  );
}
