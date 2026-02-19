import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const ScoreInputSchema = z.object({
  revenueVolatility: z.number().min(0).max(1),
  clientResponsiveness: z.number().min(0).max(1),
  techStackFragmentation: z.number().min(0).max(1),
  scopeCreep: z.number().min(0).max(1),
});

type ScoreInput = z.infer<typeof ScoreInputSchema>;

function computeRiskScore(input: ScoreInput) {
  return 0.5 * input.revenueVolatility + 0.3 * input.scopeCreep + 0.2 * input.techStackFragmentation;
}

function computeStabilityScore(input: ScoreInput) {
  return input.clientResponsiveness;
}

function computeComplexityScore(input: ScoreInput) {
  return 0.8 * input.techStackFragmentation + 0.2 * input.scopeCreep;
}

function computeDriftScore(input: ScoreInput) {
  return 0.5 * input.techStackFragmentation + 0.5 * input.scopeCreep;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: engagementId } = await params;

    if (!engagementId) {
      return NextResponse.json({ success: false, error: "Missing engagement id" }, { status: 400 });
    }

    const profile = await prisma.alignmentProfile.findUnique({
      where: { engagementId },
    });

    if (!profile) {
      return NextResponse.json({ success: false, error: "AlignmentProfile not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile });
  } catch (err: any) {
    console.error("GET score failed:", err);
    return NextResponse.json(
      { success: false, error: "GET score failed", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: engagementId } = await params;

    if (!engagementId) {
      return NextResponse.json({ success: false, error: "Missing engagement id" }, { status: 400 });
    }

    const raw = await req.json();
    const parsed = ScoreInputSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid scoring payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const input = parsed.data;

    const engagement = await prisma.engagement.findUnique({
      where: { id: engagementId },
      select: { id: true },
    });

    if (!engagement) {
      return NextResponse.json({ success: false, error: "Engagement not found" }, { status: 404 });
    }

    const riskScore = computeRiskScore(input);
    const stabilityScore = computeStabilityScore(input);
    const complexityScore = computeComplexityScore(input);
    const driftScore = computeDriftScore(input);

    const profile = await prisma.alignmentProfile.upsert({
      where: { engagementId },
      create: {
        engagementId,
        riskScore,
        stabilityScore,
        complexityScore,
        driftScore,
        notes: `Inputs: revenueVolatility=${input.revenueVolatility}, clientResponsiveness=${input.clientResponsiveness}, techStackFragmentation=${input.techStackFragmentation}, scopeCreep=${input.scopeCreep}`,
      },
      update: {
        riskScore,
        stabilityScore,
        complexityScore,
        driftScore,
        notes: `Inputs: revenueVolatility=${input.revenueVolatility}, clientResponsiveness=${input.clientResponsiveness}, techStackFragmentation=${input.techStackFragmentation}, scopeCreep=${input.scopeCreep}`,
      },
    });

    return NextResponse.json({ success: true, profile });
  } catch (err: any) {
    console.error("POST score failed:", err);
    return NextResponse.json(
      { success: false, error: "POST score failed", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
