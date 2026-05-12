import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getResolvedAuthEnv } from "@/lib/auth/env";
import { getMacMiniOperatorState } from "@/lib/macMiniOperatorState";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function buildResponseBody(ok: boolean, operator: Awaited<ReturnType<typeof getMacMiniOperatorState>>) {
  const authEnv = getResolvedAuthEnv();

  return {
    ok,
    service: "db-health",
    timestamp: new Date().toISOString(),
    operator,
    release: operator.release,
    chatops: {
      enabled: operator.chatops.enabled,
      loaded: operator.chatops.loaded,
      latestChatopsAudit: operator.chatops.latestAudit,
      watchdogState: operator.watchdog.status
        ? [
            `STATUS=${operator.watchdog.status}`,
            `REASON=${operator.watchdog.reason ?? ""}`,
            `UPDATED_AT=${operator.watchdog.updatedAt ?? ""}`,
          ].filter((line) => !line.endsWith("="))
        : [],
      latestNightlySummary: operator.nightly?.rawLines.slice(0, 10) ?? [],
      launchReadiness: operator.launchReadiness,
    },
    auth: {
      authUrl: authEnv.normalizedBaseUrl,
      expectedProductionOrigin: authEnv.expectedProductionOrigin,
      productionAuthReady: authEnv.productionAuthReady,
      warnings: authEnv.warnings,
    },
  };
}

export async function GET() {
  const operator = await getMacMiniOperatorState();

  try {
    await prisma.$queryRaw`SELECT 1 as ok`;
    return NextResponse.json(buildResponseBody(true, operator), { headers: NO_STORE_HEADERS });
  } catch {
    return NextResponse.json(
      {
        ...buildResponseBody(false, operator),
        error: "Database unavailable",
      },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }
}
