import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Lead from "@/models/Lead";
import { kitchenDesignSchema } from "@/lib/validation";
import { calculateServerQuote } from "@/lib/server-pricing";

const requestSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().email().max(254),
    phone: z.string().regex(/^[0-9+() -]{7,20}$/),
    city: z.string().trim().min(2).max(80),
    pinCode: z.string().regex(/^[1-9][0-9]{5}$/),
    message: z.string().max(1000).optional(),
  }),
  design: kitchenDesignSchema,
});

export async function POST(request: NextRequest) {
  try {
    const body = requestSchema.parse(await request.json());
    await connectDB();
    const quote = await calculateServerQuote(body.design);
    const quoteReference = `CS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    await Lead.create({ quoteReference, customer: body.customer, design: body.design, quote });
    return NextResponse.json({ quoteReference, quote }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid customer or design information." }, { status: 400 });
    return NextResponse.json({ error: "Unable to submit the quote request. Check the database connection." }, { status: 503 });
  }
}
