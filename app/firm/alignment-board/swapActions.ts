"use server";

import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { resolveCompanyBoundary } from "@/lib/dataBoundary";

/**
 * Log a staged Sandbox swap (Elite Insights v2, V2 demand signal). Fires from the
 * Alignment Board when a firm stages a candidate swap. Boundary-tagged so a demo
 * firm's swaps never enter a real vendor's demand signal. First-party intent data.
 * Best-effort: never throws into the board UI.
 */
export async function logSandboxSwap(input: {
  productInId: string;
  productOutId: string | null;
}): Promise<void> {
  try {
    const user = await getSessionUser();
    if (!user?.companyId || !input.productInId) return;
    const boundary = await resolveCompanyBoundary(user.companyId);
    const product = await prisma.product.findUnique({
      where: { id: input.productInId },
      select: { companyId: true },
    });
    await prisma.sandboxSwapEvent.create({
      data: {
        id: randomUUID(),
        companyId: user.companyId,
        productInId: input.productInId,
        productOutId: input.productOutId,
        vendorInId: product?.companyId ?? null,
        boundary,
      },
    });
  } catch {
    // Demand logging is best-effort; a failure must never break the Sandbox.
  }
}
