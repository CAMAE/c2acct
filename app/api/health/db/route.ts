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
  } catch {
    return NextResponse.json(
      {
        ok: false,
        service: "db-health",
        timestamp,
        error: "Database unavailable",
        release,
      },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }
}

