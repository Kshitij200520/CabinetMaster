import { NextRequest, NextResponse } from "next/server";
import { adminFromRequest } from "@/lib/auth";
import Quote from "@/models/Quote";

export async function GET(request: NextRequest) {
  try {
    if (!(await adminFromRequest(request))) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    const leads = await Quote.find().sort({ createdAt: -1 }).limit(200).lean();
    return NextResponse.json({ leads });
  } catch {
    return NextResponse.json({ error: "Unable to load quote requests." }, { status: 503 });
  }
}
