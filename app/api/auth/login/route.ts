import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { createSessionToken, publicAuthError, safeUser, sessionCookieOptions, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

export async function POST(request: NextRequest) {
  try {
    const body = loginSchema.parse(await request.json());
    const throttle = rateLimit(`login:${body.email.toLowerCase()}`, 8, 60_000);
    if (!throttle.allowed) {
      return NextResponse.json({ error: "Too many sign-in attempts. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } });
    }
    await connectDB();
    const user = await User.findOne({ email: body.email.toLowerCase() }).select("+passwordHash");
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    const token = await createSessionToken({ id: user.id, role: user.role });
    const response = NextResponse.json({ user: safeUser(user) });
    response.cookies.set("cabinet_session", token, sessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
    console.error("Login request failed:", error);
    return NextResponse.json({ error: publicAuthError(error) }, { status: 503 });
  }
}
