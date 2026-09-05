import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_SIGN_IN_REGISTER, V7_SIGN_IN_REGISTER } from "@/app/(public)/sign-in/register";
import { getLocalReviewAuthPolicy } from "@/lib/auth/localReview";
import { MEET_PAT_V7_SECTION_COUNT } from "@/lib/frontDoor";
import { SUPPORTED_LOCALES, getLocaleMessages } from "@/lib/locale";

/**
 * Block 21c/21d — the sign-in hub and its Meet PAT view under the V7 door. Both
 * ship DARK behind PAT_ENABLE_NEW_FRONT_DOOR; flag-off markup is byte-identical
 * (proved by rendered-HTML diff at commit time, pinned here at the source level).
 */
const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const meetPat = read("app/components/pat/MeetPatContent.tsx");
const signIn = read("app/(public)/sign-in/page.tsx");
const authEnv = read("lib/auth/env.ts");

function meetPatChars(locale: (typeof SUPPORTED_LOCALES)[number]) {
  const m = getLocaleMessages(locale).meetPat;
  const hero = m.eyebrow.length + m.heroTitle.length + m.heroBody.length;
  const section = (s: { title: string; body: string }) => s.title.length + s.body.length;
  const full = hero + m.sections.reduce((a, s) => a + section(s), 0) + m.valueTitle.length + m.valueBody.length;
  const compact = hero + m.sections.slice(0, MEET_PAT_V7_SECTION_COUNT).reduce((a, s) => a + section(s), 0);
  return { full, compact };
}

describe("21c — Meet PAT under the V7 door is cut by at least 40%, by omission only", () => {
  it.each(SUPPORTED_LOCALES)("%s: the V7 copy is <= 60% of the full copy", (locale) => {
    const { full, compact } = meetPatChars(locale);
    expect(compact / full, `${locale}: ${compact}/${full}`).toBeLessThanOrEqual(0.6);
  });

  it("keeps the hero + the first two sections and drops 'How PAT grows' + the value block", () => {
    expect(MEET_PAT_V7_SECTION_COUNT).toBe(2);
    for (const locale of SUPPORTED_LOCALES) {
      const m = getLocaleMessages(locale).meetPat;
      expect(m.sections.length).toBe(3);
    }
    const v7 = meetPat.slice(meetPat.indexOf('if (variant === "v7")'), meetPat.indexOf("  return (\n    <div className=\"space-y-8\">"));
    expect(v7).toContain("messages.meetPat.sections.slice(0, MEET_PAT_V7_SECTION_COUNT)");
    expect(v7).toContain("messages.meetPat.heroTitle");
    expect(v7).toContain("messages.meetPat.heroBody");
    expect(v7).not.toContain("valueTitle");
    expect(v7).not.toContain("valueBody");
    // No re-voicing: the v7 branch introduces no copy of its own (only message lookups).
    expect(v7).not.toMatch(/>\s*[A-Z][a-z]+ [a-z]+[^<{]*</);
  });

  it("the default variant is untouched: all sections + the value block, same markup", () => {
    const dflt = meetPat.slice(meetPat.indexOf("  return (\n    <div className=\"space-y-8\">"));
    expect(dflt).toContain("{messages.meetPat.sections.map((section) => (");
    expect(dflt).toContain("{messages.meetPat.valueTitle}");
    expect(dflt).toContain("{pilotBody(messages.meetPat.valueBody)}");
    expect(meetPat).toMatch(/variant = "default" \}: MeetPatContentProps/);
  });

  it("the sign-in hub selects the variant from PAT_ENABLE_NEW_FRONT_DOOR and nothing else", () => {
    expect(signIn).toContain("<MeetPatInline v7={isNewFrontDoorEnabled()} />");
    expect(signIn).toMatch(/<MeetPatContent variant=\{v7 \? "v7" : "default"\} \/>/);
  });
});

describe("21d — sign-in hub in the V7 register, flag-off byte-identical", () => {
  it("DEFAULT register carries the exact pre-21d class literals (flag-off markup unchanged)", () => {
    expect(DEFAULT_SIGN_IN_REGISTER).toEqual({
      page: "space-y-8",
      hubSection: "pat-card p-8",
      hubTitle: "mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]",
      hubBody: "mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]",
      selectorWrap: "mt-6",
      selector:
        "inline-flex flex-wrap gap-2 rounded-full border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-1.5",
      pill: "rounded-full border px-4 py-2.5 text-sm font-medium leading-none",
      pillActive: "border-[rgba(6,54,116,0.16)] bg-[rgba(6,54,116,0.06)] text-[var(--shell-ink)]",
      pillInactive:
        "border-transparent text-[var(--shell-muted)] hover:border-[rgba(6,54,116,0.18)] hover:bg-white",
      card: "pat-card p-8",
      cardStyle: undefined,
      cardTitle: "mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]",
      cardBody: "mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]",
      buttonPrimary: "pat-button-primary",
      buttonSecondary: "pat-button-secondary",
      localReviewBox: "mt-6 rounded-[18px] border border-sky-200 bg-sky-50/90 p-5 text-sm leading-6 text-sky-950",
      provisionedBox:
        "mt-6 rounded-[18px] border border-[var(--shell-border)] bg-white/80 p-5 text-sm leading-6 text-[var(--shell-muted)]",
      diagnosticsBox: "mt-6 rounded-[18px] border border-amber-200 bg-amber-50/90 p-5 text-sm leading-6 text-amber-900",
      helpCard: "pat-card p-6",
      helpCardTitle: "text-xl font-semibold text-[var(--shell-ink)]",
      helpCardBody: "mt-4 text-sm leading-6 text-[var(--shell-muted)]",
      helpStatusBox:
        "mt-6 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5 text-sm leading-6 text-[var(--shell-muted)]",
    });
  });

  it("the page reads every styled class through the register (no stray literals, one tree)", () => {
    expect(signIn).toContain("const r = getSignInRegister();");
    for (const literal of ['"pat-card p-8"', '"pat-button-primary"', '"pat-button-secondary"', "text-3xl", "max-w-3xl text-base"]) {
      expect(signIn, `stray literal ${literal}`).not.toContain(literal);
    }
    expect((signIn.match(/register=\{r\}/g) || []).length).toBe(7); // 5 role cards + help + selector
    expect((signIn.match(/className=\{r\.buttonPrimary\}/g) || []).length).toBe(6);
    expect((signIn.match(/className=\{r\.buttonSecondary\}/g) || []).length).toBe(2);
    // The door shadow is spread, never passed as `style={undefined}`: a present-but-
    // undefined prop serialises as "style":"$undefined" in the RSC flight payload and
    // would break flag-off byte-identity of the stream.
    expect(signIn).not.toContain("style={r.cardStyle}");
    expect((signIn.match(/\{\.\.\.cardStyleProps\(r\)\}/g) || []).length).toBe(4);
  });

  it("V7 register: door grammar — ink pill primary, ghost pill secondary, pat-card + door shadow, px scale", () => {
    expect(V7_SIGN_IN_REGISTER.buttonPrimary).toBe("rounded-full bg-[var(--shell-ink)] px-6 py-[11px] text-[15px] font-semibold text-white");
    expect(V7_SIGN_IN_REGISTER.buttonSecondary).toMatch(/^rounded-full border border-\[var\(--shell-border\)\] bg-white/);
    expect(V7_SIGN_IN_REGISTER.card).toBe("pat-card px-[42px] py-10");
    expect(V7_SIGN_IN_REGISTER.cardStyle).toEqual({ boxShadow: "0 1px 2px rgba(12,33,66,.05), 0 24px 64px rgba(12,33,66,.09)" });
    expect(V7_SIGN_IN_REGISTER.hubTitle).toContain("font-extrabold");
    expect(V7_SIGN_IN_REGISTER.pillActive).toBe("border-[var(--shell-ink)] bg-[var(--shell-ink)] text-white");
    // No rem-based font sizes in the V7 register (rem is 11.5px inside this shell).
    for (const value of Object.values(V7_SIGN_IN_REGISTER)) {
      if (typeof value === "string") expect(value).not.toMatch(/\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl)\b/);
    }
  });
});

describe('21d — the "Local review access" box is unreachable outside a local/review runtime', () => {
  it("the box renders only behind localReviewEnabled, and every card feeds it localReviewProviderReady", () => {
    expect(signIn).toMatch(/\{localReviewEnabled && localReviewEmail \? \([\s\S]{0,120}Local review access/);
    expect((signIn.match(/Local review access/g) || []).length).toBe(1);
    expect((signIn.match(/localReviewEnabled=\{authRuntime\.localReviewProviderReady\}/g) || []).length).toBe(5);
    expect(signIn).not.toMatch(/localReviewEnabled=\{(?!authRuntime\.localReviewProviderReady)/);
  });

  it("localReviewProviderReady derives from the loopback-only local-review policy (plus secret + password)", () => {
    expect(authEnv).toContain("const localReviewRequested = isLocalReviewAuthRequested();");
    expect(authEnv).toContain("const localReviewEnabled = localReviewRequested;");
    expect(authEnv).toContain("const localReviewProviderReady = Boolean(localReviewEnabled && secret && localReviewPassword);");
  });

  const fullyConfigured = {
    PAT_ENABLE_LOCAL_REVIEW_AUTH: "1",
    AUTH_SECRET: "secret",
    PAT_LOCAL_REVIEW_PASSWORD: "pat-local-review",
  };

  it("production with a public origin: never available, even with the flag, secret and password set", () => {
    const policy = getLocalReviewAuthPolicy({ NODE_ENV: "production", AUTH_URL: "https://patalign.com", ...fullyConfigured } as NodeJS.ProcessEnv);
    expect(policy.credentialsProviderAvailable).toBe(false);
    expect(policy.reason).toBe("non-loopback-origin:AUTH_URL=https://patalign.com");
  });

  it("production with no origin configured: never available", () => {
    const policy = getLocalReviewAuthPolicy({ NODE_ENV: "production", ...fullyConfigured } as NodeJS.ProcessEnv);
    expect(policy.credentialsProviderAvailable).toBe(false);
    expect(policy.reason).toBe("loopback-origin-required");
  });

  it("any runtime with a public origin (e.g. a preview host): never available", () => {
    const policy = getLocalReviewAuthPolicy({ NODE_ENV: "development", NEXTAUTH_URL: "https://preview.patalign.com", ...fullyConfigured } as NodeJS.ProcessEnv);
    expect(policy.credentialsProviderAvailable).toBe(false);
  });

  it("local loopback without the flag: not available (the flag is the opt-in)", () => {
    const policy = getLocalReviewAuthPolicy({ NODE_ENV: "development", AUTH_URL: "http://127.0.0.1:3000", AUTH_SECRET: "s", PAT_LOCAL_REVIEW_PASSWORD: "p" } as NodeJS.ProcessEnv);
    expect(policy.credentialsProviderAvailable).toBe(false);
    expect(policy.reason).toBe("local-review-flag-disabled");
  });

  it("positive control — local loopback WITH the flag is the only state that can show the box", () => {
    const policy = getLocalReviewAuthPolicy({ NODE_ENV: "development", AUTH_URL: "http://127.0.0.1:3000", ...fullyConfigured } as NodeJS.ProcessEnv);
    expect(policy.credentialsProviderAvailable).toBe(true);
  });
});
