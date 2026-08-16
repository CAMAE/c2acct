"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * WS2-B (manual-review items 8/9): Available | Completed pill toggle for the
 * firm product-assessments grid. Replaces the per-card status pill with a
 * card-level filter. URL-state via ?filter= so back/forward navigation +
 * shareable links work.
 */
export type ProductFilterValue = "available" | "completed";

export default function AvailableCompletedToggle({
  currentFilter,
  availableCount,
  completedCount,
}: {
  currentFilter: ProductFilterValue;
  availableCount: number;
  completedCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setFilter(next: ProductFilterValue) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="pat-mode-toggle" aria-label="Product review filter">
      <button
        type="button"
        className="pat-mode-toggle__option"
        data-active={currentFilter === "available" ? "true" : "false"}
        onClick={() => setFilter("available")}
      >
        Available
        <span className="pat-mode-toggle__status">{availableCount}</span>
      </button>
      <button
        type="button"
        className="pat-mode-toggle__option"
        data-active={currentFilter === "completed" ? "true" : "false"}
        onClick={() => setFilter("completed")}
      >
        Completed
        <span className="pat-mode-toggle__status">{completedCount}</span>
      </button>
    </div>
  );
}
