import { Prisma } from "@prisma/client";

const m = Prisma.dmmf.datamodel.models.find(x => x.name === "CompanyBadge");
if (!m) {
  console.log("CompanyBadge model not found in Prisma.dmmf");
  process.exit(1);
}

console.log("CompanyBadge fields:");
for (const f of m.fields) {
  const rel = f.kind === "object" ? ` -> ${f.type} (${(f.relationFromFields||[]).join(",")})` : "";
  console.log(`- ${f.name} [${f.kind}]${rel}`);
}