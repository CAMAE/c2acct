import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export async function resolveCompanyId(searchParams?: URLSearchParams) {
  const fromQuery = searchParams?.get("companyId");
  if (fromQuery) return fromQuery;

  const c = cookies();
  const fromCookie = c.get("aae_companyId")?.value;
  if (fromCookie) return fromCookie;

  // DEV fallback: first company
  const first = await prisma.company.findFirst({ select: { id: true } });
  return first?.id ?? null;
}
