import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";

export async function GET() {
  try {
    await connectDB();
    const products = await Product.find({ active: true }).select("sku category basePriceINR").lean();
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ error: "Product catalog is unavailable." }, { status: 503 });
  }
}
