import { PrismaClient, CompanyType } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

function pickEnumValue(enumObj, preferredKeys = []) {
  if (!enumObj || typeof enumObj !== "object") return null;
  for (const k of preferredKeys) if (k in enumObj) return enumObj[k];
  const vals = Object.values(enumObj);
  return vals.length ? vals[0] : null;
}

async function main() {
  const name = "Demo Company";
  const existing = await prisma.company.findFirst({ where: { name }, select: { id: true, name: true } });
  if (existing) {
    console.log("OK COMPANY", existing);
    return;
  }

  const type = pickEnumValue(CompanyType, ["FIRM", "VENDOR"]);
  if (!type) throw new Error("CompanyType enum has no values (cannot seed).");

  const created = await prisma.company.create({
    data: {
      id: randomUUID(),
      name,
      type,
      updatedAt: new Date(),
    },
    select: { id: true, name: true, type: true },
  });

  console.log("OK COMPANY", created);
}

main()
  .catch((e) => {
    console.error("SEED_ERROR", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
