import { NextRequest, NextResponse } from "next/server";
import { adminFromRequest } from "@/lib/auth";
import Quote from "@/models/Quote";
import Lead from "@/models/Lead";

export async function GET(request: NextRequest) {
  try {
    if (!(await adminFromRequest(request))) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    const [quotes, summary, legacyLeads] = await Promise.all([
      Quote.find().sort({ createdAt: -1 }).limit(200).lean(),
      Quote.aggregate([
        { $group: {
          _id: null,
          totalQuotes: { $sum: 1 },
          pipelineINR: { $sum: "$grandTotalINR" },
          approvedINR: { $sum: { $cond: [{ $eq: ["$status", "Approved"] }, "$grandTotalINR", 0] } },
        } },
      ]),
      Lead.find().sort({ createdAt: -1 }).limit(200).lean(),
    ]);
    const legacy = legacyLeads.map((lead) => ({
      _id: lead._id.toString(),
      quoteNumber: lead.quoteReference,
      customerInfo: {
        name: lead.customer.name,
        email: lead.customer.email,
        phone: lead.customer.phone,
        city: lead.customer.city,
        pincode: lead.customer.pinCode,
      },
      designSnapshot: { config: lead.design, previewImage: "", aiRenderImage: "" },
      status: ({ pending: "Pending Review", reviewed: "In Consultation", confirmed: "Approved", closed: "Revision Requested" } as const)[lead.status as "pending" | "reviewed" | "confirmed" | "closed"] ?? "Pending Review",
      grandTotalINR: Number(lead.quote.grandTotal ?? 0),
      createdAt: lead.createdAt,
      legacy: true,
    }));
    const currentSummary = summary[0] ?? { totalQuotes: 0, pipelineINR: 0, approvedINR: 0 };
    const legacyApproved = legacyLeads.filter((lead) => lead.status === "confirmed").reduce((total, lead) => total + Number(lead.quote.grandTotal ?? 0), 0);
    return NextResponse.json({
      quotes: [...quotes.map((quote) => ({ ...quote, legacy: false })), ...legacy]
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
      summary: {
        totalQuotes: currentSummary.totalQuotes + legacyLeads.length,
        pipelineINR: currentSummary.pipelineINR + legacyLeads.reduce((total, lead) => total + Number(lead.quote.grandTotal ?? 0), 0),
        approvedINR: currentSummary.approvedINR + legacyApproved,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to load quote administration data." }, { status: 503 });
  }
}
