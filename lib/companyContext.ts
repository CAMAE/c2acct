import { cookies } from "next/headers";

export type SearchParamsLike =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | undefined;

function getQueryCompanyId(searchParams: SearchParamsLike): string | null {
  if (!searchParams) return null;

  if (searchParams instanceof URLSearchParams) {
    const v = searchParams.get("companyId");
    return v ? v : null;
  }

  const v = searchParams.companyId;
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return null;
}

export async function resolveCompanyId(searchParams?: SearchParamsLike) {
  const fromQuery = getQueryCompanyId(searchParams);
  if (fromQuery) return fromQuery;

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("aae_companyId")?.value;
  if (fromCookie) return fromCookie;

  return null;
}


