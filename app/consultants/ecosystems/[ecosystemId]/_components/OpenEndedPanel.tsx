"use client";

import { useState } from "react";
import type { EcosystemDetailData } from "@/lib/ecosystem";

export default function OpenEndedPanel({ data }: { data: EcosystemDetailData }) {
  const [showAll, setShowAll] = useState(false);
  const total = data.openEndedTotalCount;
  const hasResponses = data.openEndedResponses.length > 0;
  const responses = showAll ? data.openEndedResponses : data.openEndedResponses.slice(0, 10);

  return (
    <section
      className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-5"
      data-testid="ecosystem-detail-openended"
    >
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Recent firm responses
        </h2>
        <div className="text-sm text-[var(--shell-muted)]">
          {responses.length} of {total} total
        </div>
      </div>

      {!hasResponses ? (
        <p className="text-sm text-[var(--shell-muted)]">No open-ended responses yet.</p>
      ) : (
        <div className="space-y-4">
          {responses.map((response) => (
            <blockquote
              key={response.responseId}
              data-testid="openended-response"
              className="border-l-4 border-[var(--brand-c2-blue)] py-2 pl-4"
            >
              <p className="text-sm leading-6 text-[var(--shell-ink)]">&ldquo;{response.response}&rdquo;</p>
              <footer className="mt-1 text-xs text-[var(--shell-muted)]">
                {response.firmCompanyName} · {response.productName} · {response.questionLabel}
              </footer>
            </blockquote>
          ))}
          {total > data.openEndedResponses.length && !showAll ? (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="text-sm font-semibold text-[var(--brand-c2-blue)] hover:underline"
            >
              Show all ({total})
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
