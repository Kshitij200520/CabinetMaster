import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { userFromRequest } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { designPayloadSchema } from "@/lib/validation";
import { designDocumentValues } from "@/lib/server-design";
import Design from "@/models/Design";

export async function GET(request: NextRequest) {
  try {
    const result = await userFromRequest(request);
    if (!result) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const designs = await Design.find({ userId: result.user._id }).sort({ updatedAt: -1 }).lean();
    return NextResponse.json({ designs });
  } catch {
    return NextResponse.json({ error: "Unable to load saved designs. Check the database connection." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await userFromRequest(request);
    if (!result) return NextResponse.json({ error: "Sign in to save your design." }, { status: 401 });
    const payload = designPayloadSchema.parse(await request.json());
    await connectDB();
    const design = await Design.create(await designDocumentValues(
      result.user._id,
      payload.title,
      payload.design,
      payload.previewImage,
      payload.aiRenderImage,
    ));
    return NextResponse.json({ design: design.toObject() }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "The design is invalid or contains an unsupported image." }, { status: 400 });
    return NextResponse.json({ error: "Unable to save design. Check the database connection." }, { status: 503 });
  }
}
