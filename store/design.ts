"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Cabinet, KitchenDesign, LayoutType } from "@/lib/types";
import { findAvailableWallPosition, recommendCabinets } from "@/lib/recommendation";
import { KitchenPreset } from "@/lib/presets";

const initialDesign: KitchenDesign = {
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

interface DesignStore {
  design: KitchenDesign;
  selectedCabinetId: string | null;
  setDesign: (patch: Partial<KitchenDesign>) => void;
  applyPreset: (preset: KitchenPreset) => void;
  setMeasurements: (patch: Partial<KitchenDesign["measurements"]>) => void;
  setLayout: (layout: LayoutType) => void;
  updateCabinet: (id: string, patch: Partial<Cabinet>) => void;
  addCabinet: () => boolean;
  removeCabinet: (id: string) => void;
  reset: () => void;
  setSelectedCabinetId: (id: string | null) => void;
}

export const useDesignStore = create<DesignStore>()(
  persist(
    (set, get) => ({
      design: initialDesign,
      selectedCabinetId: null,
      setDesign: (patch) => set((state) => ({ design: { ...state.design, ...patch } })),
      applyPreset: (preset) => set((state) => ({
        design: {
          ...state.design,
          layout: preset.layout,
          doorStyle: preset.doorStyle,
          colour: preset.colour,
          colourHex: undefined,
          finish: preset.finish,
          countertop: preset.countertop,
          handle: preset.handle,
          backsplash: preset.backsplash,
          cabinetInventory: recommendCabinets(
            preset.layout,
            state.design.measurements.length,
            state.design.measurements.width,
            state.design.measurements.wallHeight,
          ),
        },
        selectedCabinetId: null,
      })),
      setMeasurements: (patch) => set((state) => {
        const measurements = { ...state.design.measurements, ...patch };
        const cabinetInventory = recommendCabinets(state.design.layout, measurements.length, measurements.width, measurements.wallHeight);
        return { design: { ...state.design, measurements, cabinetInventory } };
      }),
      setLayout: (layout) => set((state) => ({
        design: {
          ...state.design,
          layout,
          cabinetInventory: recommendCabinets(layout, state.design.measurements.length, state.design.measurements.width, state.design.measurements.wallHeight),
        },
        selectedCabinetId: null,
      })),
      updateCabinet: (id, patch) => set((state) => ({
        design: { ...state.design, cabinetInventory: state.design.cabinetInventory.map((item) => item.id === id ? { ...item, ...patch } : item) },
      })),
      addCabinet: () => {
        const state = get();
        const { length, width } = state.design.measurements;
        const placement = findAvailableWallPosition(state.design.cabinetInventory, length, width);
        if (!placement) return false;
        const id = `CUSTOM-${Date.now()}`;
        set((current) => ({
          design: {
            ...current.design,
            cabinetInventory: [
              ...current.design.cabinetInventory,
              { id, sku: "BASE-030", name: "Custom Base Cabinet", category: "base", width: 30, height: 34, depth: 24, quantity: 1, unitPrice: 0, ...placement },
            ],
          },
        }));
        return true;
      },
      removeCabinet: (id) => set((state) => ({
        design: { ...state.design, cabinetInventory: state.design.cabinetInventory.filter((item) => item.id !== id) },
      })),
      reset: () => set({ design: initialDesign, selectedCabinetId: null }),
      setSelectedCabinetId: (id) => set({ selectedCabinetId: id }),
    }),
    { name: "cabinet-studio-design" },
  ),
);
