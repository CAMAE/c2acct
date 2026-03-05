"use client";

import { useEffect, useState } from "react";

export default function EnsureCompanySelected() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
        try {
          // client short-circuit: if cookie exists, do nothing
          if (typeof document !== "undefined" && document.cookie.includes("aae_companyId=")) {
            if (!cancelled) setDone(true);
            return;
          }
      try {
        // ask server for default company id (dev fallback already exists in resolveCompanyId,
        // but we need an ID to set the cookie for browser navigation)
        const r = await fetch("/api/company/default", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        const companyId = String(j?.companyId ?? "").trim();
        if (!companyId) {
          if (!cancelled) setDone(true);
          return;
        }

        // set cookie (query param, most reliable)
        await fetch(`/api/company/select?companyId=${encodeURIComponent(companyId)}`, { method: "POST" });

        // refresh so server components re-render with cookie context
        if (!cancelled) window.location.reload();
      } catch {
        if (!cancelled) setDone(true);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (done) return null;

  return (
    <div className="fixed bottom-4 right-4 rounded-xl border border-white/10 bg-black/70 px-4 py-2 text-sm text-white/80">
      Selecting company…
    </div>
  );
}

