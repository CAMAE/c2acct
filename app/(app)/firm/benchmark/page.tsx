import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import HeroChips from "@/app/components/pat/HeroChips";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import CardChip, { CardChipRow } from "@/app/components/cards/CardChip";
import PercentileBand from "@/app/components/charts/PercentileBand";
import MedianRows from "@/app/components/charts/MedianRows";
import LockedElitePreview from "@/app/components/insights/LockedElitePreview";
import { getSessionUser } from "@/lib/auth/session";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import { isPingsEnabled } from "@/lib/patAssistant/flags";
import { resolveCompanyBoundary } from "@/lib/dataBoundary";
import { getFirmAlignmentSignal } from "@/lib/firmAlignmentSignal";
import { buildFirmPeerPosition, leverPhrase, positionPhrase, rowsForTier } from "@/lib/eliteInsightsV2";
import { RANK_MIN_N } from "@/lib/assessmentCore";
import { getBenchmarkArtifactMeta } from "@/lib/benchmarkArtifact";
import { storedCutoffPhrase } from "@/lib/assessmentCore";
import { scoreBandFor } from "@/lib/bandLexicon";
import { percentileOrdinal } from "@/lib/ordinal";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Quarterly Benchmark | Patalign",
  description: "Your firm's standing in the quarterly PAT benchmark, with the published cutoff date.",
};

export default async function FirmBenchmarkArtifactPage() {
  if (!isPingsEnabled()) {
    notFound();
  }
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/firm");
  }

  // Members-only (all tiers): Pro clears the gate; the Elite layer is walled inside.
  const entitlement = await resolveMembershipEntitlement(sessionUser, "firm", MEMBERSHIP_PLAN.PRO);
  if (!entitlement.allowed) {
    return (
      <MembershipSurfaceGate
        audience="firm"
        surfaceLabel="Quarterly benchmark"
        title="The quarterly benchmark is a member surface"
        body="The quarterly PAT benchmark shows where your firm stands against its cohort at each quarter's cutoff. It opens with membership; the cutoff and cohort-freshness rules are published on the methodology page for everyone."
        displayName={entitlement.membership.displayName}
        currentPlan={entitlement.membership.plan}
        currentStatus={entitlement.membership.status}
        requiredPlan={entitlement.requiredPlan}
        membershipHref={entitlement.membershipHref}
        upgradeHref={entitlement.upgradeHref}
        workspaceHref="/firm"
        workspaceLabel="Open firm workspace"
        availableNow="Portal entry, your assessments, and the public methodology stay available in the baseline state."
        upgradeNote="The benchmark artifact packages cohort standing into the engagement layer, a member surface."
      />
    );
  }
  const eliteEntitlement = await resolveMembershipEntitlement(sessionUser, "firm", MEMBERSHIP_PLAN.ELITE);

  // `meta` is the NEXT cutoff — a forward-looking calendar deadline. The cut this
  // page SHOWS is the stored BenchmarkRun's cutoff, read through the same
  // FirmPeerPosition the Elite Peer Position card reads (enforce-core, ruling 1).
  const meta = getBenchmarkArtifactMeta();
  const companyId = sessionUser.companyId!;
  const [boundary, signal] = await Promise.all([
    resolveCompanyBoundary(companyId),
    getFirmAlignmentSignal(companyId),
  ]);
  const peer = await buildFirmPeerPosition(prisma, companyId, boundary, signal);

  return (
    <div className="space-y-8">
      <section className="pat-card relative p-8" data-testid="firm-benchmark-hero">
        <HeroChips audience="firm" />
        <PatLogoLockup mode="hero" tone="light" />
        <div className="pat-label mt-6">
          Quarterly benchmark · {peer.cutoffLabel ? `cut of ${peer.cutoffLabel}` : meta.quarterLabel}
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Where your firm stands this quarter
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {storedCutoffPhrase(peer.cutoffLabel, peer.cutoffAt)}: that is the cut shown below. {meta.cutoffSentence}{" "}
          {meta.daysToCutoff > 0 ? `${meta.daysToCutoff} days remain until the ${meta.quarterLabel} cutoff.` : "This quarter's cutoff has passed."} The cutoff decides what counts in the next cut, it never changes a score already computed.{" "}
          <Link href="/methodology#quarterly-cutoff" className="font-semibold text-[var(--brand-c2-blue)] hover:underline">
            See the cutoff rules
          </Link>
          .
        </p>
        <CardChipRow>
          <CardChip tone="neutral">{storedCutoffPhrase(peer.cutoffLabel, peer.cutoffAt)}</CardChip>
          <CardChip tone="muted">Next cutoff {meta.cutoffLabel}</CardChip>
          {meta.daysToCutoff > 0 ? <CardChip tone="amber">{meta.daysToCutoff} days to cutoff</CardChip> : null}
        </CardChipRow>
      </section>

      {!peer.available || !peer.overall ? (
        <div className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5 text-sm leading-6 text-[var(--shell-muted)]">
          {peer.emptyReason ??
            "Your benchmark standing opens once your alignment index is live and the cohort has enough contributing firms to place you responsibly."}
        </div>
      ) : (
        <>
          {/* Pro: what the cohort size allows (scoring-core, ruling 13): median at 5, quartiles at 10, percentile at 30. */}
          <section className="pat-card p-6" data-testid="firm-benchmark-standing">
            <div className="pat-label">Your cohort standing</div>
            <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
              <div>
                <div className="text-4xl font-semibold tabular-nums text-[var(--shell-ink)]">
                  {peer.displayTier === "percentile" ? (
                    <>
                      {percentileOrdinal(peer.overall.percentile)}
                      <span className="ml-1 text-lg font-medium text-[var(--shell-muted)]">pct</span>
                    </>
                  ) : (
                    <span className="text-2xl">{positionPhrase({ tier: peer.displayTier, percentile: peer.overall.percentile, score: peer.overall.score, peerMedian: peer.overall.peerMedian })}</span>
                  )}
                </div>
                <div className="mt-1 text-sm text-[var(--shell-muted)]">
                  alignment index {Math.round(peer.overall.score)} · {scoreBandFor(peer.overall.score).label}
                </div>
              </div>
              <CardChipRow>
                <CardChip tone="muted">Cohort of {peer.overall.n} firms</CardChip>
              </CardChipRow>
            </div>
            <div className="mt-5">
              {peer.displayTier === "median" ? (
                <MedianRows rows={peer.rows} title="Your score beside the peer median, by module" />
              ) : (
                <PercentileBand
                  rows={rowsForTier(peer.rows, peer.displayTier)}
                  title={
                    peer.cutoffLabel
                      ? `Cohort distribution by module, cut of ${peer.cutoffLabel}`
                      : `${meta.quarterLabel} cohort distribution by module`
                  }
                />
              )}
            </div>
            <p className="mt-4 text-xs leading-5 text-[var(--shell-muted)]">
              {peer.displayTier === "median"
                ? "With fewer than 10 firms in the cohort, the benchmark shows the peer median and your band; the quartiles open at 10 and the percentile at 30. "
                : peer.displayTier === "quartiles"
                  ? "Bands show the cohort's p25–p75 spread with a top-decile tick; your marker is your own score. The percentile opens at 30 firms in the cohort. "
                  : "Bands show the cohort's p25–p75 spread with a top-decile tick; your marker is your own score. "}
              Peer firms are never named; the cohort is anonymized by design.
            </p>
          </section>

          {/* Elite tier wall INSIDE the artifact: exact rank + the single best move. */}
          {eliteEntitlement.allowed ? (
            <section className="pat-card p-6" data-testid="firm-benchmark-elite">
              <div className="pat-label">Elite · your exact position</div>
              <div className="mt-3 text-2xl font-semibold text-[var(--shell-ink)]">
                {peer.rankShown
                  ? `#${peer.overall.rankFromTop} of ${peer.overall.n} in your cohort`
                  : `Your exact rank opens at ${RANK_MIN_N} firms in the cohort (${peer.overall.n} today)`}
              </div>
              {peer.bestAction ? (
                <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
                  Fastest move up: <strong>{peer.bestAction.moduleLabel}</strong>. Closing its {peer.bestAction.deficit}-point
                  deficit {leverPhrase(peer.bestAction)} before the next cutoff on {meta.cutoffLabel}; you sit at the{" "}
                  {percentileOrdinal(peer.bestAction.fromPercentile)} percentile today.
                </p>
              ) : null}
            </section>
          ) : (
            <LockedElitePreview
              title="Your exact rank + fastest move up"
              description="Elite shows your #N-of-cohort rank and the single module that lifts your percentile most before the cutoff."
              shape="distribution"
              upgradeHref={eliteEntitlement.upgradeHref}
            />
          )}
        </>
      )}
    </div>
  );
}
