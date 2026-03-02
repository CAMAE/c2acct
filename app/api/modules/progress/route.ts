import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ ok: false, error: "companyId required" }, { status: 400 });
  }

  const mods = await prisma.surveyModule.findMany({
    where: { active: true },
    orderBy: { key: "asc" },
    select: { id: true, key: true, title: true },
  });

  const submissions = await prisma.surveySubmission.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    select: { moduleId: true, createdAt: true },
  });

  const latestByModule: Record<string, string> = {};
  for (const s of submissions) {
    if (!latestByModule[s.moduleId]) latestByModule[s.moduleId] = s.createdAt.toISOString();
  }

  const modules = mods.map((m) => ({
    key: m.key,
    title: m.title,
    submitted: !!latestByModule[m.id],
    lastSubmittedAt: latestByModule[m.id] ?? null,
  }));

  // Tier1 gate: require at least one submission for firm_alignment_v1
  const requiredTier1Complete = modules.some((m) => m.key === "firm_alignment_v1" && m.submitted);

  return NextResponse.json({ ok: true, companyId, requiredTier1Complete, modules });
}
