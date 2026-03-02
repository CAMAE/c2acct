import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type ScoreRow = { nodeId: string; score: number };

type RuleRow = {
  id: string;
  nodeId: string;
  minScore: number;
  required: boolean;
  CapabilityNode: { id: string; key: string; title: string } | null;
};

type InsightRow = {
  id: string;
  key: string;
  title: string;
  body: string;
  tier: number;
  InsightCapabilityRule: RuleRow[];
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId");

  if (!companyId) {
    return NextResponse.json({ ok: false, error: "companyId required" }, { status: 400 });
  }

  const scoreRows = (await prisma.companyCapabilityScore.findMany({
    where: { companyId, scoreVersion: 1 },
    select: { nodeId: true, score: true },
  })) as unknown as ScoreRow[];

  const capabilityScores: Record<string, number> = {};
  for (const r of scoreRows) capabilityScores[r.nodeId] = r.score;

  const insights = (await prisma.insight.findMany({
    where: { active: true },
    include: {
      InsightCapabilityRule: {
        include: { CapabilityNode: { select: { id: true, key: true, title: true } } },
      },
    },
    orderBy: [{ tier: "asc" }, { key: "asc" }],
  })) as unknown as InsightRow[];

  const evaluated = insights.map((insight) => {
    const rules = insight.InsightCapabilityRule ?? [];
    const requiredRules = rules.filter((r) => r.required);

    let unlocked = true;
    let lockedReason: string | null = null;
    const ruleStatus = requiredRules.map((r) => {
      const nodeId = r.nodeId;
      const minScore = r.minScore ?? 0;
      const score = capabilityScores[nodeId] ?? 0;
      const pass = score >= minScore;

      if (!pass && unlocked) {
        unlocked = false;
        const label = r.CapabilityNode?.title ?? r.CapabilityNode?.key ?? nodeId;
        lockedReason = `Requires ${label} >= ${minScore}`;
      }

      return {
        nodeId,
        nodeKey: r.CapabilityNode?.key ?? null,
        nodeTitle: r.CapabilityNode?.title ?? null,
        minScore,
        score,
        pass,
      };
    });

    return {
      id: insight.id,
      key: insight.key,
      title: insight.title,
      body: insight.body,
      tier: insight.tier,
      unlocked,
      lockedReason,
      ruleStatus,
    };
  });

  return NextResponse.json({ ok: true, companyId, insights: evaluated });
}
