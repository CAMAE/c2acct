export const dynamic = "force-dynamic";

import { forbidden, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/authz";

type CompanyType = "FIRM" | "VENDOR";
type CompanyListItem = {
  id: string;
  name: string;
  type: CompanyType;
};

export default async function AdminPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/login?callbackUrl=%2Fadmin");
  }

  if (!isAdminRole(sessionUser.role)) {
    forbidden();
  }

  async function createOrganization(formData: FormData) {
    "use server";

    const actor = await getSessionUser();
    if (!actor) {
      redirect("/login?callbackUrl=%2Fadmin");
    }

    if (!isAdminRole(actor.role)) {
      forbidden();
    }

    const name = String(formData.get("name") ?? "").trim();
    const typeValue = String(formData.get("type") ?? "").trim();

    if (!name || (typeValue !== "FIRM" && typeValue !== "VENDOR")) {
      return;
    }

    await prisma.company.create({
      data: {
        id: crypto.randomUUID(),
        name,
        type: typeValue as CompanyType,
        updatedAt: new Date(),
      },
    });
  }

  const orgs: CompanyListItem[] = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      type: true,
    },
  });

  return (
    <div style={{ padding: "40px" }}>
      <h1>Admin Panel</h1>

      <h2>Create Company</h2>
      <form action={createOrganization}>
        <input name="name" placeholder="Company Name" required />
        <select name="type">
          <option value="FIRM">FIRM</option>
          <option value="VENDOR">VENDOR</option>
        </select>
        <button type="submit">Create</button>
      </form>

      <h2 style={{ marginTop: "40px" }}>Organizations</h2>

      {orgs.map((org: CompanyListItem) => (
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
