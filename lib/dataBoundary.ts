import { DataBoundary, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

/**
 * Data-integrity boundary wall (2026-07-09 audit, CLASS 1 — launch-blocking).
 *
 * Demo/synthetic companies (`dataBoundary = DEMO`) must never contaminate a
 * customer-facing aggregate. This module is the ONE place that decides which
 * boundaries a pool may include; every cross-entity aggregate routes through it.
 *
 * Visibility rule:
 *  - A PRODUCTION or PILOT viewer pools over {PRODUCTION, PILOT} — real customers
 *    and the pilot cohort together (customer-facing benchmark).
 *  - A DEMO viewer pools over {DEMO} only — so the demo environment still works
 *    (demo accounts see demo data) without ever leaking demo into real pools.
 *  - Operator/admin platform views use the customer-facing pool by default
 *    (real number); a demo/all cut must be explicit and labelled.
 *
 * "REAL" in the audit == `DataBoundary.PRODUCTION` here.
 */

/** Customer-facing pool: real customers + the pilot cohort. Demo is never here. */
export const CUSTOMER_FACING_BOUNDARIES: readonly DataBoundary[] = [
  DataBoundary.PRODUCTION,
  DataBoundary.PILOT,
];

/** The boundaries a viewer of `viewer` may pool over. Demo is walled to demo. */
export function poolForViewerBoundary(viewer: DataBoundary): DataBoundary[] {
  return viewer === DataBoundary.DEMO ? [DataBoundary.DEMO] : [...CUSTOMER_FACING_BOUNDARIES];
}

/**
 * Resolve a company's boundary. Unknown/missing → PRODUCTION (fail closed toward
 * "real": a real viewer never accidentally gains the demo pool).
 */
export async function resolveCompanyBoundary(companyId: string | null | undefined): Promise<DataBoundary> {
  if (!companyId) return DataBoundary.PRODUCTION;
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { dataBoundary: true },
  });
  return company?.dataBoundary ?? DataBoundary.PRODUCTION;
}

/** `Company.where` fragment scoping an aggregate to a viewer's pool. */
export function companyBoundaryWhere(viewer: DataBoundary): Prisma.CompanyWhereInput {
  return { dataBoundary: { in: poolForViewerBoundary(viewer) } };
}

/**
 * Relation filter for SurveySubmission aggregates: restrict to submissions whose
 * SUBMITTING company is in the viewer's pool. Compose into an existing
 * `Company: {...}` filter (Prisma merges the object).
 */
export function submissionCompanyBoundaryFilter(viewer: DataBoundary): Prisma.CompanyRelationFilter["is"] {
  return { dataBoundary: { in: poolForViewerBoundary(viewer) } };
}

/**
 * Empty-pool honesty copy (AAE discipline). When a real pool is empty after
 * excluding demo, surfaces say this instead of silently falling back to demo.
 */
export const INSUFFICIENT_REAL_DATA_COPY =
  "Insufficient real-firm data — benchmarks appear as firms complete assessments.";
