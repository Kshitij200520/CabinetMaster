import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { hashPassword } from "@/lib/auth";
import Product from "@/models/Product";
import User from "@/models/User";

const products = [
  { sku: "BASE-030", name: "Base Cabinet", category: "base", widthIn: 30, heightIn: 34, depthIn: 24, basePriceINR: 18500, active: true },
  { sku: "WALL-030", name: "Wall Cabinet", category: "wall", widthIn: 30, heightIn: 30, depthIn: 12, basePriceINR: 14200, active: true },
  { sku: "DRAWER-030", name: "Three-Drawer Base", category: "drawer", widthIn: 30, heightIn: 34, depthIn: 24, basePriceINR: 24500, active: true },
  { sku: "SINK-030", name: "Sink Base", category: "sink", widthIn: 30, heightIn: 34, depthIn: 24, basePriceINR: 21000, active: true },
  { sku: "PANTRY-024", name: "Tall Pantry", category: "pantry", widthIn: 24, heightIn: 84, depthIn: 24, basePriceINR: 38000, active: true },
  { sku: "CORNER-036", name: "Corner Cabinet", category: "corner", widthIn: 36, heightIn: 34, depthIn: 24, basePriceINR: 24000, active: true },
];

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.SEED_SECRET;
  const suppliedSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!configuredSecret) return NextResponse.json({ error: "Seeding is disabled until SEED_SECRET is configured." }, { status: 503 });
  const expected = Buffer.from(configuredSecret);
  const supplied = Buffer.from(suppliedSecret);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const email = (process.env.ADMIN_EMAIL || "admin@cabinetstudio.in").toLowerCase();
    const password = process.env.ADMIN_SEED_PASSWORD || "";
    if (password.length < 10) return NextResponse.json({ error: "Set ADMIN_SEED_PASSWORD to at least 10 characters." }, { status: 503 });
    await connectDB();
    let admin = await User.findOne({ email });
    if (!admin) {
      admin = await User.create({
        name: "Cabinet Studio Admin",
        email,
        passwordHash: await hashPassword(password),
        role: "admin",
      });
    } else if (admin.role !== "admin") {
      return NextResponse.json({ error: "The configured admin email belongs to a non-admin account." }, { status: 409 });
    }
    await Product.bulkWrite(products.map((product) => ({
      updateOne: { filter: { sku: product.sku }, update: { $setOnInsert: product }, upsert: true },
    })));
    return NextResponse.json({ success: true, adminEmail: email, productCount: products.length });
  } catch {
    return NextResponse.json({ error: "Unable to seed the catalog. Check the database and seed configuration." }, { status: 503 });
  }
}
