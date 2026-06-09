import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { amount } = await req.json();
    // TODO: In a real app, you would create a payment order here (e.g., via Razorpay)
    return NextResponse.json({ success: true, amount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
