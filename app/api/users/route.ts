import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: false, error: "Not implemented" }, { status: 501 });
}
