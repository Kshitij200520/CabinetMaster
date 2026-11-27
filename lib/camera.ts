import type { Cabinet, CameraAngle } from "@/lib/types";

export type CameraVector = [number, number, number];

export interface CameraPresetCoordinates {
  position: CameraVector;
  target: CameraVector;
}

export interface WideFramingOptions {
  roomLength: number;
  roomWidth: number;
  wallHeight: number;
  ceilingHeight: number;
  cabinets?: Cabinet[];
  fovDeg?: number;
  aspect?: number;
}

function normalize(v: CameraVector): CameraVector {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function cross(a: CameraVector, b: CameraVector): CameraVector {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: CameraVector, b: CameraVector): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Computes a wide architectural camera position and target from the open front (+Z)
 * that fits the full kitchen room bounding box (wall-to-wall, floor-to-ceiling)
 * inside the viewport with comfortable margin on any aspect ratio.
 */
export function computeWideKitchenFraming({
  roomLength,
  roomWidth,
  wallHeight,
  ceilingHeight,
  cabinets = [],
  fovDeg = 42,
  aspect = 1.33,
}: WideFramingOptions): CameraPresetCoordinates {
  let minX = -roomLength / 2;
  let maxX = roomLength / 2;
  let minY = 0;
  let maxY = Math.max(wallHeight, ceilingHeight);
  let minZ = -roomWidth / 2;
  let maxZ = roomWidth / 2;

  for (const cabinet of cabinets) {
    const cx = cabinet.position[0] / 12;
    const cy = cabinet.position[1] / 12;
    const cz = cabinet.position[2] / 12;
    const rotated = Math.abs(Math.round(cabinet.rotation ?? 0)) % 180 === 90;
    const halfW = (rotated ? cabinet.depth : cabinet.width) / 24;
    const halfD = (rotated ? cabinet.width : cabinet.depth) / 24;
    const halfH = cabinet.height / 24;
    minX = Math.min(minX, cx - halfW);
    maxX = Math.max(maxX, cx + halfW);
    minY = Math.min(minY, cy - halfH);
    maxY = Math.max(maxY, cy + halfH);
    minZ = Math.min(minZ, cz - halfD);
    maxZ = Math.max(maxZ, cz + halfD);
  }

  const centerX = (minX + maxX) / 2;
  const targetY = (minY + maxY) * 0.44;
  const centerZ = (minZ + maxZ) / 2 - (maxZ - minZ) * 0.04;
  const target: CameraVector = [centerX, targetY, centerZ];

  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const tanHalfV = Math.tan(((fovDeg * Math.PI) / 180) / 2);
  const tanHalfH = tanHalfV * Math.max(aspect, 0.35);

  const camY = Math.min(Math.max(maxY * 0.56, 2.5), Math.max(2.5, ceilingHeight - 0.3));
  let offsetZ = Math.max((spanX * 0.62) / tanHalfH, (spanY * 0.62) / tanHalfV, 4);

  const corners: CameraVector[] = [
    [minX, minY, minZ],
    [maxX, minY, minZ],
    [minX, maxY, minZ],
    [maxX, maxY, minZ],
    [minX, minY, maxZ],
    [maxX, minY, maxZ],
    [minX, maxY, maxZ],
    [maxX, maxY, maxZ],
  ];

  const maxNdcLimit = 0.86;
  for (let step = 0; step < 28; step += 1) {
    const camPos: CameraVector = [centerX, camY, maxZ + offsetZ];
    const forward = normalize([
      target[0] - camPos[0],
      target[1] - camPos[1],
      target[2] - camPos[2],
    ]);
    const right = normalize(cross(forward, [0, 1, 0]));
    const up = cross(right, forward);

    let fits = true;
    for (const corner of corners) {
      const rel: CameraVector = [
        corner[0] - camPos[0],
        corner[1] - camPos[1],
        corner[2] - camPos[2],
      ];
      const zView = dot(rel, forward);
      if (zView <= 0.5) {
        fits = false;
        break;
      }
      const ndcX = Math.abs(dot(rel, right) / (zView * tanHalfH));
      const ndcY = Math.abs(dot(rel, up) / (zView * tanHalfV));
      if (ndcX > maxNdcLimit || ndcY > maxNdcLimit) {
        fits = false;
        break;
      }
    }
    if (fits) {
      return { position: camPos, target };
    }
    offsetZ *= 1.08;
  }

  return { position: [centerX, camY, maxZ + offsetZ], target };
}

export function getCameraPreset(
  angle: CameraAngle,
  length: number,
  width: number,
  ceiling: number,
): CameraPresetCoordinates {
  const positions: Record<CameraAngle, CameraVector> = {
    perspective: [0, ceiling * 0.68, width * 1.15],
    "front-elevation": [0, Math.min(ceiling * 0.55, 5.5), width * 1.15],
    "top-floor-plan": [0, Math.max(length, width) * 1.15, 0.01],
    "close-up-hardware": [length * 0.08, 3.3, width * 0.3],
  };
  return {
    position: positions[angle],
    target: angle === "top-floor-plan" ? [0, 0, 0] : [0, 2.2, 0],
  };
}
