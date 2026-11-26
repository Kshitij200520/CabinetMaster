import { calculateQuote, type CabinetBaseRates } from "@/lib/pricing";
import type { KitchenDesign } from "@/lib/types";
import Product from "@/models/Product";

export async function calculateServerQuote(design: KitchenDesign) {
  const products = await Product.find({ active: true }).select("category basePriceINR").lean();
  const baseRates: CabinetBaseRates = {};
  for (const product of products) {
    baseRates[product.category as keyof CabinetBaseRates] = product.basePriceINR;
  }
  return calculateQuote(design, baseRates);
}
