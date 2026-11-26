import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { userFromRequest } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { imageDataSchema, kitchenDesignSchema } from "@/lib/validation";
import { nextQuoteNumber, quoteLineItems } from "@/lib/server-design";
import Design from "@/models/Design";
import Quote from "@/models/Quote";
import { GST_RATE } from "@/lib/pricing";
import { rateLimit } from "@/lib/rate-limit";

const requestSchema = z.object({
  customerInfo: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().regex(/^[0-9+() -]{7,20}$/),
    city: z.string().trim().min(2).max(80),
    pincode: z.string().regex(/^[1-9][0-9]{5}$/),
  }),
  design: kitchenDesignSchema,
  previewImage: imageDataSchema.optional().default(""),
  aiRenderImage: imageDataSchema.optional().default(""),
  designId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = requestSchema.parse(await request.json());
    const identity = await userFromRequest(request);
    const throttle = rateLimit(`quote:${identity?.user._id.toString() ?? body.customerInfo.email.toLowerCase()}`, 5, 10 * 60_000);
    if (!throttle.allowed) {
      return NextResponse.json({ error: "Quote request limit reached. Please try again later." }, { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } });
    }
    await connectDB();
    let designId: mongoose.Types.ObjectId | null = null;
    if (body.designId) {
      if (!identity || !mongoose.isValidObjectId(body.designId)) {
        return NextResponse.json({ error: "Save this design to your account before attaching it to a quote." }, { status: 400 });
      }
      const saved = await Design.findOne({ _id: body.designId, userId: identity.user._id }).select("_id");
      if (!saved) return NextResponse.json({ error: "The selected design is not in your account." }, { status: 404 });
      designId = saved._id;
    }

    const { quote, lineItems } = await quoteLineItems(body.design);
    const quoteNumber = await nextQuoteNumber();
    const created = await Quote.create({
      quoteNumber,
      userId: identity?.user._id ?? null,
      customerInfo: body.customerInfo,
      designId,
      designSnapshot: {
        config: body.design,
        previewImage: body.previewImage,
        aiRenderImage: body.aiRenderImage,
      },
      lineItems,
      subtotalINR: quote.subtotal,
      discountINR: quote.discount,
      taxableINR: quote.taxable,
      gstRate: GST_RATE,
      gstINR: quote.gst,
      grandTotalINR: quote.grandTotal,
      status: "Pending Review",
    });
    return NextResponse.json({ quote: created.toObject() }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Quote details or kitchen configuration are invalid." }, { status: 400 });
    return NextResponse.json({ error: "Unable to create the quote. Check the database connection." }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const identity = await userFromRequest(request);
    if (!identity) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const quotes = await Quote.find({ userId: identity.user._id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ quotes });
  } catch {
    return NextResponse.json({ error: "Unable to load your quotations." }, { status: 503 });
  }
}
