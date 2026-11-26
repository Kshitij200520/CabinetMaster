import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { userFromRequest } from "@/lib/auth";
import { designPayloadSchema } from "@/lib/validation";
import { designDocumentValues } from "@/lib/server-design";
import Design from "@/models/Design";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const result = await userFromRequest(request);
    if (!result) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Design not found." }, { status: 404 });
    const design = await Design.findOne({ _id: id, userId: result.user._id }).lean();
    if (!design) return NextResponse.json({ error: "Design not found." }, { status: 404 });
    return NextResponse.json({ design });
  } catch {
    return NextResponse.json({ error: "Unable to load this design." }, { status: 503 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const result = await userFromRequest(request);
    if (!result) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Design not found." }, { status: 404 });
    const payload = designPayloadSchema.parse(await request.json());
    const design = await Design.findOneAndUpdate(
      { _id: id, userId: result.user._id },
      await designDocumentValues(result.user._id, payload.title, payload.design, payload.previewImage, payload.aiRenderImage),
      { new: true, runValidators: true },
    );
    if (!design) return NextResponse.json({ error: "Design not found." }, { status: 404 });
    return NextResponse.json({ design: design.toObject() });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "The design is invalid or contains an unsupported image." }, { status: 400 });
    return NextResponse.json({ error: "Unable to update design." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const result = await userFromRequest(request);
    if (!result) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Design not found." }, { status: 404 });
    const deleted = await Design.findOneAndDelete({ _id: id, userId: result.user._id });
    if (!deleted) return NextResponse.json({ error: "Design not found." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete design." }, { status: 503 });
  }
}
