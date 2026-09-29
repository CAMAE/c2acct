/**
 * 3e (R51) — local/preview seed for the Enterprise portal v0. Idempotent (stable ids).
 *
 *   node --import tsx scripts/seed/enterprise-v0.ts [--accounts ~/work/preview-accounts.txt]
 *
 * Creates the Enterprise "Meridian Group" owning the two demo vendor companies
 * (Meridian Practice Cloud, Bridgepath Suite), two OWNER members with generated
 * temporary passwords (written ONLY to the accounts file, mode 600, never printed),
 * and a third demo vendor the enterprise does NOT own — "Northwind Ledger", one
 * product, one firm, one firm review and a vendor self-assessment — so the channel
 * market view has an unowned competitor with a score and n to prove the neutrality
 * rule against. Demo data boundary throughout; nothing outside the demo pool is touched.
 */
import { randomUUID } from "crypto";
import { appendFileSync, chmodSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { DataBoundary, PrismaClient } from "@prisma/client";
import { loadEnv } from "../_shared/prismaScript";
loadEnv();
import { DEMO_PAT_FIRMS, DEMO_PAT_VENDORS, type DemoFirmInput, type DemoVendorInput } from "@/data/demoPatEcosystem";
import {
  ensureFirm,
  ensureProduct,
  ensureResearchSource,
  ensureVendor,
  seedFirmProductAssessment,
  seedVendorProductAssessment,
  stableId,
} from "@/lib/demoPatEcosystemSeed";
import { ensureFirmProductModule } from "@/lib/firmPat";
import { ensureVendorProductModule } from "@/lib/vendorPat";
import { hashPilotPassword } from "@/lib/auth/passwords";
import { generateTemporaryPassword } from "@/lib/provisioning/account";

const ENTERPRISE = { slug: "meridian-group", name: "Meridian Group" };
const OWNED_VENDOR_IDS = ["demo-vendor-company-demo-expand-vendor-meridian", "demo-vendor-company-demo-bench-vendor-bridgepath"];
const OWNED_VENDOR_NAMES = ["Meridian Practice Cloud", "Bridgepath Suite"];
const MEMBERS = ["cameron+enterprise@garrettandgarrett.info", "lesliegarrettphd+enterprise@gmail.com"];
const NORTHWIND_KEY = "northwind-ledger";
export const NORTHWIND_FIRM_NAME = "Copperfield & Vance CPAs";

function accountsPath() {
  const i = process.argv.indexOf("--accounts");
  return (i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : path.join(process.env.HOME ?? "~", "work", "preview-accounts.txt")).replace(/^~/, process.env.HOME ?? "~");
}

async function main() {
  const prisma = new PrismaClient();
  const template = DEMO_PAT_VENDORS[0];
  const productTemplate = template.products[0];
  const firmTemplate = DEMO_PAT_FIRMS[0];
  const northwind: DemoVendorInput = {
    ...template,
    key: NORTHWIND_KEY,
    displayName: "Northwind Ledger",
    website: "https://northwind-ledger.pat.local",
    products: [
      {
        ...productTemplate,
        key: "northwind-ledger-core",
        name: "Northwind Ledger Core",
        category: productTemplate.category,
        websitePath: "/ledger-core",
        summary: "General ledger and close automation for mid-size firms (demo competitor for the enterprise market view).",
        scoreTarget: 78,
      },
    ],
  };
  const northwindFirm: DemoFirmInput = {
    ...firmTemplate,
    key: "copperfield-vance",
    displayName: NORTHWIND_FIRM_NAME,
    scoreTarget: 74,
  };

  // 1. Enterprise + ownership of the two demo vendors.
  const enterprise = await prisma.enterprise.upsert({
    where: { slug: ENTERPRISE.slug },
    update: { name: ENTERPRISE.name },
    create: { id: stableId("demo-enterprise", ENTERPRISE.slug), slug: ENTERPRISE.slug, name: ENTERPRISE.name },
    select: { id: true, name: true },
  });
  const owned = await prisma.company.findMany({ where: { OR: [{ id: { in: OWNED_VENDOR_IDS } }, { name: { in: OWNED_VENDOR_NAMES } }], type: "VENDOR" }, select: { id: true, name: true } });
  if (owned.length !== 2) throw new Error(`expected the two demo vendor companies, found ${owned.map((c) => c.name).join(", ") || "none"}`);
  await prisma.company.updateMany({ where: { id: { in: owned.map((c) => c.id) } }, data: { enterpriseId: enterprise.id } });

  // 2. Northwind Ledger — unowned competitor: vendor, product, self-assessment, firm, ecosystem, one firm review.
  const source = await ensureResearchSource(prisma);
  const seededVendor = await ensureVendor(prisma, { vendor: northwind, vendorIndex: 90, sourceId: source.id });
  const product = await ensureProduct(prisma, {
    vendor: northwind,
    vendorCompanyId: seededVendor.company.id,
    vendorProfileId: seededVendor.vendorProfile.id,
    product: northwind.products[0],
    productIndex: 90,
    sourceId: source.id,
  });
  const [vendorModule, firmModule] = await Promise.all([ensureVendorProductModule(), ensureFirmProductModule()]);
  await seedVendorProductAssessment(prisma, { product, moduleId: vendorModule.id, moduleVersion: vendorModule.version ?? 1, productIndex: 90 });
  const firm = await ensureFirm(prisma, northwindFirm);
  const ecosystem = await prisma.ecosystem.upsert({
    where: { vendorCompanyId: seededVendor.company.id },
    update: { name: "Northwind Ledger Ecosystem", updatedAt: new Date() },
    create: { id: stableId("demo-ecosystem", NORTHWIND_KEY), name: "Northwind Ledger Ecosystem", vendorCompanyId: seededVendor.company.id, updatedAt: new Date() },
    select: { id: true },
  });
  await prisma.ecosystemFirm.upsert({
    where: { firmCompanyId: firm.company.id },
    update: { ecosystemId: ecosystem.id },
    create: { ecosystemId: ecosystem.id, firmCompanyId: firm.company.id },
  });
  await seedFirmProductAssessment(prisma, { firm: northwindFirm, firmCompanyId: firm.company.id, product, moduleId: firmModule.id, moduleVersion: firmModule.version ?? 1, relationshipIndex: 90 });
  await prisma.company.updateMany({ where: { id: { in: [seededVendor.company.id, firm.company.id] } }, data: { dataBoundary: DataBoundary.DEMO } });
  if ((await prisma.company.findUnique({ where: { id: seededVendor.company.id }, select: { enterpriseId: true } }))?.enterpriseId) throw new Error("Northwind must not be owned");

  // 3. Members with temporary passwords → accounts file only.
  const out = accountsPath();
  const existing = existsSync(out) ? readFileSync(out, "utf8") : "";
  const lines: string[] = [];
  for (const email of MEMBERS) {
    const password = generateTemporaryPassword();
    const passwordHash = await hashPilotPassword(password);
    const now = new Date();
    const user = await prisma.user.upsert({
      where: { email },
      update: { role: "MEMBER", companyId: null, passwordHash, mustChangePassword: true, passwordUpdatedAt: now, updatedAt: now },
      create: { id: randomUUID(), email, name: `${email.split("@")[0].split("+")[0]} (enterprise)`, role: "MEMBER", companyId: null, passwordHash, mustChangePassword: true, passwordUpdatedAt: now, updatedAt: now },
      select: { id: true },
    });
    await prisma.enterpriseMembership.upsert({
      where: { enterpriseId_userId: { enterpriseId: enterprise.id, userId: user.id } },
      update: { role: "OWNER" },
      create: { enterpriseId: enterprise.id, userId: user.id, role: "OWNER" },
    });
    if (!existing.includes(email)) lines.push(`${email.padEnd(44)} ${password}   # enterprise ${ENTERPRISE.name} (OWNER) · local seed ${new Date().toISOString().slice(0, 10)}`);
    else lines.push(`${email.padEnd(44)} ${password}   # enterprise ${ENTERPRISE.name} (OWNER) · re-issued ${new Date().toISOString().slice(0, 10)}`);
  }
  appendFileSync(out, `${lines.join("\n")}\n`);
  chmodSync(out, 0o600);

  console.log(`enterprise ${enterprise.name} (${enterprise.id}) owns: ${owned.map((c) => c.name).join(", ")}`);
  console.log(`unowned competitor: ${seededVendor.company.name} (${seededVendor.company.id}) · product ${product.id} · firm ${NORTHWIND_FIRM_NAME} (${firm.company.id}) · ecosystem ${ecosystem.id}`);
  console.log(`members: ${MEMBERS.join(", ")} → OWNER; temporary passwords written to ${out} (mode 600)`);
  await prisma.$disconnect();
}

void main().catch((error) => { console.error(error); process.exit(1); });
