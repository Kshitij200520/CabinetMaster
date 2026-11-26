import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recommendCabinets } from "@/lib/recommendation";
import { cabinetColours, countertops, doorStyles, finishes, handles } from "@/lib/catalog";
import { kitchenDesignSchema, imageDataSchema, measurementsSchema } from "@/lib/validation";
import { sessionFromRequest } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { calculateQuote } from "@/lib/pricing";
import type { KitchenDesign } from "@/lib/types";

const requestSchema = z.object({
  prompt: z.string().trim().min(3).max(1200),
  budgetINR: z.number().int().min(50_000).max(10_000_000).optional(),
  measurements: measurementsSchema,
  roomPhoto: imageDataSchema.optional().default(""),
});

const recommendationSchema = z.object({
  layout: z.enum(["straight", "l", "u", "galley"]),
  doorStyle: z.string(),
  colour: z.string(),
  finish: z.string(),
  countertop: z.string(),
  handle: z.string(),
  tips: z.array(z.string().max(240)).max(5),
});

type Recommendation = z.infer<typeof recommendationSchema>;

function pick<T extends string>(value: string, options: readonly T[], fallback: T) {
  return options.find((option) => option.toLowerCase() === value.toLowerCase()) ?? fallback;
}

function deterministicRecommendation(prompt: string): Recommendation {
  const text = prompt.toLowerCase();
  const layout = text.includes("galley") ? "galley" : text.includes("u-shaped") || text.includes("u shape") ? "u" : text.includes("straight") ? "straight" : "l";
  const colourOptions = cabinetColours.map(([name]) => name);
  const preferredColour = text.includes("sage") ? "Sage Green" : text.includes("walnut") ? "Walnut" : text.includes("oak") ? "Natural Oak" : text.includes("charcoal") ? "Charcoal" : "Warm White";
  const preferredCounter = text.includes("carrara") || text.includes("marble") ? "Carrara-inspired Marble" : text.includes("granite") ? "Black Granite" : "White Quartz";
  const preferredDoor = text.includes("glass") ? "Glass Front" : text.includes("flat slab") || text.includes("slab") ? "Flat Slab" : text.includes("classic shaker") ? "Classic Shaker" : text.includes("slim shaker") ? "Slim Shaker" : "Slim Shaker";
  const preferredHandle = text.includes("brass") || text.includes("gold") ? "Brushed Gold" : text.includes("black handle") ? "Matte Black" : "Brushed Nickel";
  return {
    layout,
    doorStyle: pick(preferredDoor, doorStyles.map((style) => style.name), "Slim Shaker"),
    colour: pick(preferredColour, colourOptions, "Warm White"),
    finish: pick(text.includes("gloss") ? "High Gloss" : text.includes("wood grain") ? "Natural Wood Grain" : "Matte", finishes, "Matte"),
    countertop: pick(preferredCounter, countertops, "White Quartz"),
    handle: pick(preferredHandle, handles, "Brushed Nickel"),
    tips: ["Confirm appliance clearances before installation.", "Keep the sink, hob, and primary prep surface within a comfortable work triangle."],
  };
}

function cleanRecommendation(value: unknown): Recommendation | null {
  const parsed = recommendationSchema.safeParse(value);
  if (!parsed.success) return null;
  const candidate = parsed.data;
  return {
    ...candidate,
    doorStyle: pick(candidate.doorStyle, doorStyles.map((style) => style.name), "Slim Shaker"),
    colour: pick(candidate.colour, cabinetColours.map(([name]) => name), "Warm White"),
    finish: pick(candidate.finish, finishes, "Matte"),
    countertop: pick(candidate.countertop, countertops, "White Quartz"),
    handle: pick(candidate.handle, handles, "Brushed Nickel"),
    tips: candidate.tips.slice(0, 3),
  };
}

async function groqRecommendation(
  prompt: string,
  dimensions: z.infer<typeof kitchenDesignSchema>["measurements"],
  budgetINR?: number,
  roomPhoto = "",
) {
  const userContent = [
    { type: "text", text: JSON.stringify({ request: prompt, roomDimensionsInches: dimensions, budgetINR: budgetINR ?? null }) },
    ...(roomPhoto ? [{ type: "image_url", image_url: { url: roomPhoto } }] : []),
  ];
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen/qwen3.8-27b",
      temperature: 0.2,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `Return JSON only with layout, doorStyle, colour, finish, countertop, handle, tips. Choose only exact values from: layout ["straight","l","u","galley"]; doorStyle ${JSON.stringify(doorStyles.map((style) => style.name))}; colour ${JSON.stringify(cabinetColours.map(([name]) => name))}; finish ${JSON.stringify(finishes)}; countertop ${JSON.stringify(countertops)}; handle ${JSON.stringify(handles)}. tips is an array of up to three short practical design notes. Do not return cabinet prices or invent product SKUs.` },
        { role: "user", content: userContent },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Groq recommendation failed (${response.status}).`);
  const data = await response.json() as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned an empty recommendation.");
  return JSON.parse(content) as unknown;
}

export async function POST(request: NextRequest) {
  try {
    const session = await sessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "Sign in to use the AI Studio Advisor." }, { status: 401 });
    const throttle = rateLimit(`advisor:${session.userId}`, 10, 60_000);
    if (!throttle.allowed) {
      return NextResponse.json({ error: "Advisor limit reached. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } });
    }
    const body = requestSchema.parse(await request.json());
    let recommendation: Recommendation;
    let source = "local-guidance";
    if (process.env.GROQ_API_KEY) {
      try {
        const ai = await groqRecommendation(
          body.prompt,
          body.measurements,
          body.budgetINR,
          body.roomPhoto,
        );
        const cleaned = cleanRecommendation(ai);
        recommendation = cleaned ?? deterministicRecommendation(body.prompt);
        source = cleaned ? "groq" : "local-validation-fallback";
      } catch {
        console.warn("Groq design recommendation failed; using deterministic kitchen guidance.");
        recommendation = deterministicRecommendation(body.prompt);
        source = "local-guidance-fallback";
      }
    } else {
      recommendation = deterministicRecommendation(body.prompt);
    }
    const cabinets = recommendCabinets(
      recommendation.layout,
      body.measurements.length,
      body.measurements.width,
      body.measurements.wallHeight,
    );
    const suggestedDesign: KitchenDesign = {
      layout: recommendation.layout,
      measurements: body.measurements,
      cabinetInventory: cabinets,
      doorStyle: recommendation.doorStyle,
      colour: recommendation.colour,
      finish: recommendation.finish,
      handle: recommendation.handle,
      countertop: recommendation.countertop,
      backsplash: "Plain Minimal",
      appliances: { sink: true, faucet: true, cooktop: true, hood: true, refrigerator: true, oven: true },
      accessories: ["Lighting"],
    };
    const estimate = calculateQuote(suggestedDesign);
    recommendation.tips.unshift("Indicative estimate uses standard INR rates; the final quote uses the live product catalog.");
    if (body.budgetINR && estimate.grandTotal > body.budgetINR) {
      recommendation.tips.unshift(`Estimated at ${estimate.grandTotal.toLocaleString("en-IN")} INR, above your budget. Consider a shorter cabinet run or a more economical finish.`);
    }
    return NextResponse.json({
      recommendation: {
        ...recommendation,
        cabinets,
        estimatedTotalINR: estimate.grandTotal,
        withinBudget: body.budgetINR ? estimate.grandTotal <= body.budgetINR : null,
      },
      source,
      budgetINR: body.budgetINR ?? null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter a design request with valid room dimensions." }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to prepare a recommendation." }, { status: 503 });
  }
}
