"use client";

import { useEffect } from "react";
import { captureException } from "@/lib/sentry";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void captureException(error, {
      source: "app/error",
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <div className="pat-card mx-auto my-12 max-w-3xl p-8">
      <div className="pat-label">Runtime issue</div>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
        PAT hit an unexpected error
      </h2>
      <p className="mt-4 text-base leading-7 text-[var(--shell-muted)]">
        The error was captured for operator review when telemetry is configured. Reload or retry the current action.
      </p>
      <button className="pat-button-primary mt-6" onClick={() => reset()} type="button">
        Retry
      </button>
    </div>
  );
}
