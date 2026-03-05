import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
const mod = await prisma.surveyModule.findUnique({
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

    if (!mod) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    const questions = await prisma.surveyQuestion.findMany({
      where: { moduleId: mod.id },
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

    return NextResponse.json({ ...mod, questions });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "Server error", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

