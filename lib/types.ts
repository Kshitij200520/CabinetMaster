export type LayoutType = "straight" | "l" | "u" | "galley";
export type UnitSystem = "imperial" | "inches";
export type CabinetCategory = "base" | "wall" | "sink" | "drawer" | "corner" | "pantry";
export type LightingMood = "daylight" | "warm-evening" | "under-cabinet-led";
export type CameraAngle = "perspective" | "front-elevation" | "top-floor-plan" | "close-up-hardware";

export interface Measurements {
  length: number;
  width: number;
  wallHeight: number;
  ceilingHeight: number;
  unit: UnitSystem;
}

export interface Cabinet {
  id: string;
  sku: string;
  name: string;
  category: CabinetCategory;
  width: number;
  height: number;
  depth: number;
  quantity: number;
  unitPrice: number;
  position: [number, number, number];
  wall: "back" | "left" | "right" | "front";
  rotation: number;
}

export interface KitchenDesign {
  layout: LayoutType;
  measurements: Measurements;
  cabinetInventory: Cabinet[];
  doorStyle: string;
  colour: string;
  colourHex?: string;
  finish: string;
  handle: string;
  countertop: string;
  backsplash: string;
  appliances: {
    sink: boolean;
    faucet: boolean;
    cooktop: boolean;
    hood: boolean;
    refrigerator: boolean;
    oven: boolean;
  };
  accessories: string[];
}
