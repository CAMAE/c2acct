"use client";

import { useEffect, useState } from "react";

export default function EnsureCompanySelected() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const r = await fetch("/api/company/default", { cache: "no-store" });
        const j: any = await r.json().catch(() => ({}));

        // If already selected (server read httpOnly cookie) or no companies exist, do nothing
        if (j?.alreadySelected === true || !j?.companyId) {
          if (!cancelled) setDone(true);
          return;
        }

        const companyId = String(j.companyId).trim();
        if (!companyId) {
          if (!cancelled) setDone(true);
          return;
        }

        await fetch(`/api/company/select?companyId=${encodeURIComponent(companyId)}`, {
          method: "POST",
        });

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
