"use client";

import { useEffect, useState } from "react";

type DefaultCompanyResponse = {
  ok?: boolean;
  alreadySelected?: boolean;
  companyId?: string | null;
};

export default function EnsureCompanySelected() {
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const r = await fetch("/api/company/default", { cache: "no-store" });

        if (r.status === 401) {
          if (!cancelled) {
            const callbackUrl =
              typeof window !== "undefined"
                ? `${window.location.pathname}${window.location.search}`
                : "/";
            window.location.assign(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
          }
          return;
        }

        if (r.status === 403) {
          if (!cancelled) {
            setMessage("Signed in, but no company is assigned to your account yet.");
            setDone(true);
          }
          return;
        }

        const j: DefaultCompanyResponse = await r.json().catch(
          (): DefaultCompanyResponse => ({})
        );

        if (j.alreadySelected === true || !j.companyId) {
          if (!cancelled) setDone(true);
          return;
        }

        const companyId = String(j.companyId).trim();
        if (!companyId) {
          if (!cancelled) setDone(true);
          return;
        }

        const selectRes = await fetch(
          `/api/company/select?companyId=${encodeURIComponent(companyId)}`,
          { method: "POST" }
        );

        if (selectRes.status === 401) {
          if (!cancelled) {
            const callbackUrl =
              typeof window !== "undefined"
                ? `${window.location.pathname}${window.location.search}`
                : "/";
            window.location.assign(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
          }
          return;
        }

        if (selectRes.status === 403) {
          if (!cancelled) {
            setMessage("Company selection is restricted for this account.");
            setDone(true);
          }
          return;
        }

        if (!cancelled) window.location.reload();
      } catch {
        if (!cancelled) {
          setMessage("Unable to auto-select company right now.");
          setDone(true);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  if (done) {
    if (!message) return null;

    return (
      <div className="fixed bottom-4 right-4 rounded-xl border border-white/10 bg-black/70 px-4 py-2 text-sm text-white/80">
        {message}
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 rounded-xl border border-white/10 bg-black/70 px-4 py-2 text-sm text-white/80">
      Selecting company...
    </div>
  );
}
