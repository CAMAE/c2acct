import type { CSSProperties } from "react";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";

/**
 * Block 21d — the sign-in hub's visual register. The page's markup, forms,
 * server actions and copy are ONE tree; only these class strings differ between
 * the standard shell and the V7 door.
 *
 *   DEFAULT — the exact class literals the page carried before 21d. Flag-off
 *             output is byte-identical (rendered-HTML diff at commit time; the
 *             literals are pinned verbatim in tests/v7-sign-in.contract.test.ts).
 *   V7      — the door's register: centered hero header (pat-label eyebrow,
 *             extrabold tight-tracked title, muted medium subtitle), pill
 *             selector with the nav's ink-filled active state, pat-card 28px with
 *             the door shadow, ink pill primary / ghost pill secondary buttons,
 *             px type scale (rem is 11.5px in this shell).
 *
 * Selected by PAT_ENABLE_NEW_FRONT_DOOR only. Never touches which forms render.
 */
export type SignInRegister = {
  page: string;
  hubSection: string;
  hubTitle: string;
  hubBody: string;
  selectorWrap: string;
  selector: string;
  pill: string;
  pillActive: string;
  pillInactive: string;
  card: string;
  cardStyle: CSSProperties | undefined;
  cardTitle: string;
  cardBody: string;
  buttonPrimary: string;
  buttonSecondary: string;
  localReviewBox: string;
  provisionedBox: string;
  diagnosticsBox: string;
  helpCard: string;
  helpCardTitle: string;
  helpCardBody: string;
  helpStatusBox: string;
};

export const DEFAULT_SIGN_IN_REGISTER: SignInRegister = {
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
};

const V7_SHADOW = "0 1px 2px rgba(12,33,66,.05), 0 24px 64px rgba(12,33,66,.09)";

export const V7_SIGN_IN_REGISTER: SignInRegister = {
  page: "mx-auto w-full max-w-[1120px] space-y-7 px-9 pb-[88px] pt-14",
  hubSection: "px-0 pb-2 pt-6 text-center",
  hubTitle: "mx-auto mt-[18px] max-w-[14em] text-[48px] font-extrabold leading-[1.06] tracking-[-0.02em] text-[var(--shell-ink)]",
  hubBody: "mx-auto mt-4 max-w-[640px] text-[18px] font-medium leading-7 text-[var(--shell-muted)]",
  selectorWrap: "mt-8 flex justify-center",
  selector: "inline-flex flex-wrap justify-center gap-[10px]",
  pill: "rounded-full border px-[18px] py-[11px] text-[15px] font-semibold leading-none",
  pillActive: "border-[var(--shell-ink)] bg-[var(--shell-ink)] text-white",
  pillInactive: "border-[var(--shell-border)] bg-white text-[var(--shell-muted)] hover:text-[var(--shell-ink)]",
  card: "pat-card px-[42px] py-10",
  cardStyle: { boxShadow: V7_SHADOW },
  cardTitle: "mt-3 text-[27px] font-bold tracking-[-0.01em] text-[var(--shell-ink)]",
  cardBody: "mt-4 max-w-[640px] text-[16px] leading-7 text-[var(--shell-muted)]",
  buttonPrimary: "rounded-full bg-[var(--shell-ink)] px-6 py-[11px] text-[15px] font-semibold text-white",
  buttonSecondary:
    "rounded-full border border-[var(--shell-border)] bg-white px-6 py-[11px] text-[15px] font-semibold text-[var(--shell-ink)]",
  localReviewBox: "mt-7 rounded-[22px] border border-sky-200 bg-sky-50/90 p-6 text-[14.5px] leading-6 text-sky-950",
  provisionedBox:
    "mt-7 rounded-[22px] border border-[var(--shell-border)] bg-[#fbfcfe] p-6 text-[14.5px] leading-6 text-[var(--shell-muted)]",
  diagnosticsBox: "mt-7 rounded-[22px] border border-amber-200 bg-amber-50/90 p-6 text-[14.5px] leading-6 text-amber-900",
  helpCard: "pat-card px-7 py-6",
  helpCardTitle: "text-[19px] font-bold tracking-[-0.01em] text-[var(--shell-ink)]",
  helpCardBody: "mt-3 text-[14.5px] leading-6 text-[var(--shell-muted)]",
  helpStatusBox:
    "mt-7 rounded-[22px] border border-[var(--shell-border)] bg-[#fbfcfe] p-6 text-[14.5px] leading-6 text-[var(--shell-muted)]",
};

export function getSignInRegister(): SignInRegister {
  return isNewFrontDoorEnabled() ? V7_SIGN_IN_REGISTER : DEFAULT_SIGN_IN_REGISTER;
}
