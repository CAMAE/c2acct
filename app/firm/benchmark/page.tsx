import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import HeroChips from "@/app/components/pat/HeroChips";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import CardChip, { CardChipRow } from "@/app/components/cards/CardChip";
import PercentileBand from "@/app/components/charts/PercentileBand";
import LockedElitePreview from "@/app/components/insights/LockedElitePreview";
import { getSessionUser } from "@/lib/auth/session";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import { isPingsEnabled } from "@/lib/patAssistant/flags";
import { resolveCompanyBoundary } from "@/lib/dataBoundary";
import { getFirmAlignmentSignal } from "@/lib/firmAlignmentSignal";
import { buildFirmPeerPosition } from "@/lib/eliteInsightsV2";
import { getBenchmarkArtifactMeta } from "@/lib/benchmarkArtifact";
import { scoreChipLabel } from "@/lib/bandLexicon";

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
        <div className="pat-label mt-6">Quarterly benchmark · {meta.quarterLabel}</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Where your firm stands this quarter
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {meta.cutoffSentence} {meta.daysToCutoff > 0 ? `${meta.daysToCutoff} days remain until the ${meta.quarterLabel} cutoff.` : "This quarter's cutoff has passed."} The cutoff decides what counts in the next cut — it never changes a score already computed.{" "}
          <Link href="/methodology#quarterly-cutoff" className="font-semibold text-[var(--brand-c2-blue)] hover:underline">
            See the cutoff rules
          </Link>
          .
        </p>
        <CardChipRow>
          <CardChip tone="neutral">Cutoff {meta.cutoffLabel}</CardChip>
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
          {/* Pro: bands / counts / percentiles — visible to every member. */}
          <section className="pat-card p-6" data-testid="firm-benchmark-standing">
            <div className="pat-label">Your cohort standing</div>
            <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
              <div>
                <div className="text-4xl font-semibold tabular-nums text-[var(--shell-ink)]">
                  {peer.overall.percentile}
                  <span className="ml-1 text-lg font-medium text-[var(--shell-muted)]">th pct</span>
                </div>
                <div className="mt-1 text-sm text-[var(--shell-muted)]">
                  alignment index {Math.round(peer.overall.score)} · {scoreChipLabel(peer.overall.score)}
                </div>
              </div>
              <CardChipRow>
                <CardChip tone="muted">Cohort of {peer.overall.n} firms</CardChip>
              </CardChipRow>
            </div>
            <div className="mt-5">
              <PercentileBand rows={peer.rows} title={`${meta.quarterLabel} cohort distribution by module`} />
            </div>
            <p className="mt-4 text-xs leading-5 text-[var(--shell-muted)]">
              Bands show the cohort&apos;s p25–p75 spread with a top-decile tick; your marker is your own score. Peer firms are
              never named — the cohort is anonymized by design.
            </p>
          </section>

          {/* Elite tier wall INSIDE the artifact: exact rank + the single best move. */}
          {eliteEntitlement.allowed ? (
            <section className="pat-card p-6" data-testid="firm-benchmark-elite">
              <div className="pat-label">Elite · your exact position</div>
              <div className="mt-3 text-2xl font-semibold text-[var(--shell-ink)]">
                #{peer.overall.rankFromTop} of {peer.overall.n} in your cohort
              </div>
              {peer.bestAction ? (
                <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
                  Fastest move up: <strong>{peer.bestAction.moduleLabel}</strong> — closing its {peer.bestAction.deficit}-point
                  deficit lifts you from the {peer.bestAction.fromPercentile}th toward the {peer.bestAction.toPercentile}th
                  percentile before the {meta.quarterLabel} cutoff.
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
