import { NextResponse } from "next/server";
import { getPublicReleaseFingerprint } from "@/lib/release/fingerprint";

export const dynamic = "force-dynamic";

export async function GET() {
  const fingerprint = getPublicReleaseFingerprint();

  return NextResponse.json(
    {
      ok: true,
      fingerprint,
    },
    {
      headers: {
        "x-pat-release-id": fingerprint.releaseId,
      },
    }
  );
}
