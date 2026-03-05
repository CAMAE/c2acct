import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const { moduleId } = await params;
  return NextResponse.json(
    { ok: false, error: "Not implemented", moduleId },
    { status: 501 }
  );
}
