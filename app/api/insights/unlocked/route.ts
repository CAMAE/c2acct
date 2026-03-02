import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const companyId = searchParams.get("companyId");

	if (!companyId) {
		return NextResponse.json({ ok: false, error: "companyId required" }, { status: 400 });
	}

	const scoreRows = await prisma.companyCapabilityScore.findMany({
		where: { companyId, scoreVersion: 1 },
		select: { nodeId: true, score: true },
	});

	const capabilityScores = Object.fromEntries(
		scoreRows.map((row: { nodeId: string; score: number }) => [row.nodeId, row.score])
	);

	const insights = await prisma.insight.findMany({
		where: { active: true },
		include: {
			InsightCapabilityRule: {
				include: {
					CapabilityNode: true
				}
			}
		}
	});

	const evaluated = insights.map((insight: { id: string; key: string; title: string; body: string; tier: number; unlockRules?: { type: string; nodeId?: string | null; minScore?: number | null }[] }) => {
		const rules = insight.InsightCapabilityRule;

		const unlocked = rules.every((rule: { type: string; nodeId?: string | null; minScore?: number | null }) => {
			const companyScoreForNode = capabilityScores[rule.nodeId] ?? 0;
			return rule.required
				? companyScoreForNode >= rule.minScore
				: true;
		});

		return {
			id: insight.id,
			key: insight.key,
			title: insight.title,
			body: insight.body,
			tier: insight.tier,
			unlocked
		};
	});

	return NextResponse.json({ ok: true, insights: evaluated });
}

