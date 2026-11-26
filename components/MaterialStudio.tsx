"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { colourValue } from "@/lib/catalog";
import { formatINR } from "@/lib/currency";
import { getCabinetTextureKind, getCountertopTextureKind, getHardwareTextureKind, createSurfaceTexture } from "@/lib/surfaceTextures";
import { KitchenDesign } from "@/lib/types";
import { useDesignStore } from "@/store/design";
import { ArrowRight } from "lucide-react";

function MaterialSamples({ design }: { design: KitchenDesign }) {
  const textures = useMemo(() => {
    const cabinetKind = getCabinetTextureKind(design.colour, design.finish);
    return {
      cabinet: cabinetKind ? createSurfaceTexture(cabinetKind) : createSurfaceTexture("quartz"),
      stone: createSurfaceTexture(getCountertopTextureKind(design.countertop)),
      metal: createSurfaceTexture(getHardwareTextureKind(design.handle)),
    };
  }, [design.colour, design.countertop, design.finish, design.handle]);

  useEffect(() => () => {
    textures.cabinet.dispose();
    textures.stone.dispose();
    textures.metal.dispose();
  }, [textures]);

  const hardwareColour = design.handle === "Matte Black" ? "#272824"
    : design.handle === "Brushed Nickel" || design.handle === "Chrome" ? "#a5a9a7" : "#b38b62";
  return (
    <>
      <color attach="background" args={["#eeece4"]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[4, 7, 5]} intensity={2.2} />
      <Environment preset="apartment" />
      <mesh position={[-2.15, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.22, 1.65]} />
        <meshStandardMaterial color={colourValue(design.colour, design.colourHex)} map={textures.cabinet} roughness={design.finish === "High Gloss" ? 0.18 : design.finish === "Textured" ? 0.78 : 0.6} />
      </mesh>
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.22, 1.65]} />
        <meshStandardMaterial color={design.countertop === "Wooden Countertop" ? "#B68A52" : "#ffffff"} map={textures.stone} roughness={0.28} />
      </mesh>
      <mesh position={[2.15, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.45, 0.1, 0.6]} />
        <meshStandardMaterial color={hardwareColour} map={textures.metal} metalness={0.82} roughness={0.24} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[9, 5]} />
        <meshStandardMaterial color="#d8d5cd" roughness={0.72} />
      </mesh>
      <OrbitControls enablePan={false} minDistance={6} maxDistance={10} target={[0, 0, 0]} />
    </>
  );
}

export default function MaterialStudio({ design, countertopRatePerSqFt, handleUpgrade, onTryIn3D }: {
  design: KitchenDesign;
  countertopRatePerSqFt: number;
  handleUpgrade: number;
  onTryIn3D: () => void;
}) {
  const setDesign = useDesignStore((state) => state.setDesign);
  const cabinetRate = design.finish === "Natural Wood Grain" ? 2850 : design.finish === "High Gloss" ? 2550 : 2250;
  const cabinetOptions = [
    { label: "Natural Oak", colour: "Natural Oak", finish: "Natural Wood Grain", swatch: "#B8956A" },
    { label: "American Walnut", colour: "Walnut", finish: "Natural Wood Grain", swatch: "#71533A" },
    { label: "Muted Sage", colour: "Sage Green", finish: "Matte", swatch: "#9DA58F" },
    { label: "Matte Charcoal", colour: "Charcoal", finish: "Matte", swatch: "#4A4A45" },
    { label: "Warm Ivory", colour: "Warm White", finish: "Matte", swatch: "#EEEBDD" },
  ] as const;
  const countertopOptions = [
    { label: "Carrara Marble", value: "Carrara-inspired Marble", swatch: "#e5e2dc" },
    { label: "White Quartz", value: "White Quartz", swatch: "#eceae5" },
    { label: "Black Granite", value: "Black Granite", swatch: "#555650" },
  ] as const;
  const hardwareOptions = [
    { label: "Brushed Brass", value: "Brushed Gold", swatch: "#B38B62" },
    { label: "Matte Black", value: "Matte Black", swatch: "#272824" },
    { label: "Brushed Nickel", value: "Brushed Nickel", swatch: "#a5a9a7" },
  ] as const;
  const samples = [
    { title: "Cabinet finish", name: `${design.colour} · ${design.finish}`, note: design.finish === "Natural Wood Grain" ? "Open-pore tactile grain · satin protective seal" : "Low-sheen lacquer · easy-clean surface", rate: `${formatINR(cabinetRate)} / sq. ft.` },
    { title: "Countertop", name: design.countertop, note: design.countertop.includes("Marble") ? "Vein-matched stone · honed soft reflection" : "Low-porosity engineered surface · fine mineral grain", rate: `${formatINR(countertopRatePerSqFt)} / sq. ft.` },
    { title: "Hardware", name: design.handle, note: "Brushed, tactile metal · soft directional sheen", rate: `${formatINR(handleUpgrade)} / kitchen set` },
  ];

  return (
    <div className="grid min-h-[420px] bg-[#eeece4] lg:grid-cols-[1.1fr_0.9fr]">
      <div className="min-h-[320px]">
        <Canvas shadows camera={{ position: [0, 4.5, 8], fov: 36 }}>
          <MaterialSamples design={design} />
        </Canvas>
      </div>
      <div className="grid content-center gap-3 p-5 md:p-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#77796F]">Tactile material study</p>
          <h2 className="mt-2 font-serif text-3xl">Finish, in the light.</h2>
        </div>
        <div>
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.17em] text-[#77796F]">Cabinet finishes</p>
          <div className="flex flex-wrap gap-2">{cabinetOptions.map((option) => <button key={option.label} onClick={() => setDesign({ colour: option.colour, colourHex: undefined, finish: option.finish })} aria-pressed={!design.colourHex && design.colour === option.colour && design.finish === option.finish} title={option.label} className={`flex items-center gap-2 border px-2 py-1.5 text-[10px] ${!design.colourHex && design.colour === option.colour && design.finish === option.finish ? "border-[#292A27] bg-white" : "border-[#D8D5CD] bg-white/50"}`}><span className="h-4 w-4 border border-black/10" style={{ backgroundColor: option.swatch }} />{option.label}</button>)}</div>
        </div>
        <div>
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.17em] text-[#77796F]">Countertops</p>
          <div className="flex flex-wrap gap-2">{countertopOptions.map((option) => <button key={option.label} onClick={() => setDesign({ countertop: option.value })} aria-pressed={design.countertop === option.value} title={option.label} className={`flex items-center gap-2 border px-2 py-1.5 text-[10px] ${design.countertop === option.value ? "border-[#292A27] bg-white" : "border-[#D8D5CD] bg-white/50"}`}><span className="h-4 w-4 border border-black/10" style={{ backgroundColor: option.swatch }} />{option.label}</button>)}</div>
        </div>
        <div>
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.17em] text-[#77796F]">Hardware</p>
          <div className="flex flex-wrap gap-2">{hardwareOptions.map((option) => <button key={option.label} onClick={() => setDesign({ handle: option.value })} aria-pressed={design.handle === option.value} title={option.label} className={`flex items-center gap-2 border px-2 py-1.5 text-[10px] ${design.handle === option.value ? "border-[#292A27] bg-white" : "border-[#D8D5CD] bg-white/50"}`}><span className="h-4 w-4 border border-black/10" style={{ backgroundColor: option.swatch }} />{option.label}</button>)}</div>
        </div>
        {samples.map((sample) => (
          <article key={sample.title} className="border border-[#D8D5CD] bg-white/80 p-4">
            <p className="text-[9px] uppercase tracking-[0.17em] text-[#77796F]">{sample.title}</p>
            <h3 className="mt-1 font-serif text-xl">{sample.name}</h3>
            <p className="mt-1 text-xs leading-5 text-[#6D6F68]">{sample.note}</p>
            <p className="mt-2 text-xs font-semibold">{sample.rate}</p>
          </article>
        ))}
        <button onClick={onTryIn3D} className="flex items-center justify-center gap-2 bg-[#292A27] px-4 py-3 text-sm text-white">Try in 3D Configurator <ArrowRight size={15} /></button>
        <p className="text-[10px] leading-5 text-[#77796F]">Illustrative material rates; final selection and measured area are confirmed during design review.</p>
      </div>
    </div>
  );
}
