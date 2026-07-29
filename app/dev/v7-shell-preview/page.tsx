import { notFound } from "next/navigation";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";
import V7PublicShell from "@/app/components/frontdoor/V7PublicShell";

export const metadata = { title: "V7 public shell preview" };

/**
 * Block 21a STEP 1 — a dark preview of V7PublicShell (nav + EN/FR/ES selector +
 * footer) for Mythos's visual, behind PAT_ENABLE_NEW_FRONT_DOOR. Purely additive:
 * no change to the live AppHeader/root shell. STEP 2 wires V7PublicShell into the
 * (public) route group and retires this preview.
 */
export default function V7ShellPreviewPage() {
  if (!isNewFrontDoorEnabled()) notFound();
  return (
    <V7PublicShell>
      <section className="mx-auto max-w-[1120px] px-9 py-24 text-center">
        <div className="pat-label">Block 21a · Step 1</div>
        <h1 className="mx-auto mt-4 max-w-[16em] text-[40px] font-extrabold leading-[1.06] tracking-[-0.02em]">
          V7 public shell preview.
        </h1>
        <p className="mx-auto mt-5 max-w-[34em] text-[18px] font-medium text-[var(--shell-muted)]">
          Shared nav (with the EN/FR/ES language selector reused from AppHeader) and the
          product footer. This wraps every public page once Step 2 lands the route group.
        </p>
      </section>
    </V7PublicShell>
  );
}
