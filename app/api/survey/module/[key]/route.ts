import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;

    const surveyModule = await prisma.surveyModule.findUnique({
      where: { key },
      select: {
        id: true,
        key: true,
        title: true,
        description: true,
        scope: true,
        version: true,
      },
    });

    if (!surveyModule) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    const questions = await prisma.surveyQuestion.findMany({
      where: { moduleId: surveyModule.id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        key: true,
        prompt: true,
        inputType: true,
        weight: true,
        order: true,
      },
    });

    return NextResponse.json({ ...surveyModule, questions });
  } catch (e: unknown) {
    console.error(e);
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Server error", detail },
      { status: 500 }
    );
  }
}
