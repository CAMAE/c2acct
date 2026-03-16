export const dynamic = "force-dynamic";

import type { CompanyType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/authz";
import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

type CompanyListItem = {
  id: string;
  name: string;
  type: CompanyType;
};

function getSingleParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

async function createCompany(formData: FormData) {
  "use server";

  const actor = await getSessionUser();
  if (!actor) {
    redirect("/login?callbackUrl=%2Fadmin");
  }

  if (!isPlatformAdmin(actor)) {
    redirect("/admin?error=forbidden_action");
  }

  const rawName = formData.get("name");
  const rawType = formData.get("type");

  const name = typeof rawName === "string" ? rawName.trim() : "";
  const type = rawType === "FIRM" || rawType === "VENDOR" ? rawType : null;

  if (!name || !type) return;

  await prisma.company.create({
    data: {
      id: crypto.randomUUID(),
      name,
      type,
      updatedAt: new Date(),
    },
  });
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/login?callbackUrl=%2Fadmin");
  }

  const isAdmin = isPlatformAdmin(sessionUser);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const actionError = getSingleParam(resolvedSearchParams?.error);

  if (!isAdmin) {
    redirect("/");
  }

  const orgs: CompanyListItem[] = await prisma.company.findMany({
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });

  return (
    <div style={{ padding: "40px" }}>
      <h1>Admin Panel</h1>

      {actionError ? (
        <div style={{ marginTop: "12px", color: "crimson" }}>
          Action denied: insufficient permissions.
        </div>
      ) : null}

      <h2>Create Company</h2>
      <form action={createCompany}>
        <input name="name" placeholder="Company Name" required />
        <select name="type" defaultValue="FIRM">
          <option value="FIRM">FIRM</option>
          <option value="VENDOR">VENDOR</option>
        </select>
        <button type="submit">Create</button>
      </form>

      <h2 style={{ marginTop: "40px" }}>Organizations</h2>

      {orgs.map((org) => (
        <div
          key={org.id}
          style={{
            border: "1px solid #ccc",
            padding: "16px",
            marginBottom: "12px",
            borderRadius: "8px",
          }}
        >
          <strong>{org.name}</strong>
          <div>Type: {org.type}</div>
        </div>
      ))}
    </div>
  );
}
