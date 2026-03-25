import { cookies } from "next/headers";
import { PAT_COOKIE_KEYS, readSelectedCompanyId } from "@/lib/platformRollout";

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

function getQuerySubjectId(searchParams: SearchParamsLike): string | null {
  if (!searchParams) return null;

  if (searchParams instanceof URLSearchParams) {
    const v = searchParams.get("subjectId");
    return v ? v : null;
  }

  const v = searchParams.subjectId;
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return null;
}

export async function resolveSelectedScope(searchParams?: SearchParamsLike) {
  const subjectId = getQuerySubjectId(searchParams);
  const companyId = getQueryCompanyId(searchParams);

  if (subjectId || companyId) {
    return { subjectId, companyId };
  }

  const cookieStore = await cookies();
  const fromSubjectCookie = cookieStore.get(PAT_COOKIE_KEYS.subjectSelection)?.value ?? null;
  const fromCompanyCookie = readSelectedCompanyId(cookieStore);

  return {
    subjectId: fromSubjectCookie,
    companyId: fromCompanyCookie,
  };
}

export async function resolveCompanyId(searchParams?: SearchParamsLike) {
  const selection = await resolveSelectedScope(searchParams);
  return selection.companyId;
}
