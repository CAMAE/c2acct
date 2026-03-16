import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getAssessmentModuleCatalogEntry,
  isRuntimeSurveyAvailableModule,
} from "@/lib/assessment-module-catalog";
import { isSupportedSurveyRuntimeInputType } from "@/lib/surveyRuntimeContract";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const moduleEntry = getAssessmentModuleCatalogEntry(key);

    if (!moduleEntry || !isRuntimeSurveyAvailableModule(moduleEntry)) {
      return NextResponse.json(
        { ok: false, error: "Module not found" },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    const mod = await prisma.surveyModule.findUnique({
      where: { key },
      select: {
        id: true,
        key: true,
        title: true,
        description: true,
        scope: true,
        version: true,
        active: true,
      },
    });

    if (!mod || !mod.active) {
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
        meta: true,
      },
    });

    const unsupportedQuestions = questions.filter(
      (question) => !isSupportedSurveyRuntimeInputType(question.inputType)
    );

    if (unsupportedQuestions.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Module uses unsupported runtime question types",
          unsupportedQuestionIds: unsupportedQuestions.map((question) => question.id),
        },
        { status: 409, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        id: mod.id,
        key: mod.key,
        title: mod.title,
        description: mod.description,
        scope: mod.scope,
        version: mod.version,
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
