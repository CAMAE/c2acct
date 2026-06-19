import Link from "next/link";
import { redirect } from "next/navigation";
import { submitInviteeCode } from "@/app/sign-in/invitee/actions";
import { getInviteeCodeConfigs, isInviteeAccessEnabled } from "@/lib/invitee/access";
import { getPilotDisabledSignInPath, isInviteeSurfacesEnabled } from "@/lib/pilotSurfaces";

export const metadata = {
  title: "Invitee Access | Patalign",
  description: "Secret-code access shell for PAT invitees.",
};

function getErrorMessage(error: string | undefined) {
  if (error === "missing_code") return "Enter a valid access code to continue.";
  if (error === "invalid_code") return "That access code is not recognized.";
  if (error === "disabled") return "Invitee access is not enabled in this environment.";
  return null;
}

export default async function InviteeSignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  if (!isInviteeSurfacesEnabled()) {
    redirect(getPilotDisabledSignInPath("invitee"));
  }

  const params = searchParams ? await searchParams : undefined;
  const errorMessage = getErrorMessage(params?.error);
  const enabled = isInviteeAccessEnabled();
  const exampleCodes = getInviteeCodeConfigs().map((entry) => entry.code);

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Invitee access</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Continue with a private access code
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          This path is reserved for selective PAT review access. Enter a valid code to open the intended preloaded PAT surface without weakening the standard sign-in flow.
        </p>
      </section>

      <section className="pat-card p-8">
        <div className="pat-label">Secret code</div>
        <form className="mt-4 grid gap-4" action={submitInviteeCode}>
          <input
            name="code"
            type="text"
            autoComplete="off"
            placeholder="Enter access code"
            className="pat-input max-w-md"
          />
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="pat-button-primary">
              Continue
            </button>
            <Link className="pat-button-secondary" href="/sign-in">
              Back to PAT access
            </Link>
          </div>
        </form>
        {errorMessage ? (
          <div className="mt-5 rounded-[18px] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-900">
            {errorMessage}
          </div>
        ) : null}
      </section>

      <section className="pat-card p-8">
        <div className="pat-label">Configuration</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Invitee access: <span className="font-semibold text-[var(--shell-ink)]">{enabled ? "Enabled" : "Disabled"}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Local codes: <span className="font-semibold text-[var(--shell-ink)]">{exampleCodes.length}</span>
          </div>
        </div>
        <div className="mt-5 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4 text-sm leading-6 text-[var(--shell-muted)]">
          Invitee codes are configured through the typed invitee service and can be extended locally with `PAT_INVITEE_CODES_JSON`. Production rollout still depends on controlled code distribution, a production invitee secret, and the same PAT access controls already in place.
        </div>
      </section>
    </div>
  );
}
