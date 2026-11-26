import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminFromRequest } from "@/lib/auth";
import Product from "@/models/Product";

const updateSchema = z.object({
  basePriceINR: z.number().int().min(0).max(10_000_000),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ sku: string }> }) {
  try {
    if (!(await adminFromRequest(request))) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    const { sku } = await params;
    const body = updateSchema.parse(await request.json());
    const product = await Product.findOneAndUpdate({ sku }, { basePriceINR: body.basePriceINR }, { new: true, runValidators: true });
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    return NextResponse.json({ product: product.toObject() });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter a valid INR price." }, { status: 400 });
    return NextResponse.json({ error: "Unable to update product pricing." }, { status: 503 });
  }
}
