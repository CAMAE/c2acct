import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { computeScore } from "@/lib/scoring";
import { evaluateSignalIntegrity } from "@/lib/signalIntegrity";
import { randomUUID } from "crypto";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import {
  requiresCompanyBackedAssessment,
  resolveAssessmentSubjectContext,
} from "@/lib/subjectContext";
import {
  isPrismaMissingSchemaError,
  warnPrismaCompatibilityOnce,
} from "@/lib/prisma-compat";
import {
  buildAssessmentRollups,
  extractNumericAnswers,
  normalizeQuestionRuntime,
  validateAnswer,
  type NormalizedAnswer,
} from "@/lib/assessmentRuntime";
import {
  COMPANY_CAPABILITY_SCORE_VERSION,
  computeCapabilityScores,
  getAssessmentScoreScale,
} from "@/lib/capabilityScoring";
import { writeCompanyCapabilityScores } from "@/lib/companyCapabilityScoreWrites";
import { recordPatDiagnostic } from "@/lib/patDiagnostics";
import { FIRM_MODULE_DEFINITIONS } from "@/lib/firmPat";
import { writeFirmMaturitySnapshot } from "@/lib/firmMaturity";
import { SURVEY_FINAL_SCORE_VERSION, getSurveyDraftWhere } from "@/lib/surveyDrafts";
import { consumeDurableRateLimit, rateLimitJsonResponse } from "@/lib/security/rateLimit";

const SUBMIT_WINDOW_MS = 60_000;
const SUBMIT_MAX_REQUESTS_PER_WINDOW = 20;
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

const SubmitSchema = z
  .object({
    moduleKey: z.string().min(1),
    answers: z.record(z.string(), z.unknown()),
  })
  .strict();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const CANONICAL_FIRM_MODULE_KEYS: ReadonlySet<string> = new Set(
  FIRM_MODULE_DEFINITIONS.map((module) => module.key)
);

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  const assessmentContext = await resolveAssessmentSubjectContext(sessionUser);
  if (!requiresCompanyBackedAssessment(assessmentContext)) {
    return forbiddenResponse("Current assessment flow requires a company-backed subject");
  }

  const effectiveCompanyId = assessmentContext.companyId;
  const submitRateLimitKey = `${sessionUser.id}:${assessmentContext.subjectId ?? effectiveCompanyId}`;
  const quota = await consumeDurableRateLimit({
    scope: "survey.submit",
    key: submitRateLimitKey,
    limit: SUBMIT_MAX_REQUESTS_PER_WINDOW,
    windowMs: SUBMIT_WINDOW_MS,
  });

  if (!quota.allowed) {
    return rateLimitJsonResponse(quota);
  }

  let raw: unknown;

  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  if (!isRecord(raw)) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  // Company authority is session-derived. Client-provided companyId is ignored if it matches;
  // mismatches are rejected to surface cross-tenant tampering attempts.
  const requestCompanyId = Object.prototype.hasOwnProperty.call(raw, "companyId")
    ? raw.companyId
    : undefined;

  if (requestCompanyId !== undefined) {
    if (typeof requestCompanyId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Invalid payload", detail: "companyId must be a string when provided" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    if (requestCompanyId !== effectiveCompanyId) {
      return forbiddenResponse("Company mismatch");
    }
  }

  const { companyId: _ignoredCompanyId, ...submitCandidate } = raw;
  void _ignoredCompanyId;

  const parsed = SubmitSchema.safeParse(submitCandidate);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const { moduleKey, answers: rawAnswers } = parsed.data;

  try {
    const surveyModule = await prisma.surveyModule.findUnique({
      where: { key: moduleKey },
      select: { id: true, version: true, active: true },
    });

    if (!surveyModule || !surveyModule.active) {
      return NextResponse.json(
        { ok: false, error: "Module not found" },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    const questionRecords = await prisma.surveyQuestion.findMany({
      where: { moduleId: surveyModule.id },
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
        sectionId: true,
        SurveySection: {
          select: {
            id: true,
            key: true,
            title: true,
            description: true,
            order: true,
            utilityFamily: true,
            utilityKey: true,
            utilityLabel: true,
            subcategoryKey: true,
            subcategoryTitle: true,
            basisKey: true,
          },
        },
      },
    });

    if (questionRecords.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Module has no questions" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const questions = questionRecords.map(normalizeQuestionRuntime);
    const allowedQuestionIds = new Set(questions.map((q) => q.id));
    const submittedQuestionIds = Object.keys(rawAnswers);

    const unknownAnswerIds = submittedQuestionIds.filter((questionId) => !allowedQuestionIds.has(questionId));
    if (unknownAnswerIds.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid payload",
          detail: "answers include question ids not in module",
          invalidQuestionIds: unknownAnswerIds,
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const requiredQuestionIds = questions.filter((q) => q.required).map((q) => q.id);
    const missingRequired = requiredQuestionIds.filter((questionId) => !Object.hasOwn(rawAnswers, questionId));
    if (missingRequired.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid payload",
          detail: "Missing required answers",
          missingQuestionIds: missingRequired,
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const answers: Record<string, NormalizedAnswer> = {};
    for (const questionId of submittedQuestionIds) {
      const question = questions.find((entry) => entry.id === questionId);
      if (!question) {
        return NextResponse.json(
          {
            ok: false,
            error: "Invalid payload",
            detail: `Question ${questionId} is not part of this module`,
          },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }

      const validated = validateAnswer(question, rawAnswers[questionId]);
      if (!validated.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: "Invalid payload",
            detail: `Invalid answer for question ${question.key}: ${validated.error}`,
          },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }

      if (validated.value !== null) {
        answers[questionId] = validated.value;
      }
    }

    const numericAnswers = extractNumericAnswers(questions, answers);
    const scoreScale = getAssessmentScoreScale(questions);
    const scoring = computeScore({
      answers: numericAnswers,
      scaleMin: scoreScale.min,
      scaleMax: scoreScale.max,
    });
    const rollups = buildAssessmentRollups(questions, answers);
    const integrity = evaluateSignalIntegrity(answers, {
      expectedQuestionCount: questions.length,
      scaleMin: scoreScale.min,
      scaleMax: scoreScale.max,
    });

  const invalidScoreSnapshot =
    !Number.isFinite(scoring.score) ||
    !Number.isFinite(scoring.totalWeight) ||
    !Number.isInteger(scoring.answeredCount) ||
    scoring.answeredCount <= 0 ||
    (scoring.weightedAvg !== null && !Number.isFinite(scoring.weightedAvg));

  if (invalidScoreSnapshot) {
    return NextResponse.json(
      { ok: false, error: "Invalid score output" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

    const capabilityMappings = CANONICAL_FIRM_MODULE_KEYS.has(moduleKey)
      ? await prisma.surveyQuestionCapability.findMany({
          where: {
            questionId: {
              in: questions.map((question) => question.id),
            },
          },
          select: {
            questionId: true,
            nodeId: true,
            weight: true,
            SurveyQuestion: {
              select: {
                key: true,
              },
            },
          },
        })
      : [];

    const capabilityScoring =
      CANONICAL_FIRM_MODULE_KEYS.has(moduleKey)
        ? computeCapabilityScores({
            questions,
            answers,
            mappings: capabilityMappings.map((mapping) => ({
              questionId: mapping.questionId,
              questionKey: mapping.SurveyQuestion.key,
              nodeId: mapping.nodeId,
              weight: mapping.weight,
            })),
          })
        : null;

    if (capabilityScoring && capabilityScoring.diagnostics.unmappedQuestionKeys.length > 0) {
      recordPatDiagnostic({
        area: "survey_submit",
        level: "warn",
        status: "warn",
        summary: "PAT firm submit encountered unmapped capability questions.",
        details: {
          moduleKey,
          unmappedQuestionKeys: capabilityScoring.diagnostics.unmappedQuestionKeys,
          unmappedQuestionCount: capabilityScoring.diagnostics.unmappedQuestionKeys.length,
        },
      });
    }
    if (capabilityScoring && capabilityScoring.diagnostics.questionsMissingScale.length > 0) {
      recordPatDiagnostic({
        area: "survey_submit",
        level: "warn",
        status: "warn",
        summary: "PAT firm submit encountered questions without a usable scoring scale.",
        details: {
          moduleKey,
          questionsMissingScale: capabilityScoring.diagnostics.questionsMissingScale,
        },
      });
    }

    let capabilityWriteStatus:
      | {
          scoreCount: number;
          createdCount: number;
          updatedCount: number;
          duplicateCleanupCount: number;
          scoreVersion: number;
          skipped?: boolean;
          compatibilityFallback?: boolean;
        }
      | null = null;

    const { submission, milestoneReached } = await prisma.$transaction(async (tx) => {
      let createdSubmission;
      try {
        createdSubmission = await tx.surveySubmission.create({
          data: {
            id: randomUUID(),
            companyId: effectiveCompanyId,
            subjectId: assessmentContext.subjectId,
            moduleId: surveyModule.id,
            version: surveyModule.version ?? 1,
            answers,
            // `score` remains the persisted raw normalized percent for threshold semantics.
            score: scoring.rawScorePct,
            weightedAvg: scoring.rawWeightedAvg,
            scoreVersion: SURVEY_FINAL_SCORE_VERSION,
            scaleMin: scoring.scaleMin,
            scaleMax: scoring.scaleMax,
            totalWeight: scoring.totalWeight,
            answeredCount: scoring.answeredCount,
            signalIntegrityScore: integrity.score,
            integrityFlags: integrity.flags,
          },
        });
      } catch (error) {
        if (assessmentContext.subjectId && isPrismaMissingSchemaError(error)) {
          warnPrismaCompatibilityOnce(
            "survey-submit-subjectid-missing",
            "SurveySubmission subject-aware writes are unavailable in the local database. Writing submissions in legacy company-backed compatibility mode until local Prisma migrations are applied."
          );
          recordPatDiagnostic({
            area: "db_compat",
            level: "warn",
            status: "compat",
            summary: "Survey submission write fell back to legacy company scope.",
            details: {
              moduleKey,
              subjectScoped: true,
            },
          });
          createdSubmission = await tx.surveySubmission.create({
            data: {
              id: randomUUID(),
              companyId: effectiveCompanyId,
              moduleId: surveyModule.id,
              version: surveyModule.version ?? 1,
              answers,
              score: scoring.rawScorePct,
              weightedAvg: scoring.rawWeightedAvg,
              scoreVersion: SURVEY_FINAL_SCORE_VERSION,
              scaleMin: scoring.scaleMin,
              scaleMax: scoring.scaleMax,
              totalWeight: scoring.totalWeight,
              answeredCount: scoring.answeredCount,
              signalIntegrityScore: integrity.score,
              integrityFlags: integrity.flags,
            },
          });
        } else {
          throw error;
        }
      }

      if (capabilityScoring) {
        try {
          capabilityWriteStatus = await writeCompanyCapabilityScores(tx, {
            companyId: effectiveCompanyId,
            scores: capabilityScoring.scores,
            scoreVersion: COMPANY_CAPABILITY_SCORE_VERSION,
          });
        } catch (error) {
          if (isPrismaMissingSchemaError(error)) {
            warnPrismaCompatibilityOnce(
              "survey-submit-company-capability-score-missing",
              "CompanyCapabilityScore writes are unavailable in the local database. Final PAT firm submissions will continue without persisted capability scores until local Prisma migrations are applied."
            );
            capabilityWriteStatus = {
              scoreCount: capabilityScoring.scores.length,
              createdCount: 0,
              updatedCount: 0,
              duplicateCleanupCount: 0,
              scoreVersion: COMPANY_CAPABILITY_SCORE_VERSION,
              compatibilityFallback: true,
            };
            recordPatDiagnostic({
              area: "db_compat",
              level: "warn",
              status: "compat",
              summary: "Capability-score persistence fell back to compatibility mode.",
              details: {
                moduleKey,
                scoreCount: capabilityScoring.scores.length,
              },
            });
          } else {
            recordPatDiagnostic({
              area: "capability_write",
              level: "error",
              status: "error",
              summary: "Capability-score persistence failed.",
              details: {
                moduleKey,
                scoreCount: capabilityScoring.scores.length,
              },
            });
            throw error;
          }
        }
      }

      let reached = false;
      const badgeRules = await tx.badgeRule.findMany({
        where: { moduleId: surveyModule.id },
        select: { badgeId: true, minScore: true, required: true },
      });

      for (const badgeRule of badgeRules) {
        if (!badgeRule.required) {
          continue;
        }

        const minScore = badgeRule.minScore ?? 0;
        // Badge thresholds are evaluated on canonical raw score percent.
        // Signal integrity is persisted separately for transparency/UI adjustment,
        // not for award gating semantics.
        if (createdSubmission.score < minScore) {
          continue;
        }

        try {
          await tx.companyBadge.upsert({
            where: {
              companyId_badgeId_moduleId: {
                companyId: effectiveCompanyId,
                badgeId: badgeRule.badgeId,
                moduleId: surveyModule.id,
              },
            },
            update: {},
            create: {
              id: randomUUID(),
              companyId: effectiveCompanyId,
              subjectId: assessmentContext.subjectId,
              badgeId: badgeRule.badgeId,
              moduleId: surveyModule.id,
            },
          });
        } catch (error) {
          if (assessmentContext.subjectId && isPrismaMissingSchemaError(error)) {
            warnPrismaCompatibilityOnce(
              "survey-submit-companybadge-subjectid-missing",
              "CompanyBadge subject-aware writes are unavailable in the local database. Awarding badges in legacy company-backed compatibility mode until local Prisma migrations are applied."
            );
            recordPatDiagnostic({
              area: "db_compat",
              level: "warn",
              status: "compat",
              summary: "Badge award write fell back to legacy company scope.",
              details: {
                moduleKey,
                badgeId: badgeRule.badgeId,
              },
            });
            await tx.companyBadge.upsert({
              where: {
                companyId_badgeId_moduleId: {
                  companyId: effectiveCompanyId,
                  badgeId: badgeRule.badgeId,
                  moduleId: surveyModule.id,
                },
              },
              update: {},
              create: {
                id: randomUUID(),
                companyId: effectiveCompanyId,
                badgeId: badgeRule.badgeId,
                moduleId: surveyModule.id,
              },
            });
          } else {
            throw error;
          }
        }

        reached = true;
      }

      // B5-5 (F3 Trajectory): on a final FIRM alignment-module submission, append a
      // maturity snapshot so real firms build honest history over time. Demo firms
      // are skipped inside the writer (their history is seeded).
      if (CANONICAL_FIRM_MODULE_KEYS.has(moduleKey)) {
        try {
          await writeFirmMaturitySnapshot(tx, effectiveCompanyId);
        } catch (error) {
          if (isPrismaMissingSchemaError(error)) {
            warnPrismaCompatibilityOnce(
              "survey-submit-maturity-snapshot-missing",
              "FirmMaturitySnapshot writes are unavailable in the local database. Trajectory history is skipped until local Prisma migrations are applied."
            );
          } else {
            throw error;
          }
        }
      }

      await tx.surveySubmission.deleteMany({
        where: getSurveyDraftWhere({
          companyId: effectiveCompanyId,
          subjectId: assessmentContext.subjectId,
          moduleId: surveyModule.id,
        }),
      });

      return { submission: createdSubmission, milestoneReached: reached };
    });

    recordPatDiagnostic({
      area: "survey_submit",
      level: "info",
      status: "ok",
      summary: "PAT survey final submit completed.",
      details: {
        moduleKey,
        rawScorePct: submission.score,
        answeredCount: submission.answeredCount,
        signalIntegrityScore: submission.signalIntegrityScore,
        milestoneReached,
        capabilityScoreCount: capabilityScoring?.scores.length ?? 0,
        unmappedQuestionCount: capabilityScoring?.diagnostics.unmappedQuestionKeys.length ?? 0,
        sectionCount: rollups.sections.length,
        utilityRollupCount: rollups.utilities.length,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        submission,
        milestoneReached,
        capabilityWriteStatus,
        capabilityScoring: capabilityScoring
          ? {
              scoreCount: capabilityScoring.scores.length,
              unmappedQuestionKeys: capabilityScoring.diagnostics.unmappedQuestionKeys,
              questionsMissingScale: capabilityScoring.diagnostics.questionsMissingScale,
            }
          : {
              scoreCount: 0,
              skipped: true,
            },
        evidence: {
          triggeringModules: [
            {
              key: moduleKey,
              score: submission.score,
            },
          ],
          sectionScores: rollups.sections,
          utilityScores: rollups.utilities,
          moduleScore: {
            key: moduleKey,
            score: scoring.rawScorePct,
            answeredCount: scoring.answeredCount,
            questionCount: questions.length,
          },
          confidenceNote:
            "Canonical module score remains the raw score percentage. Signal integrity remains separate and does not replace the module score.",
          explanationMetadata: {
            questionCount: questions.length,
            sectionCount: rollups.sections.length,
            utilityCount: rollups.utilities.length,
            confidenceMetric: "signalIntegrityScore",
          },
        },
      },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    recordPatDiagnostic({
      area: "survey_submit",
      level: "error",
      status: "error",
      summary: "PAT survey final submit failed.",
      details: {
        moduleKey,
        error:
          error instanceof Error
            ? error.message.slice(0, 180)
            : "Unexpected submit failure",
      },
    });
    throw error;
  }
}
