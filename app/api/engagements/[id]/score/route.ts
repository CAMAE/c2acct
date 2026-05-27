import { NextResponse } from "next/server";

function unavailableResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: "Not found",
      detail: "This legacy engagement scoring route is quarantined outside the live PAT launch surface.",
    },
    { status: 404, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  return unavailableResponse();
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  return unavailableResponse();
}
