import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

export type SurfaceTextureKind = "oak" | "walnut" | "stone" | "quartz" | "granite" | "metal" | "porcelain" | "textured";

export function createSurfaceTexture(kind: SurfaceTextureKind) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create the material texture canvas.");

  const seed = kind.length * 971;
  let state = seed;
  const random = () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
  const base = kind === "oak" || kind === "walnut" ? "#F4F2ED"
    : kind === "stone" ? "#e8e4dc"
      : kind === "granite" ? "#777871"
          : kind === "metal" ? "#aaa99f" : kind === "porcelain" ? "#d9d7d0" : kind === "textured" ? "#F7F6F2" : "#e4e2dc";
  context.fillStyle = base;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (kind === "oak" || kind === "walnut") {
    for (let index = 0; index < 140; index += 1) {
      const x = random() * canvas.width;
      context.beginPath();
      context.moveTo(x, 0);
      context.bezierCurveTo(x + random() * 50 - 25, 170, x + random() * 50 - 25, 340, x + random() * 24 - 12, 512);
      context.strokeStyle = random() > 0.5 ? "rgba(102,68,35,.18)" : "rgba(255,255,255,.2)";
      context.lineWidth = random() * 2 + 0.5;
      context.stroke();
    }
  } else if (kind === "stone") {
    for (let index = 0; index < 18; index += 1) {
      const startY = random() * canvas.height;
      context.beginPath();
      context.moveTo(0, startY);
      context.bezierCurveTo(150, startY + random() * 100 - 50, 340, startY + random() * 120 - 60, 512, startY + random() * 90 - 45);
      context.strokeStyle = random() > 0.35 ? "rgba(114,111,105,.24)" : "rgba(255,255,255,.75)";
      context.lineWidth = random() * 2.4 + 0.6;
      context.stroke();
    }
  } else if (kind === "textured") {
    for (let index = 0; index < 1800; index += 1) {
      const shade = random() > 0.5 ? "rgba(70,65,56,.12)" : "rgba(255,255,255,.3)";
      context.fillStyle = shade;
      context.beginPath();
      context.arc(random() * canvas.width, random() * canvas.height, random() * 1.4 + 0.35, 0, Math.PI * 2);
      context.fill();
    }
  } else if (kind === "porcelain") {
    context.strokeStyle = "rgba(110,108,102,.14)";
    context.lineWidth = 2;
    for (let offset = 0; offset <= canvas.width; offset += 128) {
      context.beginPath();
      context.moveTo(offset, 0);
      context.lineTo(offset, canvas.height);
      context.stroke();
      context.beginPath();
      context.moveTo(0, offset);
      context.lineTo(canvas.width, offset);
      context.stroke();
    }
  } else if (kind === "metal") {
    for (let index = 0; index < 200; index += 1) {
      const y = random() * canvas.height;
      context.fillStyle = random() > 0.5 ? "rgba(255,255,255,.2)" : "rgba(40,40,36,.12)";
      context.fillRect(0, y, canvas.width, random() * 1.5 + 0.4);
    }
  } else {
    for (let index = 0; index < 2200; index += 1) {
      const shade = random() > 0.56 ? "rgba(70,70,65,.2)" : "rgba(255,255,255,.65)";
      context.fillStyle = shade;
      context.beginPath();
      context.arc(random() * canvas.width, random() * canvas.height, random() * 1.6 + 0.4, 0, Math.PI * 2);
      context.fill();
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

export function getCabinetTextureKind(colour: string, finish: string): SurfaceTextureKind | null {
  if (finish === "Textured") return "textured";
  if (finish !== "Natural Wood Grain") return null;
  return colour.toLowerCase().includes("walnut") ? "walnut" : "oak";
}

export function getCountertopTextureKind(countertop: string): SurfaceTextureKind {
  if (countertop === "Wooden Countertop") return "oak";
  if (countertop.toLowerCase().includes("marble") || countertop.toLowerCase().includes("stone")) return "stone";
  if (countertop === "Black Granite") return "granite";
  return "quartz";
}

export function getHardwareTextureKind(handle: string): SurfaceTextureKind {
  return handle === "Matte Black" ? "granite" : "metal";
}
