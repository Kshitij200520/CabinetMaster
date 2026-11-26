import { readFile } from "node:fs/promises";
import path from "node:path";

type RenderStyle = {
  colour: string;
  doorStyle: string;
};

const curatedRenderFiles = {
  contemporary: "collection-contemporary-luxury.jpeg",
  oak: "collection-oak.jpg",
  shaker: "collection-shaker.jpg",
  walnut: "collection-walnut.jpg",
} as const;

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

export function createCloudflareRenderForm(prompt: string, snapshotBase64: string) {
  if (prompt.length > 2048) throw new Error("The kitchen specification is too long for the image renderer.");
  const match = snapshotBase64.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) throw new Error("The captured studio image is invalid.");
  const mime = match[1];
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length) throw new Error("The captured studio image is empty.");
  const extension = mime === "image/jpeg" ? "jpg" : mime.slice("image/".length);
  const form = new FormData();
  form.set("prompt", prompt);
  form.set("input_image_0", new Blob([bytes], { type: mime }), `live-3d-kitchen.${extension}`);
  form.set("width", "1024");
  form.set("height", "768");
  return form;
}

export async function curatedStudioRender(style: RenderStyle) {
  const colour = style.colour.toLowerCase();
  const doorStyle = style.doorStyle.toLowerCase();
  const file = colour.includes("walnut")
    ? curatedRenderFiles.walnut
    : colour.includes("oak")
      ? curatedRenderFiles.oak
      : doorStyle.includes("shaker")
        ? curatedRenderFiles.shaker
        : curatedRenderFiles.contemporary;
  const image = await readFile(path.join(process.cwd(), "public", "cabinet-studio", file));
  if (image.length > 4_800_000) {
    throw new Error("Curated studio preview exceeds the image storage limit.");
  }
  return `data:image/jpeg;base64,${image.toString("base64")}`;
}
