import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

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
      return NextResponse.json(
        { ok: false, error: "Module not found" },
        { status: 404, headers: NO_STORE_HEADERS }
      );
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

    return NextResponse.json({ ...mod, questions }, { headers: NO_STORE_HEADERS });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
