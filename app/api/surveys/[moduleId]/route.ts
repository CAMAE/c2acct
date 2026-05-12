import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  await params;
  return NextResponse.json(
    {
      ok: false,
      error: "Not found",
      detail: "This generic survey lookup API is quarantined outside the live PAT assessment runtime.",
    },
    { status: 404, headers: { "Cache-Control": "no-store" } }
  );
}
