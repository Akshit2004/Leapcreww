import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Template creation is disabled" }, { status: 403 });
}
