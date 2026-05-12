"use client";

import { useEffect } from "react";
import { captureException } from "@/lib/sentry";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void captureException(error, {
      source: "app/global-error",
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <html>
      <body className="pat-shell bg-[var(--shell-bg)] px-6 py-12 text-[var(--shell-ink)]">
        <div className="pat-card mx-auto max-w-3xl p-8">
          <div className="pat-label">Global runtime issue</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
            PAT could not finish rendering this route
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--shell-muted)]">
            The failure was captured for operator review when telemetry is configured. Retry the route after the app recovers.
          </p>
          <button className="pat-button-primary mt-6" onClick={() => reset()} type="button">
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
