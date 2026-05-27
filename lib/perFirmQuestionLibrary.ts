/**
 * WS5 Blocks B-E (manual-review item 30) — per-firm score-delta question library.
 *
 * McKinsey-style evaluation probes keyed by (firm score band) × (delta direction)
 * × (delta magnitude). Used by Section 4 (Per-Firm Strengths / Cautions) to
 * surface 3-5 grounded questions per firm card, replacing the previous
 * hardcoded `QuestionsBlock` (high-band 2 + hot-divergence 2 + disqualifier
 * fillers) with library-driven selection that varies by score signal.
 *
 * Thresholds come from lib/briefs.ts to keep band logic single-sourced:
 *   - high band: firm score >= HEATMAP_BAND_HIGH_THRESHOLD (75)
 *   - mid band:  firm score >= HEATMAP_BAND_MID_THRESHOLD (50)
 *   - low band:  firm score < 50
 *   - magnitude large:  |delta| >= 15
 *   - magnitude medium: |delta| >= HOT_DIVERGENCE_THRESHOLD (10)
 *   - magnitude small:  |delta| < 10 (conversation-grade, below hot threshold)
 *
 * Authoring rules:
 *   1. Each question <= ~250 chars (scannable).
 *   2. Each interpolates >= 2 of {vendorName, productName, firmName,
 *      capabilityArea, vendorScore, firmScore, delta}.
 *   3. Probe framing — "what evidence", "what would change your view",
 *      "how would you sequence", "what's the dependency".
 *   4. No two near-identical phrasings.
 */

import { HOT_DIVERGENCE_THRESHOLD } from "@/lib/ecosystem";
import {
  HEATMAP_BAND_HIGH_THRESHOLD,
  HEATMAP_BAND_MID_THRESHOLD,
} from "@/lib/briefs";

export type ScoreBand = "high" | "mid" | "low";
export type DeltaDirection = "vendor-higher" | "firm-higher" | "neutral";
export type DeltaMagnitude = "small" | "medium" | "large";

export interface QuestionContext {
  vendorName: string;
  firmName: string;
  productName: string;
  capabilityArea: string;
  firmScore: number;
  vendorScore: number | null;
  delta: number | null;
}

export interface QuestionTemplate {
  id: string;
  bandRequired?: ScoreBand;
  directionRequired?: DeltaDirection;
  magnitudeRequired?: DeltaMagnitude;
  emphasis?: "high" | "normal";
  question: (ctx: QuestionContext) => string;
}

export interface QuestionScopeCell {
  productId: string;
  productName: string;
  capabilityArea: string;
  firmScore: number;
  vendorScore: number | null;
  delta: number | null;
}

export interface QuestionCandidate {
  template: QuestionTemplate;
  cell: QuestionScopeCell;
  rendered: string;
}

export function bandForFirmScore(score: number): ScoreBand {
  if (score >= HEATMAP_BAND_HIGH_THRESHOLD) return "high";
  if (score >= HEATMAP_BAND_MID_THRESHOLD) return "mid";
  return "low";
}

export function directionForDelta(delta: number | null): DeltaDirection {
  if (delta === null) return "neutral";
  if (delta > 5) return "vendor-higher";
  if (delta < -5) return "firm-higher";
  return "neutral";
}

export function magnitudeForDelta(delta: number | null): DeltaMagnitude {
  if (delta === null) return "small";
  const abs = Math.abs(delta);
  if (abs >= 15) return "large";
  if (abs >= HOT_DIVERGENCE_THRESHOLD) return "medium";
  return "small";
}

function fmtDelta(delta: number | null): string {
  if (delta === null) return "the observed gap";
  const sign = delta > 0 ? "+" : "−";
  return `${sign}${Math.abs(delta)} point${Math.abs(delta) === 1 ? "" : "s"}`;
}

export const LIBRARY: readonly QuestionTemplate[] = [
  // ---------------- Always-applicable fallbacks (5) ----------------
  {
    id: "q-fb-evidence-base",
    question: (c) =>
      `What evidence does ${c.firmName} have that ${c.vendorName}'s ${c.productName} performance holds outside their own implementation — peer references, ecosystem benchmarks, or independent audit data?`,
  },
  {
    id: "q-fb-renewal-test",
    question: (c) =>
      `If ${c.firmName} were renewing ${c.vendorName} today on ${c.productName} alone — no other product in the catalog factored in — would the case still close at the same price?`,
  },
  {
    id: "q-fb-stack-fit",
    question: (c) =>
      `How does ${c.vendorName}'s ${c.productName} sequence against ${c.firmName}'s existing stack — is it a wedge product, a replacement, or a parallel deployment?`,
  },
  {
    id: "q-fb-implementation-friction",
    question: (c) =>
      `Where did ${c.firmName} hit the most friction during ${c.productName} rollout — onboarding, data migration, change management, or post-go-live optimization?`,
  },
  {
    id: "q-fb-success-metric",
    question: (c) =>
      `What's the single metric ${c.firmName} would point to today as proof that ${c.productName} earned its budget — and how is ${c.vendorName} positioned to keep it trending?`,
  },

  // ---------------- High band (firm score >= 75) ----------------
  {
    id: "q-high-neutral-confirm-stickiness",
    bandRequired: "high",
    directionRequired: "neutral",
    magnitudeRequired: "small",
    question: (c) =>
      `${c.firmName} rates ${c.productName} at ${c.firmScore} on ${c.capabilityArea} and ${c.vendorName}'s self-report tracks — what's the operational evidence this performance holds at the next 25% of volume?`,
  },
  {
    id: "q-high-neutral-evidence-base",
    bandRequired: "high",
    directionRequired: "neutral",
    magnitudeRequired: "small",
    question: (c) =>
      `High-band fit at ${c.firmScore} for ${c.firmName} on ${c.productName} — is this baseline stable or trend-positive? What would degrade ${c.vendorName}'s position by the next quarterly review?`,
  },
  {
    id: "q-high-neutral-scale-test",
    bandRequired: "high",
    directionRequired: "neutral",
    magnitudeRequired: "small",
    question: (c) =>
      `${c.vendorName} sits at the high band on ${c.productName} for ${c.firmName} — what's the scenario where that breaks? Capacity ceiling, partner-vendor dependency, or org-structure shift inside ${c.firmName}?`,
  },
  {
    id: "q-high-vendor-higher-small-why-no-better",
    bandRequired: "high",
    directionRequired: "vendor-higher",
    magnitudeRequired: "small",
    question: (c) =>
      `${c.firmName} reviews ${c.productName} at ${c.firmScore}; ${c.vendorName} reads it slightly higher. What detail does ${c.vendorName} see that hasn't yet shown up in ${c.firmName}'s day-to-day use?`,
  },
  {
    id: "q-high-vendor-higher-small-headroom",
    bandRequired: "high",
    directionRequired: "vendor-higher",
    magnitudeRequired: "small",
    question: (c) =>
      `Vendor-higher gap on ${c.productName} at the high band — is ${c.vendorName} claiming headroom ${c.firmName} hasn't exercised, or is there a capability gap in the seat-level rollout?`,
  },
  {
    id: "q-high-vendor-higher-medium-probe",
    bandRequired: "high",
    directionRequired: "vendor-higher",
    magnitudeRequired: "medium",
    question: (c) =>
      `${c.vendorName} self-reports ${c.vendorScore ?? "—"} on ${c.productName}; ${c.firmName} reviews ${c.firmScore} (${fmtDelta(c.delta)}). High-band but divergent — roadmap claim versus current operational reality?`,
  },
  {
    id: "q-high-vendor-higher-medium-validation",
    bandRequired: "high",
    directionRequired: "vendor-higher",
    magnitudeRequired: "medium",
    question: (c) =>
      `Medium-magnitude vendor-higher gap on ${c.productName} — what single ${c.firmName} workflow would close the gap if ${c.vendorName}'s self-assessment is grounded? What's the validation timeline?`,
  },
  {
    id: "q-high-vendor-higher-large-hot",
    bandRequired: "high",
    directionRequired: "vendor-higher",
    magnitudeRequired: "large",
    emphasis: "high",
    question: (c) =>
      `Hot divergence on ${c.productName} at the high band: ${c.vendorName}=${c.vendorScore ?? "—"}, ${c.firmName}=${c.firmScore}. What capability or feature is ${c.vendorName} pricing into the self-score that ${c.firmName} hasn't activated?`,
  },
  {
    id: "q-high-vendor-higher-large-mismatch",
    bandRequired: "high",
    directionRequired: "vendor-higher",
    magnitudeRequired: "large",
    emphasis: "high",
    question: (c) =>
      `Large vendor-higher delta (${fmtDelta(c.delta)}) on ${c.productName} despite high-band firm review — does ${c.vendorName} measure success on different KPIs than ${c.firmName} tracks day-to-day?`,
  },
  {
    id: "q-high-firm-higher-small-understatement",
    bandRequired: "high",
    directionRequired: "firm-higher",
    magnitudeRequired: "small",
    question: (c) =>
      `${c.firmName} rates ${c.productName} higher than ${c.vendorName}'s own self-assessment. Is this a coaching opportunity — ${c.vendorName} could lean harder on ${c.firmName}'s use case as a reference?`,
  },
  {
    id: "q-high-firm-higher-small-why-leading",
    bandRequired: "high",
    directionRequired: "firm-higher",
    magnitudeRequired: "small",
    question: (c) =>
      `${c.firmName}'s ${c.firmScore} on ${c.productName} exceeds ${c.vendorName}'s self-read — what local implementation choice is producing the outperformance? Could ${c.vendorName} replicate it as a productized service?`,
  },
  {
    id: "q-high-firm-higher-medium-extending-roadmap",
    bandRequired: "high",
    directionRequired: "firm-higher",
    magnitudeRequired: "medium",
    question: (c) =>
      `${c.firmName} is operating ${c.productName} ${fmtDelta(c.delta)} above ${c.vendorName}'s baseline — is ${c.firmName} extending the roadmap with custom work, and does that custom work belong on ${c.vendorName}'s product backlog?`,
  },
  {
    id: "q-high-firm-higher-medium-blind-spot",
    bandRequired: "high",
    directionRequired: "firm-higher",
    magnitudeRequired: "medium",
    question: (c) =>
      `Firm-higher gap on ${c.productName} suggests ${c.vendorName} is underweighting a real capability — what would change ${c.vendorName}'s view if they shadowed ${c.firmName}'s power-user team for a week?`,
  },
  {
    id: "q-high-firm-higher-large",
    bandRequired: "high",
    directionRequired: "firm-higher",
    magnitudeRequired: "large",
    emphasis: "high",
    question: (c) =>
      `${c.firmName}=${c.firmScore} vs ${c.vendorName}=${c.vendorScore ?? "—"} on ${c.productName} (${fmtDelta(c.delta)} firm-higher). What is ${c.firmName} doing that ${c.vendorName} isn't yet selling? Whose roadmap does this belong on?`,
  },

  // ---------------- Mid band (50 <= firm score < 75) ----------------
  {
    id: "q-mid-neutral-adoption-stage",
    bandRequired: "mid",
    directionRequired: "neutral",
    magnitudeRequired: "small",
    question: (c) =>
      `${c.firmName}=${c.firmScore} on ${c.productName} with ${c.vendorName} self-aligned — is this mid-band steady-state, or is ${c.firmName} mid-rollout with high-band potential still ahead?`,
  },
  {
    id: "q-mid-neutral-sequencing",
    bandRequired: "mid",
    directionRequired: "neutral",
    magnitudeRequired: "small",
    question: (c) =>
      `Mid-band fit on ${c.productName} for ${c.firmName} — what's the dependency that would unlock the next 10 points? Is it on ${c.vendorName}'s side, ${c.firmName}'s side, or a third-party integration?`,
  },
  {
    id: "q-mid-neutral-borderline",
    bandRequired: "mid",
    directionRequired: "neutral",
    magnitudeRequired: "medium",
    question: (c) =>
      `${c.firmName} sits at ${c.firmScore} on ${c.productName} — borderline between adoption-stage and steady-state. What signal would tell ${c.vendorName} the firm has plateaued versus is still climbing?`,
  },
  {
    id: "q-mid-vendor-higher-small-unlock",
    bandRequired: "mid",
    directionRequired: "vendor-higher",
    magnitudeRequired: "small",
    question: (c) =>
      `Mid-band firm review on ${c.productName} (${c.firmScore}), ${c.vendorName} reads it slightly higher — what single workflow inside ${c.firmName} would unlock the gap, and is ${c.vendorName} positioned to enable it?`,
  },
  {
    id: "q-mid-vendor-higher-small-evidence",
    bandRequired: "mid",
    directionRequired: "vendor-higher",
    magnitudeRequired: "small",
    question: (c) =>
      `${c.vendorName} claims more for ${c.productName} than ${c.firmName}'s mid-band review supports. Where's the proof point — a comparable firm that did unlock the high band on the same product?`,
  },
  {
    id: "q-mid-vendor-higher-medium-adoption-gap",
    bandRequired: "mid",
    directionRequired: "vendor-higher",
    magnitudeRequired: "medium",
    question: (c) =>
      `${c.firmName}=${c.firmScore} vs ${c.vendorName}=${c.vendorScore ?? "—"} on ${c.productName} (${fmtDelta(c.delta)}) — is this an adoption-curve gap that closes in 90 days, or a structural mismatch that won't?`,
  },
  {
    id: "q-mid-vendor-higher-medium-validation",
    bandRequired: "mid",
    directionRequired: "vendor-higher",
    magnitudeRequired: "medium",
    question: (c) =>
      `Vendor-higher gap on ${c.productName} at the mid band — what would ${c.firmName} need to see in the next quarterly cycle to validate ${c.vendorName}'s higher self-assessment?`,
  },
  {
    id: "q-mid-vendor-higher-large-hot",
    bandRequired: "mid",
    directionRequired: "vendor-higher",
    magnitudeRequired: "large",
    emphasis: "high",
    question: (c) =>
      `Hot vendor-higher divergence on ${c.productName} at mid band (${fmtDelta(c.delta)}): is ${c.vendorName} selling a roadmap commitment as current capability? What would change ${c.firmName}'s mid-band read?`,
  },
  {
    id: "q-mid-firm-higher-small-overperform",
    bandRequired: "mid",
    directionRequired: "firm-higher",
    magnitudeRequired: "small",
    question: (c) =>
      `${c.firmName}'s ${c.firmScore} on ${c.productName} runs ahead of ${c.vendorName}'s own read — is ${c.firmName} a forward-deployed reference customer ${c.vendorName} hasn't activated yet?`,
  },
  {
    id: "q-mid-firm-higher-small-scope",
    bandRequired: "mid",
    directionRequired: "firm-higher",
    magnitudeRequired: "small",
    question: (c) =>
      `Mid-band firm review exceeding vendor self-report on ${c.productName} — is ${c.firmName} using ${c.vendorName} for a narrower scope than the product roadmap targets? Different KPI, different read?`,
  },
  {
    id: "q-mid-firm-higher-medium-extension",
    bandRequired: "mid",
    directionRequired: "firm-higher",
    magnitudeRequired: "medium",
    question: (c) =>
      `${c.firmName} is extending ${c.productName} ${fmtDelta(c.delta)} beyond ${c.vendorName}'s own benchmark at the mid band — what custom workflow is doing the lifting, and is it durable past key-person risk?`,
  },
  {
    id: "q-mid-firm-higher-large",
    bandRequired: "mid",
    directionRequired: "firm-higher",
    magnitudeRequired: "large",
    emphasis: "high",
    question: (c) =>
      `Hot firm-higher divergence on ${c.productName} at mid band: ${c.firmName}=${c.firmScore}, ${c.vendorName}=${c.vendorScore ?? "—"}. Is ${c.firmName} doing ${c.vendorName}'s product work for them — and who owns that IP?`,
  },

  // ---------------- Low band (firm score < 50) ----------------
  {
    id: "q-low-neutral-baseline",
    bandRequired: "low",
    directionRequired: "neutral",
    magnitudeRequired: "small",
    question: (c) =>
      `${c.firmName} rates ${c.productName} below band where peers expect ${c.vendorName} to operate (${c.firmScore}) — is this deferred adoption, structural mismatch, or a scoping problem in the original purchase decision?`,
  },
  {
    id: "q-low-neutral-structural",
    bandRequired: "low",
    directionRequired: "neutral",
    magnitudeRequired: "small",
    question: (c) =>
      `Low-band score on ${c.productName} for ${c.firmName} with ${c.vendorName} self-aligned — both sides agree it's not working. What's the off-ramp: replace, scope-reduce, or rebuild internal capability?`,
  },
  {
    id: "q-low-vendor-higher-small-coverage",
    bandRequired: "low",
    directionRequired: "vendor-higher",
    magnitudeRequired: "small",
    question: (c) =>
      `${c.firmName}=${c.firmScore} on ${c.productName} (low band), ${c.vendorName} reads slightly higher — is ${c.vendorName} measuring coverage ${c.firmName} hasn't yet rolled out, or is the self-score generous?`,
  },
  {
    id: "q-low-vendor-higher-small-deferred",
    bandRequired: "low",
    directionRequired: "vendor-higher",
    magnitudeRequired: "small",
    question: (c) =>
      `Vendor-higher gap at the low band on ${c.productName} — is ${c.firmName} in a deferred-adoption pattern (the capability exists but the team hasn't used it), or is ${c.vendorName} overstating?`,
  },
  {
    id: "q-low-vendor-higher-medium-roadmap",
    bandRequired: "low",
    directionRequired: "vendor-higher",
    magnitudeRequired: "medium",
    question: (c) =>
      `${c.vendorName}=${c.vendorScore ?? "—"} vs ${c.firmName}=${c.firmScore} on ${c.productName} (${fmtDelta(c.delta)}) at low band — what's roadmap and what's reality? Where's the line in ${c.vendorName}'s product?`,
  },
  {
    id: "q-low-vendor-higher-medium-missing",
    bandRequired: "low",
    directionRequired: "vendor-higher",
    magnitudeRequired: "medium",
    question: (c) =>
      `Medium-magnitude vendor-higher gap on ${c.productName} at the low band — what capability is ${c.vendorName} including in the self-score that ${c.firmName} hasn't yet seen working in production?`,
  },
  {
    id: "q-low-vendor-higher-large-hot",
    bandRequired: "low",
    directionRequired: "vendor-higher",
    magnitudeRequired: "large",
    emphasis: "high",
    question: (c) =>
      `Hot vendor-higher divergence on ${c.productName} at the low band (${fmtDelta(c.delta)}) — this reads as a disqualifier signal unless ${c.vendorName} can show three peer firms operating the same capability above the mid band.`,
  },
  {
    id: "q-low-vendor-higher-large-disqualifier",
    bandRequired: "low",
    directionRequired: "vendor-higher",
    magnitudeRequired: "large",
    emphasis: "high",
    question: (c) =>
      `${c.firmName}'s ${c.firmScore} on ${c.productName} vs ${c.vendorName}'s self-read — large gap at the low band. If ${c.firmName} is the canary, what's ${c.vendorName}'s plan to surface that to other prospects honestly?`,
  },
  {
    id: "q-low-firm-higher-medium",
    bandRequired: "low",
    directionRequired: "firm-higher",
    magnitudeRequired: "medium",
    question: (c) =>
      `${c.firmName} rates ${c.productName} above ${c.vendorName}'s own low-band self-read — is ${c.firmName} extending the product into a use case ${c.vendorName} hasn't yet productized?`,
  },
  {
    id: "q-low-firm-higher-large",
    bandRequired: "low",
    directionRequired: "firm-higher",
    magnitudeRequired: "large",
    emphasis: "high",
    question: (c) =>
      `Hot firm-higher gap on ${c.productName} at low band (${c.firmName}=${c.firmScore}, ${c.vendorName}=${c.vendorScore ?? "—"}) — both sides are saying the product underperforms, but ${c.firmName}'s read is less harsh. What's the diverging frame?`,
  },
];

export function selectQuestions(
  cells: readonly QuestionScopeCell[],
  baseCtx: Pick<QuestionContext, "vendorName" | "firmName">,
  count = 5
): QuestionCandidate[] {
  const candidates: QuestionCandidate[] = [];
  const seenIds = new Set<string>();

  for (const cell of cells) {
    const band = bandForFirmScore(cell.firmScore);
    const direction = directionForDelta(cell.delta);
    const magnitude = magnitudeForDelta(cell.delta);

    for (const template of LIBRARY) {
      if (template.bandRequired && template.bandRequired !== band) continue;
      if (template.directionRequired && template.directionRequired !== direction)
        continue;
      if (template.magnitudeRequired && template.magnitudeRequired !== magnitude)
        continue;
      if (seenIds.has(template.id)) continue;

      const ctx: QuestionContext = {
        vendorName: baseCtx.vendorName,
        firmName: baseCtx.firmName,
        productName: cell.productName,
        capabilityArea: cell.capabilityArea,
        firmScore: cell.firmScore,
        vendorScore: cell.vendorScore,
        delta: cell.delta,
      };
      candidates.push({
        template,
        cell,
        rendered: template.question(ctx),
      });
      seenIds.add(template.id);
    }
  }

  candidates.sort((a, b) => {
    const score = (c: QuestionCandidate): number => {
      const mag = magnitudeForDelta(c.cell.delta);
      const band = bandForFirmScore(c.cell.firmScore);
      let rank = 0;
      if (mag === "large") rank += 100;
      else if (mag === "medium") rank += 50;
      if (band === "high") rank += 10;
      else if (band === "mid") rank += 5;
      if (c.template.emphasis === "high") rank += 20;
      return rank;
    };
    return score(b) - score(a);
  });

  return candidates.slice(0, count);
}
