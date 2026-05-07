import { redirect } from "next/navigation";
import { updateFirstLoginPasswordAction } from "@/lib/auth/pilotPasswordActions";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function sanitizeReturnTo(value: string | null) {
  return value?.startsWith("/") ? value : "/";
}

function describeError(error: string | null) {
  if (error === "password_mismatch") {
    return "The new passwords did not match. Enter the same password twice.";
  }

  if (error === "password_policy") {
    return "Use at least 12 characters with lowercase, uppercase, and numeric characters.";
  }

  return null;
}

export default async function FirstLoginPasswordUpdatePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const sessionUser = await getSessionUser();
  const returnTo = sanitizeReturnTo(getSingleParam(resolvedSearchParams?.returnTo));
  const errorCopy = describeError(getSingleParam(resolvedSearchParams?.error));

  if (!sessionUser) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(returnTo)}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, email: true, mustChangePassword: true, passwordHash: true },
  });
  if (!user) {
    redirect("/sign-in?error=pilot_password_invalid");
  }

  if (!user.mustChangePassword && user.passwordHash) {
    redirect(returnTo);
  }

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">First-login password update</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Set your permanent PAT password
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          This provisioned pilot account signed in with a temporary or imported credential. Set a new password before opening protected vendor, firm, admin, or consultant surfaces.
        </p>
        <div className="mt-4 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4 text-sm leading-6 text-[var(--shell-muted)]">
          Account: <span className="font-semibold text-[var(--shell-ink)]">{user.email}</span>
        </div>
        {errorCopy ? (
          <div className="mt-5 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-900">
            {errorCopy}
          </div>
        ) : null}
        <form className="mt-6 grid gap-4 md:max-w-xl" action={updateFirstLoginPasswordAction}>
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="grid gap-2 text-sm font-semibold text-[var(--shell-ink)]">
            New password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              className="pat-input"
              required
              minLength={12}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-[var(--shell-ink)]">
            Confirm new password
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="pat-input"
              required
              minLength={12}
            />
          </label>
          <p className="text-sm leading-6 text-[var(--shell-muted)]">
            Passwords must be at least 12 characters and include lowercase, uppercase, and numeric characters. PAT stores only a salted password hash.
          </p>
          <button type="submit" className="pat-button-primary">
            Save password and continue
          </button>
        </form>
      </section>
    </div>
  );
}
