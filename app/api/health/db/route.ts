import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

async function readReleaseMetadata() {
  const filePath = path.join(process.cwd(), "artifacts/mac-mini/state/release-state.env");

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const entries = Object.fromEntries(
      raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [key, ...valueParts] = line.split("=");
          return [key, valueParts.join("=")];
        })
    );

    return {
      branch: entries.BRANCH ?? null,
      commit: entries.COMMIT ?? null,
      buildId: entries.BUILD_ID ?? null,
      buildTimeUtc: entries.BUILD_TIME_UTC ?? null,
      buildReason: entries.BUILD_REASON ?? null,
      gitDirty: entries.GIT_DIRTY ?? null,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const timestamp = new Date().toISOString();
  const release = await readReleaseMetadata();

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

