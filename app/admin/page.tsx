export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/auth/session"
import { isAdminRole } from "@/lib/authz"
import { redirect } from "next/navigation"

type SearchParams = Record<string, string | string[] | undefined>

function getSingleParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value
  if (Array.isArray(value) && typeof value[0] === "string") return value[0]
  return null
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    redirect("/login?callbackUrl=%2Fadmin")
  }

  const isAdmin = isAdminRole(sessionUser.role)
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const actionError = getSingleParam(resolvedSearchParams?.error)

async function createOrganization(formData: FormData) {
  'use server'

  const actor = await getSessionUser()
  if (!actor) {
    redirect("/login?callbackUrl=%2Fadmin")
  }

  if (!isAdminRole(actor.role)) {
    redirect("/admin?error=forbidden_action")
  }

  const name = formData.get("name") as string
  const type = formData.get("type") as "FIRM" | "VENDOR"

  if (!name || !type) return

  await prisma.company.create({
    data: {
      id: crypto.randomUUID(),
      name,
      type,
      updatedAt: new Date(),
    },
  })
}

  if (!isAdmin) {
    return (
      <div style={{ padding: "40px" }}>
        <h1>Admin Panel</h1>
        <div style={{ marginTop: "16px", opacity: 0.8 }}>
          Access denied. Admin or owner role required.
        </div>
      </div>
    )
  }

  const orgs = await prisma.company.findMany()

  return (

    <div style={{ padding: "40px" }}>
      <h1>Admin Panel</h1>

      {actionError ? (
        <div style={{ marginTop: "12px", color: "crimson" }}>
          Action denied: insufficient permissions.
        </div>
      ) : null}

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

      {orgs.map((org: any) => (
        <div
          key={org.id}
          style={{
            border: "1px solid #ccc",
            padding: "16px",
            marginBottom: "12px",
            borderRadius: "8px"
          }}
        >
          <strong>{org.name}</strong>
          <div>Type: {org.type}</div>

        </div>
      ))}
    </div>
  )
}


















