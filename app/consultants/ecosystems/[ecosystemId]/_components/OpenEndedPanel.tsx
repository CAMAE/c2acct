"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { EcosystemDetailData } from "@/lib/ecosystem";

const DEFAULT_VISIBLE_COUNT = 10;
const ALL_PRODUCTS_VALUE = "all";

/**
 * WS2-D (manual-review item 15): per-product filter + lifted slice cap.
 * The lib layer now returns all responses; this panel filters client-side
 * by selected product name. URL-state via ?product= for shareable links.
 */
export default function OpenEndedPanel({ data }: { data: EcosystemDetailData }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showAll, setShowAll] = useState(false);

  const productOptions = useMemo(() => {
    const names = new Set<string>();
    for (const response of data.openEndedResponses) {
      names.add(response.productName);
    }
    return Array.from(names).sort();
  }, [data.openEndedResponses]);

  const requestedProduct = searchParams.get("product") ?? ALL_PRODUCTS_VALUE;
  const selectedProduct = productOptions.includes(requestedProduct)
    ? requestedProduct
    : ALL_PRODUCTS_VALUE;

  const filteredResponses = useMemo(() => {
    if (selectedProduct === ALL_PRODUCTS_VALUE) return data.openEndedResponses;
    return data.openEndedResponses.filter(
      (response) => response.productName === selectedProduct
    );
  }, [data.openEndedResponses, selectedProduct]);

  const visibleResponses = showAll
    ? filteredResponses
    : filteredResponses.slice(0, DEFAULT_VISIBLE_COUNT);
  const hasResponses = filteredResponses.length > 0;

  function selectProduct(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === ALL_PRODUCTS_VALUE) {
      params.delete("product");
    } else {
      params.set("product", next);
    }
    setShowAll(false);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <section
      className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-5"
      data-testid="ecosystem-detail-openended"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Recent firm responses
        </h2>
        <div className="text-sm text-[var(--shell-muted)]">
          {visibleResponses.length} of {filteredResponses.length} shown
          {selectedProduct !== ALL_PRODUCTS_VALUE ? (
            <span className="ml-2 text-xs text-[var(--shell-muted)]">
              · filtered from {data.openEndedTotalCount} total
            </span>
          ) : null}
        </div>
      </div>

      {productOptions.length > 1 ? (
        <div className="mb-4">
          <div className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">
            Filter by product
          </div>
          <div
            className="pat-mode-toggle mt-2"
            data-testid="openended-product-filter"
            role="group"
            aria-label="Filter open-ended responses by product"
          >
            {[
              { key: ALL_PRODUCTS_VALUE, label: "All products" },
              ...productOptions.map((name) => ({ key: name, label: name })),
            ].map((opt) => {
              const isActive = opt.key === selectedProduct;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => selectProduct(opt.key)}
                  data-active={isActive ? "true" : "false"}
                  data-key={opt.key}
                  aria-pressed={isActive}
                  className="pat-mode-toggle__option"
                >
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {!hasResponses ? (
        <p className="text-sm text-[var(--shell-muted)]">
          {selectedProduct === ALL_PRODUCTS_VALUE
            ? "No open-ended responses yet."
            : `No responses on file for ${selectedProduct} yet.`}
        </p>
      ) : (
        <div className="space-y-4">
          {visibleResponses.map((response) => (
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
          {filteredResponses.length > visibleResponses.length && !showAll ? (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="text-sm font-semibold text-[var(--brand-c2-blue)] hover:underline"
            >
              Show all ({filteredResponses.length})
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
