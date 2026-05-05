import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import {
  PRODUCT_ASSESSMENT_SCALE_MAX,
  PRODUCT_ASSESSMENT_SCALE_MIN,
} from "@/lib/productAssessmentRuntime";
import { getVendorCompanyContext } from "@/lib/vendorPat";
import { buildFirmProductQuestions, submitFirmProductAssessment } from "@/lib/firmPat";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

const Schema = z.object({
  productId: z.string().min(1),
  answers: z.record(z.string(), z.number().min(PRODUCT_ASSESSMENT_SCALE_MIN).max(PRODUCT_ASSESSMENT_SCALE_MAX)),
});

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  if (!sessionUser.companyId) {
    return forbiddenResponse("Firm product assessment requires a firm company context");
  }

  const context = await getVendorCompanyContext(sessionUser.companyId);
  if (context.company?.type !== "FIRM") {
    return forbiddenResponse("Current account is not attached to a firm company");
  }

  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const { productId, answers } = parsed.data;
  const products = await (await import("@/lib/firmPat")).getFirmProductCatalog(context.company.id);
  const product = products.find((entry) => entry.id === productId);
  if (!product) {
    return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  if (!product.reviewAvailable) {
    return NextResponse.json(
      {
        ok: false,
        error: "Firm review opens only after the vendor completes the full product assessment.",
      },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const expected = buildFirmProductQuestions(product.utilityKeys);
  const answerKeys = Object.keys(answers);
  if (expected.length === 0) {
    return NextResponse.json(
      { ok: false, error: "This product has no declared features yet." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  if (answerKeys.length !== expected.length) {
    return NextResponse.json(
      { ok: false, error: "Complete every active product question before submitting." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const validIds = new Set(expected.map((question) => question.id));
  if (answerKeys.some((key) => !validIds.has(key))) {
    return NextResponse.json({ ok: false, error: "Invalid product assessment answers." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const submission = await submitFirmProductAssessment({
    companyId: context.company.id,
    productId,
    answers,
  });

  return NextResponse.json({ ok: true, submissionId: submission.id }, { headers: NO_STORE_HEADERS });
}
