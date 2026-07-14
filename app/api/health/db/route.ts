import { prisma } from "@/lib/prisma";
import { getPublicReleaseFingerprintView, getReleaseFingerprint } from "@/lib/release/fingerprint";
import { NextResponse } from "next/server";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  const timestamp = new Date().toISOString();
  const release = getPublicReleaseFingerprintView(getReleaseFingerprint());

  try {
    await prisma.$queryRaw`SELECT 1 as ok`;
    return NextResponse.json(
      {
        ok: true,
        service: "db-health",
        timestamp,
        release,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    // Classify without leaking the connection string: an ENGINE-missing failure
    // (PrismaClientInitializationError with engine/binary text) is a build/deploy
    // bug; a connection/auth failure (P1000/P1001 or authentication/reach text) is
    // a credential/network issue. `reason` is the diagnosis signal in the logs +
    // response; NEITHER contains secrets.
    const name = error instanceof Error ? error.name : "UnknownError";
    const message = error instanceof Error ? error.message : String(error);
    const code = (error as { code?: string })?.code;
    const engineMissing = /engine|query-engine|binary target|libquery|prisma-client-js/i.test(message);
    const connOrAuth = /P1000|P1001|P1017|authentication|password|reach (the )?database|ECONN|timeout|role .* does not exist/i.test(
      `${code ?? ""} ${message}`
    );
    const reason = engineMissing ? "engine" : connOrAuth ? "connection_or_auth" : "unknown";
    console.error(`[db-health] FAIL reason=${reason} name=${name} code=${code ?? "none"} msg=${message.slice(0, 200)}`);
    return NextResponse.json(
      {
        ok: false,
        service: "db-health",
        timestamp,
        error: "Database unavailable",
        reason,
        errorName: name,
        errorCode: code ?? null,
        release,
      },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }
}

