import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { publicAuthError, safeUser, userFromRequest } from "@/lib/auth";
import User from "@/models/User";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^[0-9+() -]{7,20}$/).or(z.literal("")),
  city: z.string().trim().max(80),
});

export async function GET(request: NextRequest) {
  try {
    const result = await userFromRequest(request);
    return NextResponse.json({ user: result ? safeUser(result.user) : null });
  } catch (error) {
    return NextResponse.json({ error: publicAuthError(error) }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const result = await userFromRequest(request);
    if (!result) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const updates = profileSchema.parse(await request.json());
    const user = await User.findByIdAndUpdate(result.user._id, updates, { new: true, runValidators: true }).select("name email phone city role");
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    return NextResponse.json({ user: safeUser(user) });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Please check your profile details." }, { status: 400 });
    return NextResponse.json({ error: publicAuthError(error) }, { status: 503 });
  }
}
