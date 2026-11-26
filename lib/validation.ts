import { z } from "zod";

export const cabinetSchema = z.object({
  id: z.string().min(1).max(100),
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  category: z.enum(["base", "wall", "sink", "drawer", "corner", "pantry"]),
  width: z.number().min(6).max(120),
  height: z.number().min(6).max(120),
  depth: z.number().min(6).max(60),
  quantity: z.number().int().min(1).max(50),
  unitPrice: z.number().min(0).optional(),
  position: z.tuple([z.number(), z.number(), z.number()]),
  wall: z.enum(["back", "left", "right", "front"]),
  rotation: z.number().min(-360).max(360),
});

export const measurementsSchema = z.object({
  length: z.number().min(36).max(480),
  width: z.number().min(36).max(480),
  wallHeight: z.number().min(60).max(240),
  ceilingHeight: z.number().min(60).max(240),
  unit: z.enum(["imperial", "inches"]),
});

export const kitchenDesignSchema = z.object({
  layout: z.enum(["straight", "l", "u", "galley"]),
  measurements: measurementsSchema,
  cabinetInventory: z.array(cabinetSchema).min(1).max(40),
  doorStyle: z.string().min(1).max(60),
  colour: z.string().min(1).max(60),
  colourHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  finish: z.string().min(1).max(60),
  handle: z.string().min(1).max(60),
  countertop: z.string().min(1).max(80),
  backsplash: z.string().min(1).max(80),
  appliances: z.object({
    sink: z.boolean(),
    faucet: z.boolean(),
    cooktop: z.boolean(),
    hood: z.boolean(),
    refrigerator: z.boolean(),
    oven: z.boolean(),
  }),
  accessories: z.array(z.string().max(80)).max(30),
}).strict().transform((design) => ({
  ...design,
  cabinetInventory: design.cabinetInventory.map((cabinet) => ({
    ...cabinet,
    unitPrice: cabinet.unitPrice ?? 0,
  })),
}));

export const imageDataSchema = z.string().max(6_500_000).refine(
  (value) => value === "" || /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value),
  "Image must be a JPEG, PNG, or WebP data URL.",
);

export const designPayloadSchema = z.object({
  title: z.string().trim().min(1).max(100).default("Untitled Kitchen"),
  design: kitchenDesignSchema,
  previewImage: imageDataSchema.optional().default(""),
  aiRenderImage: imageDataSchema.optional().default(""),
});

export type DesignPayload = z.infer<typeof designPayloadSchema>;
