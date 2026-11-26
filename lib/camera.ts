import type { CameraAngle } from "@/lib/types";

export type CameraVector = [number, number, number];

export interface CameraPresetCoordinates {
  position: CameraVector;
  target: CameraVector;
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
