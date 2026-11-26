import { NextRequest, NextResponse } from "next/server";
import { adminFromRequest } from "@/lib/auth";
import Design from "@/models/Design";

export async function GET(request: NextRequest) {
  try {
    if (!(await adminFromRequest(request))) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    const designs = await Design.find().populate("userId", "name email").sort({ updatedAt: -1 }).limit(200).lean();
    return NextResponse.json({ designs });
  } catch {
    return NextResponse.json({ error: "Unable to load customer designs." }, { status: 503 });
  }
}
