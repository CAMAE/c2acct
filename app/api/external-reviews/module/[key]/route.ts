import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { unauthorizedResponse } from "@/lib/authz";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  try {
    const { key } = await params;
    const moduleRecord = await prisma.surveyModule.findUnique({
      where: { key },
      select: {
        id: true,
        key: true,
        title: true,
        description: true,
        scope: true,
        version: true,
        active: true,
        axis: true,
      },
    });

    if (!moduleRecord || !moduleRecord.active || moduleRecord.axis !== "EXTERNAL_REVIEW") {
      return NextResponse.json(
        { ok: false, error: "Module not found" },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    const questions = await prisma.surveyQuestion.findMany({
      where: { moduleId: moduleRecord.id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        key: true,
        prompt: true,
        inputType: true,
        weight: true,
        order: true,
        required: true,
        meta: true,
      },
    });

    return NextResponse.json(
      {
        id: moduleRecord.id,
        key: moduleRecord.key,
        title: moduleRecord.title,
        description: moduleRecord.description,
        scope: moduleRecord.scope,
        version: moduleRecord.version,
        axis: moduleRecord.axis,
        questions,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
