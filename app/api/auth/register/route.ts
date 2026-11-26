import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { createSessionToken, hashPassword, publicAuthError, safeUser, sessionCookieOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
  phone: z.string().trim().regex(/^[0-9+() -]{7,20}$/).or(z.literal("")).optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
});

export async function POST(request: NextRequest) {
  try {
    const body = registerSchema.parse(await request.json());
    const throttle = rateLimit(`register:${body.email.toLowerCase()}`, 5, 15 * 60_000);
    if (!throttle.allowed) {
      return NextResponse.json({ error: "Too many account creation attempts. Please try again later." }, { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } });
    }
    await connectDB();
    const user = await User.create({
      name: body.name,
      email: body.email.toLowerCase(),
      passwordHash: await hashPassword(body.password),
      phone: body.phone,
      city: body.city,
      role: "customer",
    });
    const token = await createSessionToken({ id: user.id, role: user.role });
    const response = NextResponse.json({ user: safeUser(user) }, { status: 201 });
    response.cookies.set("cabinet_session", token, sessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Please check your registration details." }, { status: 400 });
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: publicAuthError(error) }, { status: 503 });
  }
}
