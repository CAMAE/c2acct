import { redirect } from "next/navigation";
import { buildCanonicalSignInPath } from "@/lib/auth/routes";

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  redirect(
    buildCanonicalSignInPath({
      callbackUrl: getSingleParam(resolvedSearchParams?.callbackUrl),
      redirectTo: getSingleParam(resolvedSearchParams?.redirectTo),
      authReset: getSingleParam(resolvedSearchParams?.authReset),
      authResetReason: getSingleParam(resolvedSearchParams?.authResetReason),
      error: getSingleParam(resolvedSearchParams?.error),
      view: getSingleParam(resolvedSearchParams?.view),
    })
  );
}
