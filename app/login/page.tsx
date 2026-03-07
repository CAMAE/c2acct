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

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const callbackUrl = getSingleParam(resolvedSearchParams?.callbackUrl);
  const redirectTo = getSingleParam(resolvedSearchParams?.redirectTo);
  const safeRedirect = sanitizeRedirect(redirectTo ?? callbackUrl);

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-black/10 bg-white/80 p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
      <p className="mt-3 text-sm text-slate-700">
        Beta access is restricted to pre-approved GitHub accounts.
      </p>

      <form
        className="mt-6"
        action={async () => {
          "use server";
          await signIn("github", { redirectTo: safeRedirect });
        }}
      >
        <button
          type="submit"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-80"
        >
          Continue with GitHub
        </button>
      </form>
    </section>
  );
}
