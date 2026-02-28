import { prisma } from "@/lib/prisma"

export default async function AdminPage() {

async function createOrganization(formData: FormData) {
  'use server'

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

  const orgs = await prisma.company.findMany()

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

      {orgs.map(org => (
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
















