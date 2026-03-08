import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  await params;
  return NextResponse.json(
    { ok: false, error: "Not implemented" },
    { status: 501, headers: { "Cache-Control": "no-store" } }
  );
}
