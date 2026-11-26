import { randomInt } from "node:crypto";
import type { Types } from "mongoose";
import { calculateServerQuote } from "@/lib/server-pricing";
import type { KitchenDesign } from "@/lib/types";

export async function designDocumentValues(
  userId: Types.ObjectId,
  title: string,
  design: KitchenDesign,
  previewImage: string,
  aiRenderImage: string,
) {
  const quote = await calculateServerQuote(design);
  return {
    userId,
    title,
    layout: design.layout,
    dimensions: {
      lengthIn: design.measurements.length,
      widthIn: design.measurements.width,
      wallHeightIn: design.measurements.wallHeight,
      ceilingHeightIn: design.measurements.ceilingHeight,
    },
    doorStyle: design.doorStyle,
    finish: design.finish,
    color: design.colour,
    countertop: design.countertop,
    backsplash: design.backsplash,
    handle: design.handle,
    cabinets: design.cabinetInventory.map((cabinet) => ({
      id: cabinet.id,
      sku: cabinet.sku,
      name: cabinet.name,
      category: cabinet.category,
      width: cabinet.width,
      height: cabinet.height,
      depth: cabinet.depth,
      quantity: cabinet.quantity,
      unitPriceINR: quote.cabinetRows.find((row) => row.sku === cabinet.sku)?.unitPrice ?? 0,
      position: cabinet.position,
      wall: cabinet.wall,
      rotation: cabinet.rotation,
    })),
    config: design,
    previewImage,
    aiRenderImage,
    estimatedTotalINR: quote.grandTotal,
  };
}

export async function quoteLineItems(design: KitchenDesign) {
  const quote = await calculateServerQuote(design);
  const cabinetItems = quote.cabinetRows.map((row) => {
    const cabinet = design.cabinetInventory.find((item) => item.sku === row.sku);
    return {
      sku: row.sku,
      name: row.name,
      category: cabinet?.category ?? "cabinet",
      widthIn: cabinet?.width ?? 0,
      quantity: row.quantity,
      unitPriceINR: row.unitPrice,
      lineTotalINR: row.lineTotal,
    };
  });
  const additionalItems = [
    { sku: "COUNTERTOP", name: `${design.countertop} countertop`, category: "countertop", amount: quote.countertop },
    { sku: "BACKSPLASH", name: `${design.backsplash} backsplash`, category: "backsplash", amount: quote.backsplash },
    { sku: "HANDLES", name: `${design.handle} hardware`, category: "hardware", amount: quote.handleUpgrade },
    { sku: "ACCESSORIES", name: "Appliances and accessories", category: "accessories", amount: quote.accessories },
  ].filter((item) => item.amount > 0).map((item) => ({
    sku: item.sku,
    name: item.name,
    category: item.category,
    widthIn: 0,
    quantity: 1,
    unitPriceINR: item.amount,
    lineTotalINR: item.amount,
  }));
  return { quote, lineItems: [...cabinetItems, ...additionalItems] };
}

export async function nextQuoteNumber(year = new Date().getFullYear()) {
  const { default: Quote } = await import("@/models/Quote");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `CS-${year}-${randomInt(100000, 1000000)}`;
    if (!(await Quote.exists({ quoteNumber: candidate }))) return candidate;
  }
  throw new Error("Unable to allocate a unique quote number.");
}
