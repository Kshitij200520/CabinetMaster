import { z } from "zod";
import { backsplashes, cabinetColours, colourValue } from "@/lib/catalog";
import { recommendCabinets } from "@/lib/recommendation";
import { DOOR_PRESETS, KITCHEN_PRESETS, type KitchenPresetId } from "@/lib/presets";
import type { KitchenDesign, Measurements } from "@/lib/types";

export const imageAnalysisSchema = z.object({
  layout: z.enum(["straight", "l-shaped", "u-shaped", "galley"]),
  doorStyle: z.enum(["Classic Shaker", "Slim Shaker", "Flat Slab", "Raised Panel", "Handleless", "Glass Front"]),
  cabinetColorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  colorName: z.string().min(1).max(60),
  finish: z.enum(["Natural Wood Grain", "Matte", "Satin", "Gloss", "Textured"]),
  countertop: z.enum(["White Quartz", "Carrara Marble", "Calacatta Marble", "Black Granite", "Wooden Countertop"]),
  backsplash: z.enum(["White Subway Tile", "Marble", "Neutral Stone", "Textured Ceramic", "Plain Minimal"]),
  handle: z.enum(["Brushed Gold", "Matte Black", "Chrome", "Brushed Nickel", "Brass", "Handleless"]),
});

export type ImageAnalysis = z.infer<typeof imageAnalysisSchema>;

const defaultMeasurements: Measurements = {
  length: 144,
  width: 120,
  wallHeight: 96,
  ceilingHeight: 108,
  unit: "imperial",
};

const materialProfiles: Record<string, { preset: KitchenPresetId; colour?: string; colourHex?: string; finish?: string; countertop?: string; handle?: string }> = {
  "natural-oak": { preset: "scandinavian-oak", colour: "Natural Oak", colourHex: "#B38B62", finish: "Natural Wood Grain" },
  "american-walnut": { preset: "luxury-walnut", colour: "Walnut", colourHex: "#694A36", finish: "Natural Wood Grain" },
  "muted-sage": { preset: "sage-brass", colour: "Sage Green", colourHex: "#9DA58F", finish: "Matte" },
  "matte-charcoal": { preset: "modern-minimalist", colour: "Charcoal", colourHex: "#393A36", finish: "Matte" },
  "warm-ivory": { preset: "classic-shaker", colour: "Warm White", colourHex: "#F6F3ED", finish: "Matte" },
  "carrara-marble": { preset: "classic-shaker", countertop: "Carrara-inspired Marble" },
  "white-quartz": { preset: "modern-minimalist", countertop: "White Quartz" },
  "black-granite": { preset: "luxury-walnut", countertop: "Black Granite" },
  "brushed-brass": { preset: "classic-shaker", handle: "Brushed Gold" },
  "matte-black": { preset: "modern-minimalist", handle: "Matte Black" },
  "brushed-nickel": { preset: "scandinavian-oak", handle: "Brushed Nickel" },
};

const doorPresetProfiles: Record<string, KitchenPresetId> = {
  "classic-shaker": "classic-shaker",
  "slim-shaker": "scandinavian-oak",
  "flat-slab": "modern-minimalist",
  "glass-front": "luxury-walnut",
};

function nearestColourName(hex: string) {
  const source = hex.slice(1).match(/.{2}/g)?.map((part) => parseInt(part, 16)) ?? [238, 235, 221];
  return cabinetColours.reduce((nearest, [name, candidate]) => {
    const rgb = candidate.slice(1).match(/.{2}/g)?.map((part) => parseInt(part, 16)) ?? [238, 235, 221];
    const distance = rgb.reduce((sum, channel, index) => sum + (channel - source[index]) ** 2, 0);
    return distance < nearest.distance ? { name, distance } : nearest;
  }, { name: cabinetColours[0][0], distance: Number.POSITIVE_INFINITY }).name;
}

function buildDesign(
  profile: {
    layout: KitchenDesign["layout"];
    doorStyle: string;
    colour: string;
    colourHex?: string;
    finish: string;
    countertop: string;
    handle: string;
    backsplash: string;
  },
  measurements: Measurements,
): KitchenDesign {
  return {
    layout: profile.layout,
    measurements,
    cabinetInventory: recommendCabinets(profile.layout, measurements.length, measurements.width, measurements.wallHeight),
    doorStyle: profile.doorStyle,
    colour: profile.colour,
    colourHex: profile.colourHex,
    finish: profile.finish,
    handle: profile.handle === "Brushed Brass" ? "Brushed Gold" : profile.handle,
    countertop: profile.countertop,
    backsplash: profile.backsplash,
    appliances: { sink: true, faucet: true, cooktop: true, hood: true, refrigerator: true, oven: true },
    accessories: ["Lighting"],
  };
}

export function fallbackImageDesign(presetHint = "", measurements = defaultMeasurements): KitchenDesign {
  const hint = presetHint.trim().toLowerCase();
  const materialHint = hint.startsWith("material-") ? hint.slice("material-".length) : "";
  const material = materialProfiles[materialHint];
  const doorHint = hint.startsWith("door-") ? hint.slice("door-".length) : "";
  const doorPreset = doorPresetProfiles[doorHint];
  const presetId = (hint in KITCHEN_PRESETS ? hint : material?.preset ?? doorPreset
    ?? (hint === "hero-kitchen" || hint === "hero" ? "contemporary-luxury" : "classic-shaker")) as KitchenPresetId;
  const preset = KITCHEN_PRESETS[presetId];
  const doorStyle = doorHint && doorPreset
    ? DOOR_PRESETS[doorHint as keyof typeof DOOR_PRESETS].doorStyle
    : preset.doorStyle;
  const colour = material?.colour ?? preset.colour;
  const colourHex = material?.colourHex ?? colourValue(colour);
  return buildDesign({
    layout: preset.layout,
    doorStyle,
    colour,
    colourHex,
    finish: material?.finish ?? preset.finish,
    countertop: material?.countertop ?? preset.countertop,
    handle: material?.handle ?? preset.handle,
    backsplash: preset.backsplash,
  }, measurements);
}

export function applyImageHint(design: KitchenDesign, presetHint = ""): KitchenDesign {
  const hint = presetHint.trim().toLowerCase();
  const materialHint = hint.startsWith("material-") ? hint.slice("material-".length) : "";
  const material = materialProfiles[materialHint];
  if (material) {
    if (material.colour || material.colourHex) {
      return {
        ...design,
        colour: material.colour ?? design.colour,
        colourHex: material.colourHex ?? design.colourHex,
        finish: material.finish ?? design.finish,
      };
    }
    if (material.countertop) return { ...design, countertop: material.countertop };
    if (material.handle) return { ...design, handle: material.handle };
  }
  const doorHint = hint.startsWith("door-") ? hint.slice("door-".length) : "";
  if (doorHint && doorPresetProfiles[doorHint]) {
    return { ...design, doorStyle: DOOR_PRESETS[doorHint as keyof typeof DOOR_PRESETS].doorStyle };
  }
  return design;
}

export function imageAnalysisToDesign(value: unknown, measurements = defaultMeasurements): KitchenDesign {
  const analysis = imageAnalysisSchema.parse(value);
  const layout = analysis.layout === "l-shaped" ? "l" : analysis.layout === "u-shaped" ? "u" : analysis.layout;
  const doorStyle = analysis.doorStyle === "Handleless" ? "Handleless Modern" : analysis.doorStyle;
  const countertop = analysis.countertop === "Carrara Marble" ? "Carrara-inspired Marble"
    : analysis.countertop === "Calacatta Marble" ? "Calacatta-inspired Marble" : analysis.countertop;
  const finish = analysis.finish === "Gloss" ? "High Gloss" : analysis.finish;
  const colourHex = analysis.cabinetColorHex.toUpperCase();
  return buildDesign({
    layout,
    doorStyle,
    colour: nearestColourName(colourHex),
    colourHex,
    finish,
    countertop,
    handle: analysis.handle,
    backsplash: backsplashes.includes(analysis.backsplash) ? analysis.backsplash : "Plain Minimal",
  }, measurements);
}
