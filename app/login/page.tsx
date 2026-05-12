import { redirect } from "next/navigation";

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
  const params = new URLSearchParams();

  for (const key of ["callbackUrl", "redirectTo", "error", "authReset", "authResetReason"]) {
    const value = getSingleParam(resolvedSearchParams?.[key]);
    if (value) {
      params.set(key, value);
    }
  }

  redirect(`/sign-in${params.size > 0 ? `?${params.toString()}` : ""}`);
}
