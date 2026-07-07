"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Pat opt-in consent panel (Elite Sprint Block A). Copy is verbatim from the
 * July-7 proposal §1 — do not edit without bumping PAT_CONSENT_VERSION. The
 * toggle governs ONLY the Pat AI assistant; platform data, scores, and
 * aggregated benchmarks are covered by the Terms of Service / Privacy Policy.
 */
export default function PatConsentPanel({ initialOptedIn }: { initialOptedIn: boolean }) {
  const [optedIn, setOptedIn] = useState(initialOptedIn);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean) {
    const previous = optedIn;
    setSaving(true);
    setError(null);
    setOptedIn(next);
    try {
      const res = await fetch("/api/pat/consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ optedIn: next }),
      });
      if (!res.ok) {
        throw new Error(String(res.status));
      }
      const data = (await res.json()) as { optedIn?: boolean };
      setOptedIn(Boolean(data.optedIn));
    } catch {
      setOptedIn(previous);
      setError("We couldn't save that just now. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="pat-card px-7 py-7 sm:px-8">
      <div className="pat-label">Meet Pat — optional AI assistant</div>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
        Pat is Patalign&rsquo;s AI guide. Turn Pat on and you can ask questions about using the
        platform — and, on Elite, about your own scores and alignment data — in plain language, any
        time.
      </p>
      <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
        Pat is optional and off by default. It doesn&rsquo;t change your platform experience, your
        scores, or how Patalign&rsquo;s aggregated, anonymized benchmarks work, as described in the{" "}
        <Link className="pat-link" href="/terms">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link className="pat-link" href="/privacy">
          Privacy Policy
        </Link>
        .
      </p>
      <label className="mt-5 flex max-w-3xl items-start gap-3 text-base leading-7 text-[var(--shell-ink)]">
        <input
          type="checkbox"
          className="mt-1.5 h-4 w-4 shrink-0"
          checked={optedIn}
          disabled={saving}
          onChange={(event) => toggle(event.target.checked)}
        />
        <span>Turn on Pat. I understand Pat is an AI assistant, not a person.</span>
      </label>
      {error ? <p className="mt-3 text-sm leading-6 text-red-600">{error}</p> : null}
    </section>
  );
}
