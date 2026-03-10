require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

const BACKUP_FILE = process.env.USER_COMPANY_BACKUP_FILE || path.join("scripts", ".tmp-user-company-backup.json");

(async () => {
  if (!fs.existsSync(BACKUP_FILE)) {
    throw new Error(`Backup file not found: ${BACKUP_FILE}`);
  }

  const raw = fs.readFileSync(BACKUP_FILE, "utf8");
  const backup = JSON.parse(raw);

  const userId = typeof backup?.userId === "string" ? backup.userId : "";
  const previousCompanyId =
    typeof backup?.previousCompanyId === "string" && backup.previousCompanyId.trim()
      ? backup.previousCompanyId.trim()
      : null;

  if (!userId) {
    throw new Error("Invalid backup: missing userId");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { companyId: previousCompanyId },
    select: { id: true, email: true, companyId: true },
  });

  console.log(JSON.stringify({
    ok: true,
    backupFile: BACKUP_FILE,
    restoredUser: updated,
  }, null, 2));
})()
  .catch((e) => {
    console.error(e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
