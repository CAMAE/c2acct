import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json(
    { ok: false, error: "Not implemented (schema mismatch)", engagementId: id },
    { status: 501 }
  );
}
