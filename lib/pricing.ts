import { KitchenDesign } from "./types";

const categoryBase = { base: 18500, wall: 14200, sink: 21000, drawer: 24500, corner: 24000, pantry: 38000 };
export type CabinetBaseRates = Partial<Record<keyof typeof categoryBase, number>>;
const finishMultiplier: Record<string, number> = { Matte: 1, Satin: 1.04, "High Gloss": 1.12, "Natural Wood Grain": 1.08, Textured: 1.06 };
const styleMultiplier: Record<string, number> = {
  "Classic Shaker": 1, "Slim Shaker": 1.05, "Raised Panel": 1.12, "Recessed Panel": 1.08,
  "Flat Slab": 1.1, "Handleless Modern": 1.16, "Glass Front": 1.25,
};
export const GST_RATE = 0.18;

export function cabinetUnitPrice(design: KitchenDesign, category: keyof typeof categoryBase, width: number, baseRates: CabinetBaseRates = {}) {
  const referenceWidth = category === "pantry" ? 24 : 30;
  const base = (baseRates[category] ?? categoryBase[category]) * (width / referenceWidth);
  return Math.round(base * (finishMultiplier[design.finish] ?? 1) * (styleMultiplier[design.doorStyle] ?? 1));
}

export function calculateQuote(design: KitchenDesign, baseRates: CabinetBaseRates = {}) {
  const cabinetRows = design.cabinetInventory.map((item) => {
    const unitPrice = cabinetUnitPrice(design, item.category, item.width, baseRates);
    return { sku: item.sku, name: item.name, size: `${item.width}" W x ${item.height}" H`, quantity: item.quantity, unitPrice, lineTotal: unitPrice * item.quantity };
  });
  const cabinetSubtotal = cabinetRows.reduce((sum, row) => sum + row.lineTotal, 0);
  const handleUpgrade = design.handle === "Handleless" ? 0 : 4000;
  const countertopRates: Record<string, number> = {
    "White Marble": 2200,
    "Carrara-inspired Marble": 2600,
    "Calacatta-inspired Marble": 3200,
    "White Quartz": 1400,
    "Black Granite": 1450,
    "Concrete Grey": 1200,
    "Natural Stone": 1800,
    "Wooden Countertop": 4200,
  };
  const countertopArea = design.cabinetInventory
    .filter((item) => item.category !== "wall" && item.category !== "pantry")
    .reduce((area, item) => area + (item.width * item.depth) / 144, 0);
  const countertopRatePerSqFt = countertopRates[design.countertop] ?? 5400;
  const countertop = Math.round(countertopArea * countertopRatePerSqFt);
  const backsplashRatePerSqFt = design.backsplash === "Plain Minimal" ? 400 : design.backsplash === "White Subway Tile" ? 650 : 850;
  const backsplashArea = Math.max(1, (design.measurements.length / 12) * 1.25);
  const backsplash = Math.round(backsplashArea * backsplashRatePerSqFt);
  const accessoryPrices: Record<string, number> = { Sink: 18000, Faucet: 12000, Cooktop: 24000, Hood: 18000, Refrigerator: 50000, Oven: 35000, Lighting: 5000 };
  const accessories = design.accessories.reduce((sum, name) => sum + (accessoryPrices[name] ?? 0), 0);
  const subtotal = cabinetSubtotal + handleUpgrade + countertop + backsplash + accessories;
  const discount = subtotal >= 280000 ? Math.round(subtotal * 0.05) : 0;
  const taxable = subtotal - discount;
  const gst = Math.round(taxable * GST_RATE);
  return {
    cabinetRows,
    cabinetSubtotal,
    handleUpgrade,
    countertop,
    countertopArea,
    countertopRatePerSqFt,
    backsplash,
    accessories,
    subtotal,
    discount,
    taxable,
    gst,
    gstRate: GST_RATE,
    grandTotal: taxable + gst,
  };
}
