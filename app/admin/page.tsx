import { prisma } from "@/lib/prisma"
import { OrganizationType } from "@prisma/client"

export default async function AdminPage() {

  async function createOrganization(formData: FormData) {
    "use server"

    const name = formData.get("name") as string
    const type = formData.get("type") as OrganizationType

    if (!name || !type) return

    await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name,
          type
        }
      })

      if (type === "FIRM") {
        await tx.firmProfile.create({
          data: {
            organizationId: org.id
          }
        })
      }

      if (type === "VENDOR") {
        await tx.vendorProfile.create({
          data: {
            organizationId: org.id
          }
        })
      }
    })
  }

  const orgs = await prisma.organization.findMany({
    include: {
      firmProfile: true,
      vendorProfile: true
    }
  })

  return (
    <div style={{ padding: "40px" }}>
      <h1>Admin Panel</h1>

      <h2>Create Organization</h2>
      <form action={createOrganization}>
        <input name="name" placeholder="Organization Name" required />
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
          <div>Firm Profile: {org.firmProfile ? "Yes" : "No"}</div>
          <div>Vendor Profile: {org.vendorProfile ? "Yes" : "No"}</div>
        </div>
      ))}
    </div>
  )
}

