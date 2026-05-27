import { NextResponse } from "next/server";

export async function GET() {
	return NextResponse.json(
		{
			ok: false,
			error: "Not found",
			detail: "FMI momentum is quarantined until the PAT launch surface includes supported FMI delivery.",
		},
		{ status: 404, headers: { "Cache-Control": "no-store" } }
	);
}
