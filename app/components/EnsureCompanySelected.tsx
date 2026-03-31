"use client";

import { useEffect, useState } from "react";

type StatusState = {
  message: string;
  tone: "info" | "warning";
} | null;

export default function EnsureCompanySelected() {
  const [done, setDone] = useState(false);
  const [status, setStatus] = useState<StatusState>({
    message: "Preparing PAT context…",
    tone: "info",
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const response = await fetch("/api/company/default", { cache: "no-store" });

        if (response.status === 401) {
          if (!cancelled) {
            const callbackUrl =
              typeof window !== "undefined"
                ? `${window.location.pathname}${window.location.search}`
                : "/";
            window.location.assign(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
          }
          return;
        }

        if (response.status === 403) {
          if (!cancelled) {
            setStatus({
              message: "Signed in, but PAT does not have a company assignment for this account yet.",
              tone: "warning",
            });
            setDone(true);
          }
          return;
        }

        const payload = (await response.json().catch(() => ({}))) as {
          alreadySelected?: boolean;
          companyId?: string | null;
        };

        if (payload.alreadySelected === true || !payload.companyId) {
          if (!cancelled) {
            setDone(true);
            setStatus(null);
          }
          return;
        }

        const companyId = String(payload.companyId).trim();
        if (!companyId) {
          if (!cancelled) {
            setDone(true);
            setStatus(null);
          }
          return;
        }

        const selectResponse = await fetch(`/api/company/select?companyId=${encodeURIComponent(companyId)}`, {
          method: "POST",
        });

        if (selectResponse.status === 401) {
          if (!cancelled) {
            const callbackUrl =
              typeof window !== "undefined"
                ? `${window.location.pathname}${window.location.search}`
                : "/";
            window.location.assign(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
          }
          return;
        }

        if (selectResponse.status === 403) {
          if (!cancelled) {
            setStatus({
              message: "PAT could not activate company context for this account.",
              tone: "warning",
            });
            setDone(true);
          }
          return;
        }

        if (!cancelled) {
          setStatus({
            message: "PAT context ready. Refreshing workflow…",
            tone: "info",
          });
          window.location.reload();
        }
      } catch {
        if (!cancelled) {
          setStatus({
            message: "PAT could not confirm company context right now.",
            tone: "warning",
          });
          setDone(true);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  if (done && !status) {
    return null;
  }

  if (!status) {
    return null;
  }

  const toneClasses =
    status.tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-[var(--shell-border)] bg-[var(--shell-panel)] text-[var(--shell-ink)]";

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 max-w-sm">
      <div className={`rounded-[18px] border px-4 py-3 shadow-[0_20px_50px_rgba(15,23,42,0.08)] ${toneClasses}`}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
          PAT Context
        </div>
        <div className="mt-1 text-sm leading-6">{status.message}</div>
      </div>
    </div>
  );
}
