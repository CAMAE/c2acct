"use client";

import { useMemo, useState } from "react";
import HeatmapGrid from "@/app/components/charts/HeatmapGrid";
import { EliteEmptyState } from "@/app/components/insights/elite/EliteCardShell";
import { buildGapMapDrilldownInsight, type GapMapCell, type VendorGapMap } from "@/lib/eliteInsightsV2";

/**
 * V3 · Alignment Gap Map. The heatmap is the overview; below it an INLINE
 * drill-down (11d law — no modals) lets a vendor checkbox-select up to 3
 * products × up to 3 dimensions and get a combined breakdown: per-pair bars
 * (firm read vs self-report), one takeaway, one action. Deep links to the
 * surface are preserved — this is all in-page state.
 */

const MAX_PRODUCTS = 3;
const MAX_DIMENSIONS = 3;

function ScoreBar({ label, value, tone }: { label: string; value: number | null; tone: "firm" | "vendor" }) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value));
  const barColor = tone === "firm" ? "bg-[var(--brand-blue,#063674)]" : "bg-[rgba(6,54,116,0.35)]";
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[0.7rem] text-[var(--shell-muted)]">{label}</span>
      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-[rgba(6,54,116,0.08)]">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-[var(--shell-ink)]">
        {value === null ? "—" : Math.round(value)}
      </span>
    </div>
  );
}

export default function VendorGapMapCard({ data }: { data: VendorGapMap }) {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedDims, setSelectedDims] = useState<string[]>([]);

  const cellLookup = useMemo(() => {
    const map = new Map<string, Map<string, GapMapCell>>();
    for (const row of data.rows) {
      map.set(row.key, new Map(row.cells.map((cell) => [cell.key, cell])));
    }
    return map;
  }, [data.rows]);

  const productLabel = useMemo(
    () => new Map(data.rows.map((row) => [row.key, row.label])),
    [data.rows]
  );
  const dimLabel = useMemo(
    () => new Map(data.columns.map((col) => [col.key, col.label])),
    [data.columns]
  );

  const insight = useMemo(() => {
    const pairs = [];
    for (const row of data.rows) {
      if (!selectedProducts.includes(row.key)) continue;
      for (const col of data.columns) {
        if (!selectedDims.includes(col.key)) continue;
        const cell = cellLookup.get(row.key)?.get(col.key);
        pairs.push({
          productLabel: productLabel.get(row.key) ?? row.label,
          dimLabel: dimLabel.get(col.key) ?? col.label,
          firm: cell?.firmScore ?? null,
          vendor: cell?.vendorScore ?? null,
        });
      }
    }
    return buildGapMapDrilldownInsight(pairs);
  }, [data.rows, data.columns, selectedProducts, selectedDims, cellLookup, productLabel, dimLabel]);

  if (!data.available) {
    return <EliteEmptyState message={data.emptyReason ?? "Gap map not available yet."} />;
  }

  const toggle = (list: string[], setter: (v: string[]) => void, key: string, cap: number) => {
    if (list.includes(key)) {
      setter(list.filter((k) => k !== key));
    } else if (list.length < cap) {
      setter([...list, key]);
    }
  };

  const hasSelection = selectedProducts.length > 0 && selectedDims.length > 0;

  return (
    <section className="pat-card p-6">
      <div className="pat-label">Where firms confirm — or dispute — your story</div>
      <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
        Per product-fit dimension: the number is how firm reviews land relative to your self-report. Green means firms
        confirm your story; orange means firms read you lower than you rate yourself — that is where the story needs work.
        Only dimensions with enough firm reviews are scored.
      </p>
      <div className="mt-4">
        <HeatmapGrid columns={data.columns} rows={data.rows} title="Per-dimension alignment gap map" />
      </div>

      {/* Inline drill-down (no modal). */}
      <div className="mt-6 rounded-[14px] border border-[var(--shell-border)] bg-white/60 p-4">
        <div className="pat-label">Drill down · compare up to {MAX_PRODUCTS} products × {MAX_DIMENSIONS} dimensions</div>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <fieldset>
            <legend className="text-xs font-medium text-[var(--shell-muted)]">
              Products ({selectedProducts.length}/{MAX_PRODUCTS})
            </legend>
            <div className="mt-2 flex flex-col gap-1.5">
              {data.rows.map((row) => {
                const checked = selectedProducts.includes(row.key);
                const disabled = !checked && selectedProducts.length >= MAX_PRODUCTS;
                return (
                  <label
                    key={row.key}
                    className={`flex items-center gap-2 text-sm ${disabled ? "text-[var(--shell-muted)]" : "text-[var(--shell-ink)]"}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(selectedProducts, setSelectedProducts, row.key, MAX_PRODUCTS)}
                    />
                    <span className="truncate">{row.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-xs font-medium text-[var(--shell-muted)]">
              Dimensions ({selectedDims.length}/{MAX_DIMENSIONS})
            </legend>
            <div className="mt-2 flex flex-col gap-1.5">
              {data.columns.map((col) => {
                const checked = selectedDims.includes(col.key);
                const disabled = !checked && selectedDims.length >= MAX_DIMENSIONS;
                return (
                  <label
                    key={col.key}
                    className={`flex items-center gap-2 text-sm ${disabled ? "text-[var(--shell-muted)]" : "text-[var(--shell-ink)]"}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(selectedDims, setSelectedDims, col.key, MAX_DIMENSIONS)}
                    />
                    <span className="truncate">{col.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>

        {hasSelection ? (
          <div className="mt-4 border-t border-[var(--shell-border)] pt-4">
            <div className="space-y-4">
              {selectedProducts.map((productId) => (
                <div key={productId}>
                  <div className="text-sm font-semibold text-[var(--shell-ink)]">{productLabel.get(productId)}</div>
                  <div className="mt-2 space-y-3">
                    {selectedDims.map((dimKey) => {
                      const cell = cellLookup.get(productId)?.get(dimKey);
                      const firm = cell?.firmScore ?? null;
                      const vendor = cell?.vendorScore ?? null;
                      const delta = firm !== null && vendor !== null ? Math.round(vendor - firm) : null;
                      return (
                        <div key={dimKey} className="rounded-[10px] border border-[var(--shell-border)] bg-white/70 px-3 py-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-[var(--shell-ink)]">{dimLabel.get(dimKey)}</span>
                            {delta === null ? (
                              <span className="text-[0.7rem] text-[var(--shell-muted)]">not enough firm reviews</span>
                            ) : (
                              <span
                                className={`text-xs font-semibold tabular-nums ${delta > 0 ? "text-[var(--brand-orange)]" : "text-[var(--shell-positive)]"}`}
                              >
                                {delta > 0 ? `firms −${delta}` : delta < 0 ? `firms +${-delta}` : "match"}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 space-y-1.5">
                            <ScoreBar label="firms" value={firm} tone="firm" />
                            <ScoreBar label="your rate" value={vendor} tone="vendor" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {insight ? (
              <div className="mt-4 rounded-[12px] border border-[var(--shell-border)] bg-white/80 px-4 py-3">
                <p className="text-sm leading-6 text-[var(--shell-ink)]">{insight.takeaway}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--shell-muted)]">
                  <span className="font-medium text-[var(--shell-ink)]">Next:</span> {insight.action}
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--shell-muted)]">
            Select at least one product and one dimension to see the firm-vs-self-report breakdown.
          </p>
        )}
      </div>
    </section>
  );
}
