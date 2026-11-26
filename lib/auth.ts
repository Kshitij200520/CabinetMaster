import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import User from "@/models/User";
import { connectDB } from "@/lib/mongodb";

export const SESSION_COOKIE = "cabinet_session";
const SESSION_AGE_SECONDS = 60 * 60 * 24 * 7;

export interface AuthSession {
  userId: string;
  role: "customer" | "admin";
}

function jwtKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function createSessionToken(user: { id: string; role: "customer" | "admin" }) {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer("cabinet-studio")
    .setAudience("cabinet-studio")
    .setIssuedAt()
    .setExpirationTime(`${SESSION_AGE_SECONDS}s`)
    .sign(jwtKey());
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_AGE_SECONDS,
  };
}

export async function sessionFromRequest(request: NextRequest): Promise<AuthSession | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwtKey(), {
      issuer: "cabinet-studio",
      audience: "cabinet-studio",
    });
    if (typeof payload.sub !== "string" || (payload.role !== "customer" && payload.role !== "admin")) return null;
    return { userId: payload.sub, role: payload.role };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("JWT_SECRET")) throw error;
    return null;
  }
}

export async function userFromRequest(request: NextRequest) {
  const session = await sessionFromRequest(request);
  if (!session) return null;
  await connectDB();
  const user = await User.findById(session.userId).select("name email phone city role");
  return user ? { session, user } : null;
}

export async function adminFromRequest(request: NextRequest) {
  const result = await userFromRequest(request);
  return result?.session.role === "admin" && result.user.role === "admin" ? result : null;
}

export function safeUser(user: {
  _id: { toString(): string };
  name: string;
  email: string;
  phone?: string;
  city?: string;
  role: "customer" | "admin";
}) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    city: user.city ?? "",
    role: user.role,
  };
}

export function publicAuthError(error: unknown) {
  if (error instanceof Error && (error.message.startsWith("JWT_SECRET") || error.message === "MONGODB_URI is not configured.")) {
    return error.message;
  }
  if (error instanceof Error && (error.name === "MongooseServerSelectionError" || error.name === "MongoNetworkError")) {
    return "Can't reach MongoDB Atlas. Check that your current IP is allowed in Atlas Network Access and that your network can reach the cluster.";
  }
  if (typeof error === "object" && error !== null && "code" in error) {
    if (error.code === 18) {
      return "MongoDB Atlas rejected the database credentials. Verify the database user and MONGODB_URI.";
    }
    if (error.code === "ETIMEOUT" && "syscall" in error && error.syscall === "querySrv") {
      return "MongoDB Atlas DNS lookup timed out. Check your internet, VPN/firewall, or DNS settings, then retry.";
    }
  }
  return "Authentication service is unavailable. Check the server configuration.";
}
