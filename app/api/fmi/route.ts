import { NextResponse } from "next/server";

export async function GET() {
	// Intentionally unavailable in the current build.
	return NextResponse.json(
		{ ok: false, error: "Not found" },
		{ status: 404, headers: { "Cache-Control": "no-store" } }
	);
}
