import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminFromRequest } from "@/lib/auth";
import Quote from "@/models/Quote";
import Lead from "@/models/Lead";

const updateSchema = z.object({
  status: z.enum(["Pending Review", "In Consultation", "Approved", "Revision Requested"]),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await adminFromRequest(request))) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    const body = updateSchema.parse(await request.json());
    const quote = await Quote.findByIdAndUpdate(id, { status: body.status }, { new: true, runValidators: true });
    if (quote) return NextResponse.json({ quote: quote.toObject() });
    const legacyStatus = {
      "Pending Review": "pending",
      "In Consultation": "reviewed",
      Approved: "confirmed",
      "Revision Requested": "closed",
    }[body.status];
    const legacy = await Lead.findByIdAndUpdate(id, { status: legacyStatus }, { new: true, runValidators: true });
    if (!legacy) return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "The requested quote status is invalid." }, { status: 400 });
    return NextResponse.json({ error: "Unable to update quote status." }, { status: 503 });
  }
}
