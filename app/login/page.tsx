import Link from "next/link";
import { signIn } from "@/auth";

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function sanitizeRedirect(target: string | null) {
  if (!target) return "/";
  return target.startsWith("/") ? target : "/";
}

function describeDestination(path: string) {
  if (path.startsWith("/survey")) return "assessment readiness";
  if (path.startsWith("/results")) return "results";
  if (path.startsWith("/outputs")) return "outputs";
  if (path.startsWith("/profiles")) return "profile";
  if (path.startsWith("/platform")) return "PAT workspace";
  return "platform home";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const callbackUrl = getSingleParam(resolvedSearchParams?.callbackUrl);
  const redirectTo = getSingleParam(resolvedSearchParams?.redirectTo);
  const safeRedirect = sanitizeRedirect(redirectTo ?? callbackUrl);
  const destinationLabel = describeDestination(safeRedirect);

  return (
    <section className="mx-auto max-w-4xl">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <div className="pat-card-strong p-8">
          <div className="pat-label text-white/58">
            PAT Access
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Sign in once, return to the exact protected step you meant to reach.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/74">
            PAT uses callback-safe redirects so login remains quiet and predictable. After authentication, you will return directly to {destinationLabel}.
          </p>
          <div className="mt-8 rounded-[22px] border border-white/12 bg-white/6 p-5">
            <div className="pat-label text-white/58">
              Redirect target
            </div>
            <div className="pat-sans mt-2 text-lg font-semibold text-white">{safeRedirect}</div>
            <div className="mt-2 text-sm leading-6 text-white/68">
              Only relative in-product paths are honored. External redirect targets are discarded.
            </div>
          </div>
        </div>

        <div className="pat-card p-8">
          <div className="pat-label">
            Sign in
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Use your approved GitHub account
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            Access is currently restricted to approved PAT participants. Once authenticated, the platform will prepare your company context and move you into the intended workflow.
          </p>

          <form
            className="mt-8"
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: safeRedirect });
            }}
          >
            <button
              type="submit"
              className="pat-button-primary w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-accent)]"
            >
              Continue with GitHub
            </button>
          </form>

          <div className="pat-soft-panel mt-6 p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Returning path: <span className="font-semibold text-[var(--shell-ink)]">{destinationLabel}</span>
          </div>

          <Link href="/" className="pat-link mt-5 inline-flex">
            Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}
