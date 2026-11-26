"use client";

import { formatINR } from "@/lib/currency";

export interface QuoteDocument {
  quoteNumber: string;
  createdAt: string | Date;
  customerInfo: { name: string; email: string; phone: string; city: string; pincode: string };
  designSnapshot: {
    config: {
      layout: string;
      measurements: { length: number; width: number; wallHeight: number; ceilingHeight: number };
      doorStyle: string;
      colour: string;
      finish: string;
      countertop: string;
    };
    previewImage?: string;
    aiRenderImage?: string;
  };
  lineItems: { sku: string; name: string; category: string; widthIn: number; quantity: number; unitPriceINR: number; lineTotalINR: number }[];
  subtotalINR: number;
  discountINR: number;
  taxableINR: number;
  gstRate: number;
  gstINR: number;
  grandTotalINR: number;
}

async function toPngDataUrl(source: string) {
  const image = new window.Image();
  image.src = source;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to prepare the quotation preview image.");
  context.drawImage(image, 0, 0);
  return canvas.toDataURL("image/png");
}

export async function downloadQuotePdf(quote: QuoteDocument, includeStudioImages = true) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const addMoney = (amount: number, x: number, y: number, width: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 100;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to format the quotation currency.");
    context.fillStyle = "#272824";
    context.font = "600 48px Arial";
    context.textAlign = "right";
    context.textBaseline = "middle";
    context.fillText(formatINR(amount), canvas.width - 6, canvas.height / 2);
    doc.addImage(canvas.toDataURL("image/png"), "PNG", x, y - 4.5, width, 7);
  };
  const addPageHeader = () => {
    doc.setFillColor(39, 40, 36);
    doc.rect(0, 0, 210, 34, "F");
    doc.setTextColor(246, 243, 237);
    doc.setFont("times", "bold");
    doc.setFontSize(20);
    doc.text("CABINET STUDIO", 14, 21);
    doc.setTextColor(39, 40, 36);
    doc.setFont("helvetica", "normal");
  };

  addPageHeader();
  doc.setFontSize(10);
  doc.text(`Quotation ${quote.quoteNumber}`, 14, 45);
  doc.text(new Date(quote.createdAt).toLocaleDateString("en-IN"), 196, 45, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text("CUSTOMER", 14, 56);
  doc.setFont("helvetica", "normal");
  doc.text(`${quote.customerInfo.name}  ·  ${quote.customerInfo.email}`, 14, 63, { maxWidth: 182 });
  doc.text(`${quote.customerInfo.phone}  ·  ${quote.customerInfo.city} ${quote.customerInfo.pincode}`, 14, 69, { maxWidth: 182 });
  const config = quote.designSnapshot.config;
  doc.setFont("helvetica", "bold");
  doc.text("DESIGN SUMMARY", 14, 80);
  doc.setFont("helvetica", "normal");
  doc.text(`${config.layout.toUpperCase()} layout  ·  ${config.measurements.length}" × ${config.measurements.width}" room`, 14, 87);
  doc.text(`${config.doorStyle}  ·  ${config.colour} ${config.finish}  ·  ${config.countertop}`, 14, 94, { maxWidth: 182 });

  const studioImage = quote.designSnapshot.aiRenderImage || quote.designSnapshot.previewImage || "";
  let y = 104;
  if (studioImage) {
    const preview = await toPngDataUrl(studioImage);
    doc.addImage(preview, "PNG", 14, y, 182, 70, undefined, "FAST");
    y += 78;
  }
  if (includeStudioImages && quote.designSnapshot.aiRenderImage && quote.designSnapshot.previewImage) {
    const cadPreview = await toPngDataUrl(quote.designSnapshot.previewImage);
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("LIVE 3D CAD MODEL", 14, 20);
    doc.addImage(cadPreview, "PNG", 14, 28, 182, 104, undefined, "FAST");
    y = 145;
  }
  doc.setFont("helvetica", "bold");
  doc.text("ITEMIZED ESTIMATE", 14, y);
  y += 8;
  doc.setFontSize(8);
  doc.setFillColor(239, 236, 228);
  doc.rect(14, y - 4, 182, 8, "F");
  doc.text("DESCRIPTION", 16, y + 1);
  doc.text("QTY", 123, y + 1);
  doc.text("UNIT PRICE", 151, y + 1, { align: "right" });
  doc.text("TOTAL", 194, y + 1, { align: "right" });
  y += 10;

  for (const item of quote.lineItems) {
    if (y > 265) {
      doc.addPage();
      y = 20;
      doc.setFont("helvetica", "bold");
      doc.text("ITEMIZED ESTIMATE · CONTINUED", 14, y);
      y += 10;
    }
    doc.setFont("helvetica", "normal");
    doc.text(`${item.name}${item.widthIn ? ` (${item.widthIn}" W)` : ""}`, 16, y, { maxWidth: 98 });
    doc.text(String(item.quantity), 123, y, { align: "right" });
    addMoney(item.unitPriceINR, 126, y - 3, 25);
    addMoney(item.lineTotalINR, 154, y - 3, 40);
    y += 7;
  }
  if (y > 248) {
    doc.addPage();
    y = 20;
  }
  y += 5;
  for (const [label, amount] of [
    ["Subtotal", quote.subtotalINR],
    ["Design discount", -quote.discountINR],
    [`Taxable amount`, quote.taxableINR],
    [`GST (${Math.round(quote.gstRate * 100)}%)`, quote.gstINR],
  ] as const) {
    doc.text(label, 130, y, { align: "right" });
    addMoney(amount, 154, y - 3, 40);
    y += 7;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("GRAND TOTAL", 130, y + 1, { align: "right" });
  addMoney(quote.grandTotalINR, 154, y - 2, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Indicative pricing in INR. GST is shown at 18%; final pricing is subject to measurement, material availability and design review.", 14, 285, { maxWidth: 182 });
  doc.save(`${quote.quoteNumber}-Cabinet-Studio-Quote.pdf`);
}
