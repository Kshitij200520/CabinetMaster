import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sessionFromRequest } from "@/lib/auth";
import { applyImageHint, fallbackImageDesign, imageAnalysisToDesign } from "@/lib/image-to-3d";
import { rateLimit } from "@/lib/rate-limit";
import { imageDataSchema, measurementsSchema } from "@/lib/validation";

export const maxDuration = 30;

const requestSchema = z.object({
  imageUrl: z.string().trim().max(2048).optional().default(""),
  imageBase64: imageDataSchema.optional().default(""),
  presetHint: z.string().trim().max(80).optional().default(""),
  measurements: measurementsSchema.optional(),
}).refine((body) => Boolean(body.imageUrl || body.imageBase64), {
  message: "Provide an image URL or image data.",
});

async function localImageDataUrl(imageUrl: string) {
  const pathname = decodeURIComponent(new URL(imageUrl, "http://cabinet-studio.local").pathname);
  if (!pathname.startsWith("/cabinet-studio/")) throw new Error("Only local Cabinet Studio reference images are supported.");
  const publicRoot = path.resolve(process.cwd(), "public");
  const imagePath = path.resolve(publicRoot, pathname.slice(1));
  const relativePath = path.relative(publicRoot, imagePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) throw new Error("Invalid reference image path.");
  const contentType = path.extname(imagePath).toLowerCase() === ".png" ? "image/png"
    : path.extname(imagePath).toLowerCase() === ".webp" ? "image/webp"
      : path.extname(imagePath).toLowerCase() === ".jpg" || path.extname(imagePath).toLowerCase() === ".jpeg" ? "image/jpeg" : "";
  if (!contentType) throw new Error("Reference image must be PNG, JPEG, or WebP.");
  const fileStat = await stat(imagePath);
  if (!fileStat.isFile() || fileStat.size > 4_000_000) throw new Error("Reference image is missing or larger than 4 MB.");
  const image = await readFile(imagePath);
  return `data:${contentType};base64,${image.toString("base64")}`;
}

async function groqImageAnalysis(image: string, presetHint: string) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen/qwen3.8-27b",
      temperature: 0.1,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Inspect the reference kitchen photo and return JSON only with layout, doorStyle, cabinetColorHex, colorName, finish, countertop, backsplash, and handle. Estimate the visible cabinetry and finishes from the photo; do not infer hidden walls or exact room dimensions. Choose layout from ["straight","l-shaped","u-shaped","galley"], doorStyle from ["Classic Shaker","Slim Shaker","Flat Slab","Raised Panel","Handleless","Glass Front"], finish from ["Natural Wood Grain","Matte","Satin","Gloss","Textured"], countertop from ["White Quartz","Carrara Marble","Calacatta Marble","Black Granite","Wooden Countertop"], backsplash from ["White Subway Tile","Marble","Neutral Stone","Textured Ceramic","Plain Minimal"], and handle from ["Brushed Gold","Matte Black","Chrome","Brushed Nickel","Brass","Handleless"]. cabinetColorHex must be a representative six-digit hex estimate for the cabinet fronts.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Analyze visible finishes and cabinet arrangement. Preset hint (only a fallback clue): ${presetHint || "none"}` },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Groq image analysis returned ${response.status}.`);
  const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq image analysis returned an empty response.");
  return JSON.parse(content) as unknown;
}

export async function POST(request: NextRequest) {
  try {
    const body = requestSchema.parse(await request.json());
    const session = await sessionFromRequest(request);
    const identity = session?.userId ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
    const throttle = rateLimit(`image-to-3d:${identity}`, 8, 60_000);
    if (!throttle.allowed) {
      return NextResponse.json({ error: "Image analysis limit reached. Please try again shortly." }, {
        status: 429,
        headers: { "Retry-After": String(throttle.retryAfterSeconds) },
      });
    }

    const measurements = body.measurements ?? {
      length: 144,
      width: 120,
      wallHeight: 96,
      ceilingHeight: 108,
      unit: "imperial" as const,
    };
    let design = fallbackImageDesign(body.presetHint, measurements);
    let source: "groq-vision" | "preset-fallback" | "analysis-fallback" = "preset-fallback";

    if (process.env.GROQ_API_KEY) {
      try {
        const image = body.imageBase64 || await localImageDataUrl(body.imageUrl);
        design = applyImageHint(
          imageAnalysisToDesign(await groqImageAnalysis(image, body.presetHint), measurements),
          body.presetHint,
        );
        source = "groq-vision";
      } catch {
        console.warn("Groq image-to-3D analysis failed; applying the deterministic preset fallback.");
        source = "analysis-fallback";
      }
    }

    return NextResponse.json({
      design,
      cabinetColorHex: design.colourHex,
      colorName: design.colour,
      source,
      note: "Visual match estimate; unseen walls and exact room dimensions are inferred.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Provide a valid reference image and kitchen dimensions." }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to analyze this reference image." }, { status: 400 });
  }
}
