"use client";

import { Fragment } from "react";
import type { MembershipComparisonValue, MembershipPageModel } from "@/lib/membershipContent";

type MembershipComparisonTableProps = {
  model: MembershipPageModel;
};

function renderCell(value: MembershipComparisonValue) {
  if (value === true) {
    return (
      <span aria-label="Included" className="text-[var(--shell-positive)]">
        ✓
      </span>
    );
  }
  if (value === false) {
    return (
      <span aria-label="Not included" className="text-[var(--shell-muted)]">
        —
      </span>
    );
  }
  return <span className="text-[var(--shell-ink)]">{value}</span>;
}

export default function MembershipComparisonTable({ model }: MembershipComparisonTableProps) {
  const grouped: Array<{ category: string; rows: typeof model.comparisonTable }> = [];
  let currentCategory: string | null = null;
  for (const row of model.comparisonTable) {
    if (row.category !== currentCategory) {
      grouped.push({ category: row.category, rows: [] });
      currentCategory = row.category;
    }
    grouped[grouped.length - 1].rows.push(row);
  }

  return (
    <details className="pat-card p-0" open data-testid="membership-comparison-details">
      <summary className="cursor-pointer list-none px-8 py-6">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <div className="pat-label">Feature comparison</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              Compare what each tier includes
            </h2>
          </div>
          <span aria-hidden="true" className="text-sm text-[var(--shell-muted)]">
            Click to collapse
          </span>
        </div>
      </summary>
      <div className="overflow-x-auto px-8 pb-8">
        <table
          data-testid="membership-comparison-table"
          className="w-full min-w-[640px] border-collapse text-sm"
        >
          <thead>
            <tr className="border-b border-[var(--shell-border)] text-left">
              <th scope="col" className="pat-label py-3 pr-4 font-semibold">
                Feature
              </th>
              {model.tiers.map((tier) => (
                <th
                  key={tier.plan}
                  scope="col"
                  className={`pat-label py-3 pr-4 text-center font-semibold ${
                    tier.isRecommended ? "text-[var(--brand-c2-blue)]" : ""
                  }`}
                >
                  {tier.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map((group) => (
              <Fragment key={`cat-${group.category}`}>
                <tr className="bg-[var(--shell-panel-soft)]">
                  <th
                    scope="colgroup"
                    colSpan={4}
                    className="pat-label py-3 pl-2 text-left text-[var(--shell-ink)]"
                  >
                    {group.category}
                  </th>
                </tr>
                {group.rows.map((row) => (
                  <tr
                    key={`${group.category}-${row.feature}`}
                    className="border-b border-[var(--shell-border)]"
                  >
                    <th
                      scope="row"
                      className="py-3 pr-4 text-left font-normal text-[var(--shell-ink)]"
                    >
                      {row.feature}
                    </th>
                    <td className="py-3 pr-4 text-center">{renderCell(row.freeValue)}</td>
                    <td className="py-3 pr-4 text-center">{renderCell(row.proValue)}</td>
                    <td className="py-3 pr-4 text-center">{renderCell(row.eliteValue)}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
