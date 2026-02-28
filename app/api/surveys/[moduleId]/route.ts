import { NextResponse } from "next/server"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ moduleId: string }> }
) {
  const { moduleId } = await ctx.params
  return NextResponse.json({ ok: true, moduleId })
}