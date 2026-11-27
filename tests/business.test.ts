import { describe, expect, it } from "vitest";
import { cabinetsOverlap, validateMeasurements, recommendCabinets } from "@/lib/recommendation";
import { calculateQuote, cabinetUnitPrice } from "@/lib/pricing";
import { getCameraPreset, computeWideKitchenFraming } from "@/lib/camera";
import { KitchenDesign } from "@/lib/types";
import { formatINR } from "@/lib/currency";
import { kitchenDesignSchema } from "@/lib/validation";
import { bufferToImageDataUrl, buildArchitecturalRenderPrompt, buildSimplifiedRenderPrompt, cloudflareImageDataUrl } from "@/lib/studio-render";
import { applyImageHint, fallbackImageDesign, imageAnalysisToDesign } from "@/lib/image-to-3d";
import { publicAuthError } from "@/lib/auth";

const design: KitchenDesign = {
  layout: "l",
  measurements: { length: 144, width: 120, wallHeight: 96, ceilingHeight: 108, unit: "imperial" },
  cabinetInventory: recommendCabinets("l", 144, 120, 96),
  doorStyle: "Slim Shaker",
  colour: "Warm White",
  finish: "Satin",
  handle: "Brushed Gold",
  countertop: "White Quartz",
  backsplash: "White Subway Tile",
  appliances: { sink: true, faucet: true, cooktop: true, hood: true, refrigerator: true, oven: true },
  accessories: ["Lighting"],
};

describe("3D camera presets", () => {
  it("uses a centered three-quarter perspective and a floor-centered top view", () => {
    const perspective = getCameraPreset("perspective", 12, 10, 9);
    expect(perspective.position[1]).toBeCloseTo(6.12);
    expect(perspective.position[2]).toBeCloseTo(11.5);
    expect(perspective.target).toEqual([0, 2.2, 0]);

    const top = getCameraPreset("top-floor-plan", 12, 10, 9);
    expect(top.position[1]).toBeCloseTo(13.8);
    expect(top.target).toEqual([0, 0, 0]);
  });

  it("frames the entire room bounding box across all layouts and aspect ratios", () => {
    for (const layout of ["straight", "l", "u", "galley"] as const) {
      const cabinets = recommendCabinets(layout, 144, 120, 96);
      for (const aspect of [0.75, 1.33, 1.75]) {
        const framing = computeWideKitchenFraming({
          roomLength: 12,
          roomWidth: 10,
          wallHeight: 8,
          ceilingHeight: 9,
          cabinets,
          fovDeg: 42,
          aspect,
        });
        expect(framing.position[0]).toBeCloseTo(0, 1);
        expect(framing.position[1]).toBeLessThan(9);
        expect(framing.position[2]).toBeGreaterThan(5);
        if (aspect < 1) {
          const desktopFraming = computeWideKitchenFraming({
            roomLength: 12,
            roomWidth: 10,
            wallHeight: 8,
            ceilingHeight: 9,
            cabinets,
            fovDeg: 42,
            aspect: 1.6,
          });
          expect(framing.position[2]).toBeGreaterThan(desktopFraming.position[2]);
        }
      }
    }
  });
});

describe("measurement validation", () => {
  it("rejects invalid dimensions", () => {
    expect(validateMeasurements(0, 120, 96, 108).length).toBeGreaterThan(0);
  });

  describe("authentication diagnostics", () => {
    it("explains MongoDB connectivity and credential failures", () => {
      const networkError = new Error("server selection failed");
      networkError.name = "MongooseServerSelectionError";
      expect(publicAuthError(networkError)).toContain("Atlas Network Access");
      expect(publicAuthError({ code: 18 })).toContain("database credentials");
      expect(publicAuthError({ code: "ETIMEOUT", syscall: "querySrv" })).toContain("DNS lookup timed out");
    });
  });
  it("accepts usable dimensions", () => {
    expect(validateMeasurements(144, 120, 96, 108)).toEqual([]);
  });
});

describe("cabinet recommendations", () => {
  it("creates layout-specific corners", () => {
    const lCabinets = recommendCabinets("l", 144, 120, 96);
    expect(lCabinets.some((cabinet) => cabinet.category === "corner")).toBe(true);
    expect(lCabinets.filter((cabinet) => cabinet.category === "corner").length).toBeGreaterThanOrEqual(1);
  });
  it("adds pantry only for sufficient length", () => {
    expect(recommendCabinets("straight", 96, 120, 96).some((cabinet) => cabinet.category === "pantry")).toBe(false);
    expect(recommendCabinets("straight", 144, 120, 96).some((cabinet) => cabinet.category === "pantry")).toBe(true);
  });
  it("keeps all generated layout cabinet volumes from colliding", () => {
    for (const layout of ["straight", "l", "u", "galley"] as const) {
      const cabinets = recommendCabinets(layout, 144, 120, 96);
      for (let first = 0; first < cabinets.length; first += 1) {
        for (let second = first + 1; second < cabinets.length; second += 1) {
          expect(cabinetsOverlap(cabinets[first], cabinets[second])).toBe(false);
        }
      }
    }
  });
  it("rotates the side arms to their walls", () => {
    const sideCabinets = recommendCabinets("l", 144, 120, 96).filter((cabinet) => cabinet.wall === "left");
    expect(sideCabinets.length).toBeGreaterThan(0);
    expect(sideCabinets.every((cabinet) => cabinet.rotation === 90)).toBe(true);
  });
  it("places galley runs on parallel side walls with an open entry aisle", () => {
    const cabinets = recommendCabinets("galley", 144, 120, 96);
    const leftDepth = Math.max(...cabinets.filter((cabinet) => cabinet.wall === "left").map((cabinet) => cabinet.depth));
    const rightDepth = Math.max(...cabinets.filter((cabinet) => cabinet.wall === "right").map((cabinet) => cabinet.depth));
    expect(cabinets.every((cabinet) => cabinet.wall === "left" || cabinet.wall === "right")).toBe(true);
    expect(cabinets.some((cabinet) => cabinet.wall === "left" && cabinet.rotation === 90)).toBe(true);
    expect(cabinets.some((cabinet) => cabinet.wall === "right" && cabinet.rotation === -90)).toBe(true);
    expect(cabinets.some((cabinet) => cabinet.wall === "right" && cabinet.category === "sink")).toBe(true);
    expect(cabinets.some((cabinet) => cabinet.wall === "right" && cabinet.category === "pantry")).toBe(true);
    expect(144 - leftDepth - rightDepth).toBeGreaterThanOrEqual(42);

    const compactCabinets = recommendCabinets("galley", 80, 120, 96);
    const compactDepth = Math.max(...compactCabinets.map((cabinet) => cabinet.depth));
    expect(80 - 2 * compactDepth).toBeGreaterThanOrEqual(42);
  });
  it("keeps the U-shaped layout open at the front", () => {
    const cabinets = recommendCabinets("u", 144, 120, 96);
    expect(cabinets.some((cabinet) => cabinet.wall === "front")).toBe(false);
    expect(cabinets.every((cabinet) => cabinet.wall !== "front")).toBe(true);
  });
});

describe("pricing", () => {
  it("returns consistent positive totals", () => {
    const quote = calculateQuote(design);
    expect(quote.grandTotal).toBeGreaterThan(quote.subtotal);
    expect(quote.cabinetRows.length).toBe(design.cabinetInventory.length);
  });
  it("changes total when accessories change", () => {
    const base = calculateQuote(design).grandTotal;
    const upgraded = calculateQuote({ ...design, accessories: ["Lighting", "Refrigerator"] }).grandTotal;
    expect(upgraded).toBeGreaterThan(base);
  });
  it("calculates GST at 18% and formats totals as Indian rupees", () => {
    const quote = calculateQuote(design);
    expect(quote.gst).toBe(Math.round(quote.taxable * 0.18));
    expect(formatINR(1250000)).toBe("₹12,50,000");
    expect(calculateQuote({ ...design, countertop: "Wooden Countertop" }).countertopRatePerSqFt).toBe(4200);
  });
  it("uses configured catalog rates and ignores client-supplied unit prices", () => {
    const clientPriced = {
      ...design,
      cabinetInventory: design.cabinetInventory.map((cabinet) => ({ ...cabinet, unitPrice: 1 })),
    };
    expect(calculateQuote(clientPriced).grandTotal).toBe(calculateQuote(design).grandTotal);
    const updatedCatalog = calculateQuote(design, { base: 25000 });
    expect(updatedCatalog.grandTotal).toBeGreaterThan(calculateQuote(design).grandTotal);
  });
  it("normalizes omitted client unit prices and rejects invalid cabinet geometry", () => {
    const parsed = kitchenDesignSchema.parse({
      ...design,
      cabinetInventory: design.cabinetInventory.map((cabinet) => ({ ...cabinet, unitPrice: undefined })),
    });
    expect(parsed.cabinetInventory.every((cabinet) => cabinet.unitPrice === 0)).toBe(true);
    expect(kitchenDesignSchema.safeParse({
      ...design,
      cabinetInventory: [{ ...design.cabinetInventory[0], width: 0 }],
    }).success).toBe(false);
  });
  it("uses Indian modular-cabinet rates and keeps a standard galley quote in range", () => {
    const standardFinish = { ...design, finish: "Matte", doorStyle: "Classic Shaker" };
    expect(cabinetUnitPrice(standardFinish, "base", 30)).toBe(18500);
    expect(cabinetUnitPrice(standardFinish, "wall", 30)).toBe(14200);
    expect(cabinetUnitPrice(standardFinish, "drawer", 30)).toBe(24500);
    expect(cabinetUnitPrice(standardFinish, "sink", 30)).toBe(21000);
    expect(cabinetUnitPrice(standardFinish, "pantry", 24)).toBe(38000);

    const galleyQuote = calculateQuote({
      ...standardFinish,
      layout: "galley",
      cabinetInventory: recommendCabinets("galley", 144, 120, 96),
    });
    expect(galleyQuote.grandTotal).toBeGreaterThanOrEqual(180000);
    expect(galleyQuote.grandTotal).toBeLessThanOrEqual(350000);

    const finishedGalleyQuote = calculateQuote({
      ...design,
      layout: "galley",
      cabinetInventory: recommendCabinets("galley", 144, 120, 96),
      countertop: "Black Granite",
    });
    expect(finishedGalleyQuote.grandTotal).toBeLessThanOrEqual(350000);
  });
  it("accepts a validated sampled cabinet colour", () => {
    const parsed = kitchenDesignSchema.parse({ ...design, colourHex: "#9DA58F" });
    expect(parsed.colourHex).toBe("#9DA58F");
    expect(kitchenDesignSchema.safeParse({ ...design, colourHex: "sage" }).success).toBe(false);
  });
});

describe("image-to-3D design mapping", () => {
  it("normalizes vision output to catalog styles while preserving the sampled hex", () => {
    const matched = imageAnalysisToDesign({
      layout: "u-shaped",
      doorStyle: "Handleless",
      cabinetColorHex: "#123456",
      colorName: "Blue",
      finish: "Gloss",
      countertop: "Carrara Marble",
      backsplash: "Marble",
      handle: "Brass",
    }, design.measurements);
    expect(matched.layout).toBe("u");
    expect(matched.doorStyle).toBe("Handleless Modern");
    expect(matched.colourHex).toBe("#123456");
    expect(matched.finish).toBe("High Gloss");
    expect(matched.countertop).toBe("Carrara-inspired Marble");
    expect(matched.cabinetInventory.length).toBeGreaterThan(1);
  });

  it("uses deterministic fallback profiles for homepage material and door hints", () => {
    const sage = fallbackImageDesign("material-muted-sage", design.measurements);
    const door = fallbackImageDesign("door-flat-slab", design.measurements);
    expect(sage.colourHex).toBe("#9DA58F");
    expect(sage.colour).toBe("Sage Green");
    expect(sage.finish).toBe("Matte");
    expect(door.doorStyle).toBe("Flat Slab");
  });

  it("preserves the known material from a selected homepage material image", () => {
    const analyzed = imageAnalysisToDesign({
      layout: "l-shaped",
      doorStyle: "Slim Shaker",
      cabinetColorHex: "#8A9A82",
      colorName: "Dusty Blue",
      finish: "Matte",
      countertop: "White Quartz",
      backsplash: "Neutral Stone",
      handle: "Brushed Nickel",
    }, design.measurements);
    const matched = applyImageHint(analyzed, "material-muted-sage");
    expect(matched.colour).toBe("Sage Green");
    expect(matched.colourHex).toBe("#9DA58F");
  });
});

describe("studio render providers", () => {
  it("builds wide-angle architectural and simplified prompts matching the 3D kitchen design", () => {
    const prompt = buildArchitecturalRenderPrompt(design, "daylight", "L-shaped warm white slim shaker kitchen with tall pantry on left wall.");
    expect(prompt).toContain("L-shaped corner kitchen");
    expect(prompt).toContain("Warm White");
    expect(prompt).toContain("Slim Shaker");
    expect(prompt).toContain("no kitchen island");
    expect(prompt).toContain("tall pantry on left wall");

    const simplified = buildSimplifiedRenderPrompt(design, "warm-evening");
    expect(simplified).toContain("L-shaped corner kitchen");
    expect(simplified).toContain("warm evening");
    expect(simplified.length).toBeLessThan(prompt.length);
  });

  it("converts a successful Cloudflare image response into a PNG data URL", () => {
    const base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/U3sAAAAASUVORK5CYII=";
    expect(cloudflareImageDataUrl({ success: true, result: { image: base64 } })).toBe(`data:image/png;base64,${base64}`);
  });

  it("preserves Cloudflare JPEG output as a JPEG data URL", () => {
    const base64 = Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString("base64");
    expect(cloudflareImageDataUrl({ success: true, result: { image: base64 } })).toBe(`data:image/jpeg;base64,${base64}`);
  });

  it("rejects unsuccessful Cloudflare image responses", () => {
    expect(() => cloudflareImageDataUrl({ success: false, errors: [{ message: "rate limited" }] })).toThrow();
  });

  it("converts binary JPEG and PNG buffers from fallback providers into data URLs", () => {
    const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(bufferToImageDataUrl(jpegBuf)).toMatch(/^data:image\/jpeg;base64,/);
    expect(bufferToImageDataUrl(pngBuf)).toMatch(/^data:image\/png;base64,/);
    expect(() => bufferToImageDataUrl(Buffer.from('{"error":"bad"}'), "application/json")).toThrow();
  });
});
