import type { NudgeReason } from "@/lib/notifications/triggers";

/**
 * Pat-voiced ping copy (Elite Sprint Block E). Deterministic, template-based —
 * no LLM. Pat's register is calm and structured, never needy (Module 1 in the
 * influence doc): it states the number and asks a low-pressure question. This is
 * the single copy source the automated trigger output (planPings) flows through;
 * in-app only (email stays behind PAT_PINGS_EMAIL_ENABLED, which is off).
 *
 * Two shapes:
 *  - reminder   → to the firm/vendor themselves, direct address ("you're at x%").
 *  - escalation → to the managing consultant about the account, third person
 *    ("[firm] is at x% … worth a nudge?").
 */

type PingAudience = "firm" | "vendor";

export type PatPingCopy = {
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
};

export type ComposePatPingInput =
  | {
      kind: "reminder";
      reason: Exclude<NudgeReason, "none">;
      audience: PingAudience;
      completionPercent: number;
    }
  | {
      kind: "escalation";
      audience: PingAudience;
      completionPercent: number;
      companyName?: string | null;
    };

function assessmentLabel(audience: PingAudience): string {
  return audience === "vendor" ? "product self-assessment" : "alignment assessment";
}

function assessmentCta(audience: PingAudience): { ctaLabel: string; ctaHref: string } {
  return audience === "vendor"
    ? { ctaLabel: "Open your product assessment", ctaHref: "/vendor/product-assessment" }
    : { ctaLabel: "Open your alignment assessment", ctaHref: "/firm/alignment-assessment" };
}

/** Round to a whole percent for the copy (never fake sub-point precision). */
function pct(value: number): number {
  return Math.round(value);
}

export function composePatPingCopy(input: ComposePatPingInput): PatPingCopy {
  const assessment = assessmentLabel(input.audience);

  if (input.kind === "escalation") {
    const who = input.companyName?.trim() ? input.companyName.trim() : `a ${input.audience} you manage`;
    return {
      title: "Pat flagged an account worth a nudge",
      body: `Hi, it's Pat — ${who} is at ${pct(input.completionPercent)}% on their ${assessment} and hasn't responded to recent reminders. Worth a personal nudge?`,
      ctaLabel: null,
      ctaHref: null,
    };
  }

  const cta = assessmentCta(input.audience);
  const body =
    input.reason === "deadline"
      ? `Hi, it's Pat — you're at ${pct(input.completionPercent)}% on your ${assessment}, and your quarter close is coming up. When you have a moment, let's finish it so your data is complete.`
      : `Hi, it's Pat — you're at ${pct(input.completionPercent)}% on your ${assessment}. It's been a little while; when you have a moment, let's pick it back up so your briefing stays current.`;
  return { title: "A note from Pat", body, ctaLabel: cta.ctaLabel, ctaHref: cta.ctaHref };
}
