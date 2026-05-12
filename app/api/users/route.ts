import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "Not found",
      detail: "This generic users API is quarantined and not part of the live PAT product surface.",
    },
    { status: 404, headers: { "Cache-Control": "no-store" } }
  );
}
