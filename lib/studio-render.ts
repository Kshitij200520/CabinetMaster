import type { KitchenDesign, LightingMood } from "@/lib/types";

export function cloudflareImageDataUrl(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Cloudflare Workers AI returned an invalid response.");
  }
  const response = payload as { success?: unknown; result?: { image?: unknown } };
  const base64 = response.result?.image;
  if (response.success !== true || typeof base64 !== "string" || !base64 || base64.length > 6_400_000) {
    throw new Error("Cloudflare Workers AI returned no usable image.");
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new Error("Cloudflare Workers AI returned an invalid image.");
  }
  const image = Buffer.from(base64, "base64");
  if (!image.length || image.length > 4_800_000) {
    throw new Error("Cloudflare Workers AI image exceeds the storage limit.");
  }
  const isPng = image.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
  if (!isPng && !isJpeg) throw new Error("Cloudflare Workers AI returned an unsupported image format.");
  return `data:image/${isPng ? "png" : "jpeg"};base64,${base64}`;
}

export function bufferToImageDataUrl(raw: ArrayBuffer | Buffer, contentTypeHint?: string | null) {
  const image = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
  if (!image.length || image.length > 4_800_000) {
    throw new Error("Generated render image is empty or exceeds the storage limit.");
  }
  const isPng = image.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
  const isWebp = image.subarray(0, 4).toString("ascii") === "RIFF" && image.subarray(8, 12).toString("ascii") === "WEBP";

  let mime: "image/png" | "image/jpeg" | "image/webp" | null = isPng ? "image/png"
    : isJpeg ? "image/jpeg"
      : isWebp ? "image/webp" : null;

  if (!mime && contentTypeHint) {
    const normalized = contentTypeHint.toLowerCase().split(";")[0].trim();
    if (normalized === "image/png" || normalized === "image/jpeg" || normalized === "image/webp") {
      mime = normalized;
    }
  }
  if (!mime) {
    throw new Error("Inference provider returned an unsupported or non-image payload.");
  }
  return `data:${mime};base64,${image.toString("base64")}`;
}

function layoutDescription(layout: KitchenDesign["layout"]) {
  switch (layout) {
    case "straight":
      return "single-wall straight kitchen along the back wall with an open foreground and no kitchen island";
    case "l":
      return "L-shaped corner kitchen along the back and left walls with an open right side and no kitchen island";
    case "u":
      return "U-shaped kitchen wrapping around the back, left, and right walls with an open center floor and no kitchen island";
    case "galley":
      return "galley kitchen with two parallel cabinetry runs on the left and right walls, an open center walkway, and no kitchen island";
  }
}

function lightingDescription(mood: LightingMood) {
  switch (mood) {
    case "daylight":
      return "bright natural architectural daylight, crisp realistic shadows";
    case "warm-evening":
      return "warm evening architectural lighting with soft ceiling light and warm wood/stone reflections";
    case "under-cabinet-led":
      return "warm under-cabinet LED strip lighting illuminating the backsplash and countertops";
  }
}

function summarizeWallCabinets(design: KitchenDesign) {
  const walls = ["back", "left", "right", "front"] as const;
  const parts: string[] = [];
  for (const wall of walls) {
    const items = design.cabinetInventory.filter((cabinet) => cabinet.wall === wall);
    if (!items.length) continue;
    const names = items.map((item) => item.name.toLowerCase());
    parts.push(`${wall} wall has ${items.length} units (${names.slice(0, 5).join(", ")}${items.length > 5 ? ", etc." : ""})`);
  }
  return parts.join("; ");
}

export function buildArchitecturalRenderPrompt(
  design: KitchenDesign,
  lightingMood: LightingMood,
  visualNotes = "",
) {
  const colourSpec = design.colourHex ? `${design.colour} (${design.colourHex})` : design.colour;
  const applianceList = [
    design.appliances.sink ? "undermount sink with faucet" : "",
    design.appliances.cooktop ? "built-in cooktop" : "",
    design.appliances.hood ? "chimney range hood" : "",
    design.appliances.oven ? "built-in oven" : "",
    design.appliances.refrigerator ? "integrated refrigerator" : "",
  ].filter(Boolean).join(", ");
  const wallSummary = summarizeWallCabinets(design);

  return [
    `Wide-angle full-room architectural interior photograph of a ${layoutDescription(design.layout)}, framed symmetrically wall-to-wall and floor-to-ceiling so the entire kitchen fits cleanly in view.`,
    `${colourSpec} ${design.finish.toLowerCase()} ${design.doorStyle} cabinetry with ${design.handle} handles, ${design.countertop} countertops, and ${design.backsplash} backsplash.`,
    wallSummary ? `Cabinet layout: ${wallSummary}.` : "",
    applianceList ? `Visible fixtures: ${applianceList}.` : "",
    visualNotes ? `Exact 3D scene details: ${visualNotes.slice(0, 420)}.` : "",
    `Lighting: ${lightingDescription(lightingMood)}. Photorealistic bespoke millwork, crisp joinery, clean floor, no people, no text, no watermark.`,
  ].filter(Boolean).join(" ");
}

export function buildSimplifiedRenderPrompt(design: KitchenDesign, lightingMood: LightingMood) {
  const colourSpec = design.colourHex ? `${design.colour} (${design.colourHex})` : design.colour;
  return [
    `Wide-angle full-room architectural interior photograph of a ${layoutDescription(design.layout)}, framed wall-to-wall and floor-to-ceiling.`,
    `${colourSpec} ${design.finish.toLowerCase()} ${design.doorStyle} kitchen cabinets, ${design.countertop} countertops, ${design.backsplash} backsplash, ${design.handle} handles.`,
    `${lightingDescription(lightingMood)}, photorealistic interior photography, no text, no people.`,
  ].join(" ");
}
