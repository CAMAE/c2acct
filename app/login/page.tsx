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
    <section className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-3 text-sm text-white/70">
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
          className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
        >
          Continue with GitHub
        </button>
      </form>
    </section>
  );
}
