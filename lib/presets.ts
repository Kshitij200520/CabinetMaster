import { LayoutType } from "@/lib/types";

export interface KitchenPreset {
  name: string;
  layout: LayoutType;
  doorStyle: string;
  colour: string;
  finish: string;
  countertop: string;
  handle: string;
  backsplash: string;
  description: string;
  finishes: string;
  startingPrice: number;
  image: string;
}

export const KITCHEN_PRESETS = {
  "modern-minimalist": {
    name: "Modern Minimalist",
    layout: "straight",
    doorStyle: "Flat Slab",
    colour: "Warm White",
    finish: "Matte",
    countertop: "White Quartz",
    handle: "Handleless",
    backsplash: "Plain Minimal",
    description: "Sculpted simplicity",
    finishes: "Matte Ivory · Veined Quartz",
    startingPrice: 185000,
    image: "/cabinet-studio/collection-minimal.jpg",
  },
  "scandinavian-oak": {
    name: "Scandinavian Oak",
    layout: "l",
    doorStyle: "Slim Shaker",
    colour: "Natural Oak",
    finish: "Natural Wood Grain",
    countertop: "White Quartz",
    handle: "Brushed Nickel",
    backsplash: "Neutral Stone",
    description: "Warmth, naturally",
    finishes: "Natural Oak · White Quartz",
    startingPrice: 215000,
    image: "/cabinet-studio/collection-oak.jpg",
  },
  "contemporary-luxury": {
    name: "Contemporary Luxury",
    layout: "u",
    doorStyle: "Flat Slab",
    colour: "Walnut",
    finish: "Natural Wood Grain",
    countertop: "Calacatta-inspired Marble",
    handle: "Brushed Brass",
    backsplash: "Marble",
    description: "A richer point of view",
    finishes: "Dark Walnut · Marble",
    startingPrice: 325000,
    image: "/cabinet-studio/collection-contemporary-luxury.jpeg",
  },
  "classic-shaker": {
    name: "Classic Shaker",
    layout: "l",
    doorStyle: "Classic Shaker",
    colour: "Warm White",
    finish: "Satin",
    countertop: "White Marble",
    handle: "Brushed Gold",
    backsplash: "White Subway Tile",
    description: "Quietly enduring",
    finishes: "Soft White · Brushed Brass",
    startingPrice: 198000,
    image: "/cabinet-studio/collection-shaker.jpg",
  },
  "sage-brass": {
    name: "Sage & Brass",
    layout: "l",
    doorStyle: "Slim Shaker",
    colour: "Sage Green",
    finish: "Matte",
    countertop: "White Quartz",
    handle: "Brushed Gold",
    backsplash: "Neutral Stone",
    description: "Soft colour, warm detail",
    finishes: "Muted Sage · Brushed Brass",
    startingPrice: 249000,
    image: "/cabinet-studio/material-muted-sage.png",
  },
  "luxury-walnut": {
    name: "Luxury Walnut",
    layout: "u",
    doorStyle: "Glass Front",
    colour: "Walnut",
    finish: "Natural Wood Grain",
    countertop: "Black Granite",
    handle: "Brushed Brass",
    backsplash: "Marble",
    description: "A warm architectural statement",
    finishes: "American Walnut · Honed Granite",
    startingPrice: 385000,
    image: "/cabinet-studio/collection-walnut.jpg",
  },
} as const satisfies Record<string, KitchenPreset>;

export const DOOR_PRESETS = {
  "classic-shaker": { name: "Classic Shaker", doorStyle: "Classic Shaker" },
  "slim-shaker": { name: "Slim Shaker", doorStyle: "Slim Shaker" },
  "flat-slab": { name: "Flat Slab", doorStyle: "Flat Slab" },
  "glass-front": { name: "Glass Front", doorStyle: "Glass Front" },
} as const;

export type KitchenPresetId = keyof typeof KITCHEN_PRESETS;
export type DoorPresetId = keyof typeof DOOR_PRESETS;
