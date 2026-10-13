"use client";

import { Fragment } from "react";
import { MEMBERSHIP_PLAN } from "@/lib/membership";
import {
  ENTERPRISE_TIER,
  MEMBERSHIP_COPY,
  type MembershipComparisonRow,
  type MembershipComparisonValue,
  type MembershipPageModel,
  type MembershipTierKey,
} from "@/lib/membershipContent";

type MembershipComparisonTableProps = {
  model: MembershipPageModel;
};

// Value cells follow the rendered tiers (PRO, ELITE, and ENTERPRISE on the vendor page).
// FREE is never a column. A row without an Enterprise value reads as not included there.
function valueForPlan(row: MembershipComparisonRow, plan: MembershipTierKey): MembershipComparisonValue {
  if (plan === ENTERPRISE_TIER) return row.enterpriseValue ?? false;
  return plan === MEMBERSHIP_PLAN.ELITE ? row.eliteValue : row.proValue;
}

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
,
      </span>
    );
  }
  return <span className="text-[var(--shell-ink)]">{value}</span>;
}

export default function MembershipComparisonTable({ model }: MembershipComparisonTableProps) {
  // Rows with a category render under a group header; the vendor and firm tables are flat
  // (membership-enterprise box), so a run of uncategorized rows renders with no header row.
  const grouped: Array<{ category: string | null; rows: typeof model.comparisonTable }> = [];
  let currentCategory: string | null | undefined = undefined;
  for (const row of model.comparisonTable) {
    const category = row.category ?? null;
    if (category !== currentCategory) {
      grouped.push({ category, rows: [] });
      currentCategory = category;
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
              {MEMBERSHIP_COPY.comparisonTitle}
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
              <Fragment key={`cat-${group.category ?? "flat"}`}>
                {group.category ? (
                  <tr className="bg-[var(--shell-panel-soft)]">
                    <th
                      scope="colgroup"
                      colSpan={model.tiers.length + 1}
                      className="pat-label py-3 pl-2 text-left text-[var(--shell-ink)]"
                    >
                      {group.category}
                    </th>
                  </tr>
                ) : null}
                {group.rows.map((row) => (
                  <tr
                    key={`${group.category ?? "flat"}-${row.feature}`}
                    className="border-b border-[var(--shell-border)]"
                  >
                    <th
                      scope="row"
                      className="py-3 pr-4 text-left font-normal text-[var(--shell-ink)]"
                    >
                      {row.feature}
                    </th>
                    {model.tiers.map((tier) => (
                      <td key={tier.plan} className="py-3 pr-4 text-center">
                        {renderCell(valueForPlan(row, tier.plan))}
                      </td>
                    ))}
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
