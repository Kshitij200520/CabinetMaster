import { NextRequest, NextResponse } from "next/server";
import { adminFromRequest } from "@/lib/auth";
import Product from "@/models/Product";

export async function GET(request: NextRequest) {
  try {
    if (!(await adminFromRequest(request))) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    const products = await Product.find().sort({ category: 1, sku: 1 }).lean();
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ error: "Unable to load the product catalog." }, { status: 503 });
  }
}
