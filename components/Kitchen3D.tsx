"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { useDesignStore } from "@/store/design";
import { colourValue } from "@/lib/catalog";
import { Cabinet as CabinetModel, CameraAngle, KitchenDesign, LightingMood } from "@/lib/types";
import { createSurfaceTexture, getCabinetTextureKind, getCountertopTextureKind, getHardwareTextureKind, SurfaceTextureKind } from "@/lib/surfaceTextures";
import { FrontSide, MathUtils, type CanvasTexture, type Group } from "three";
import { Suspense, useEffect, useMemo, useRef } from "react";

interface SceneTextures {
  oak: CanvasTexture;
  walnut: CanvasTexture;
  stone: CanvasTexture;
  quartz: CanvasTexture;
  granite: CanvasTexture;
  metal: CanvasTexture;
  porcelain: CanvasTexture;
  textured: CanvasTexture;
}

function textureFor(kind: SurfaceTextureKind, textures: SceneTextures) {
  return textures[kind];
}

function Cabinet({ item, design, selected, onSelect, doorsOpen, mood, textures }: {
  item: CabinetModel;
  design: KitchenDesign;
  selected: boolean;
  onSelect: () => void;
  doorsOpen: boolean;
  mood: LightingMood;
  textures: SceneTextures;
}) {
  const doorRef = useRef<Group>(null);
  const x = item.position[0] / 12;
  const y = item.position[1] / 12;
  const z = item.position[2] / 12;
  const w = item.width / 12;
  const h = item.height / 12;
  const d = item.depth / 12;
  const rotation = (item.rotation ?? 0) * Math.PI / 180;
  const cabinetColour = colourValue(design.colour, design.colourHex);
  const wood = design.finish === "Natural Wood Grain";
  const glossy = design.finish === "High Gloss";
  const isGlass = design.doorStyle === "Glass Front";
  const isDrawer = item.category === "drawer";
  const handleless = design.doorStyle === "Handleless Modern" || design.handle === "Handleless";
  const frameStyle = ["Classic Shaker", "Slim Shaker", "Raised Panel", "Recessed Panel"].includes(design.doorStyle);
  const frameInset = design.doorStyle === "Slim Shaker" ? 0.115 : design.doorStyle === "Classic Shaker" ? 0.23 : 0.14;
  const glassFrameWidth = Math.min(0.06, w * 0.08, h * 0.08);
  const cabinetTextureKind = getCabinetTextureKind(design.colour, design.finish);
  const cabinetTexture = cabinetTextureKind ? textureFor(cabinetTextureKind, textures) : undefined;
  const handleTexture = textureFor(getHardwareTextureKind(design.handle), textures);
  const handleColour = design.handle === "Matte Black" ? "#242421"
    : design.handle === "Brushed Nickel" || design.handle === "Chrome" ? "#a5a9a7" : "#b38b62";
  const reveal = 0.01;

  useFrame((_, delta) => {
    if (!doorRef.current) return;
    const targetAngle = doorsOpen && !isDrawer ? -Math.PI * 80 / 180 : 0;
    const targetDepth = d / 2 + (doorsOpen && isDrawer ? 0.24 : 0);
    doorRef.current.rotation.y = MathUtils.damp(doorRef.current.rotation.y, targetAngle, 7, delta);
    doorRef.current.position.z = MathUtils.damp(doorRef.current.position.z, targetDepth, 7, delta);
  });

  const solidMaterial = {
    color: cabinetColour,
    map: cabinetTexture,
    roughness: glossy ? 0.18 : wood ? 0.62 : design.finish === "Textured" ? 0.78 : 0.55,
    metalness: glossy ? 0.1 : 0,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    side: FrontSide,
  } as const;
  const emissiveColor = selected ? "#b8956a" : "#000000";

  return (
    <group position={[x, y, z]} rotation={[0, rotation, 0]} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
      {isGlass ? (
        <group>
          {[-1, 1].map((side) => (
            <mesh key={`side-${side}`} position={[side * (w / 2 - 0.03), 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.06, h, d]} />
              <meshStandardMaterial {...solidMaterial} emissive={emissiveColor} emissiveIntensity={selected ? 0.22 : 0} />
            </mesh>
          ))}
          {[-1, 1].map((edge) => (
            <mesh key={`edge-${edge}`} position={[0, edge * (h / 2 - 0.03), 0]} castShadow receiveShadow>
              <boxGeometry args={[w - 0.06, 0.06, d]} />
              <meshStandardMaterial {...solidMaterial} />
            </mesh>
          ))}
          <mesh position={[0, 0, -d / 2 + 0.025]}>
            <boxGeometry args={[w - 0.12, h - 0.12, 0.05]} />
            <meshStandardMaterial color={wood ? cabinetColour : "#746957"} map={cabinetTexture} roughness={0.72} side={FrontSide} />
          </mesh>
          {(h > 2.4 ? [-h / 4, h / 4] : [0]).map((shelfY) => (
            <mesh key={`shelf-${shelfY}`} position={[0, shelfY, 0]} castShadow receiveShadow>
              <boxGeometry args={[w - 0.12, 0.045, d - 0.12]} />
              <meshStandardMaterial {...solidMaterial} />
            </mesh>
          ))}
          {mood !== "daylight" && (
            <mesh position={[0, h / 2 - 0.1, d / 2 - 0.08]}>
              <boxGeometry args={[w - 0.2, 0.025, 0.025]} />
              <meshStandardMaterial color="#e9c98f" emissive="#d89f50" emissiveIntensity={0.65} />
            </mesh>
          )}
        </group>
      ) : (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial {...solidMaterial} emissive={emissiveColor} emissiveIntensity={selected ? 0.24 : 0} />
        </mesh>
      )}

      {item.category !== "wall" && (
        <mesh position={[0, -h / 2 + 0.07, 0.015]} castShadow>
          <boxGeometry args={[w, 0.14, d - 0.025]} />
          <meshStandardMaterial color="#363632" roughness={0.82} side={FrontSide} />
        </mesh>
      )}

      {item.category === "pantry" && design.appliances.oven && (
        <group position={[0, 0, d / 2 + 0.07]}>
          <mesh position={[0, -h * 0.05, 0]}>
            <boxGeometry args={[w * 0.74, h * 0.38, 0.045]} />
            <meshStandardMaterial color="#252624" metalness={0.38} roughness={0.22} side={FrontSide} />
          </mesh>
          <mesh position={[0, h * 0.34, 0]}>
            <boxGeometry args={[w * 0.74, h * 0.2, 0.045]} />
            <meshStandardMaterial color="#252624" metalness={0.38} roughness={0.22} side={FrontSide} />
          </mesh>
          <mesh position={[0, -h * 0.05, 0.028]}>
            <boxGeometry args={[w * 0.58, h * 0.24, 0.01]} />
            <meshStandardMaterial color="#465052" metalness={0.2} roughness={0.16} side={FrontSide} />
          </mesh>
        </group>
      )}

      <group ref={doorRef} position={[-w / 2, 0, d / 2]}>
        <group position={[w / 2, 0, 0]}>
          {isDrawer ? (
            [-1, 0, 1].map((row) => (
              <mesh key={row} position={[0, row * (h / 3), 0.018]} castShadow>
                <boxGeometry args={[w - reveal, h / 3 - reveal, 0.035]} />
                <meshStandardMaterial {...solidMaterial} />
              </mesh>
            ))
          ) : isGlass ? (
            <group position={[0, 0, 0.012]}>
              {[-1, 1].map((edge) => (
                <mesh key={`vertical-frame-${edge}`} position={[edge * (w / 2 - glassFrameWidth / 2), 0, 0.012]} castShadow>
                  <boxGeometry args={[glassFrameWidth, h, 0.045]} />
                  <meshStandardMaterial color="#66543f" metalness={0.45} roughness={0.34} side={FrontSide} />
                </mesh>
              ))}
              {[-1, 1].map((edge) => (
                <mesh key={`horizontal-frame-${edge}`} position={[0, edge * (h / 2 - glassFrameWidth / 2), 0.012]} castShadow>
                  <boxGeometry args={[w, glassFrameWidth, 0.045]} />
                  <meshStandardMaterial color="#66543f" metalness={0.45} roughness={0.34} side={FrontSide} />
                </mesh>
              ))}
              <mesh position={[0, 0, 0.006]}>
                <boxGeometry args={[w - glassFrameWidth * 2, h - glassFrameWidth * 2, 0.02]} />
                <meshPhysicalMaterial color="#bdc8c3" transmission={0.75} transparent opacity={0.32} depthWrite={false} roughness={0.15} metalness={0.04} side={FrontSide} />
              </mesh>
              <mesh position={[-w * 0.32, 0, 0.02]}>
                <boxGeometry args={[0.018, h - glassFrameWidth * 2, 0.008]} />
                <meshBasicMaterial color="#fff9e9" transparent opacity={0.22} depthWrite={false} side={FrontSide} />
              </mesh>
            </group>
          ) : (
            <>
              {frameStyle && (
                <group position={[0, 0, 0.012]}>
                  {[-1, 1].map((edge) => (
                    <mesh key={`rail-y-${edge}`} position={[0, edge * (h / 2 - frameInset / 2), 0]} castShadow>
                      <boxGeometry args={[w, frameInset, 0.045]} />
                      <meshStandardMaterial {...solidMaterial} />
                    </mesh>
                  ))}
                  {[-1, 1].map((edge) => (
                    <mesh key={`rail-x-${edge}`} position={[edge * (w / 2 - frameInset / 2), 0, 0]} castShadow>
                      <boxGeometry args={[frameInset, h, 0.045]} />
                      <meshStandardMaterial {...solidMaterial} />
                    </mesh>
                  ))}
                  <mesh position={[0, 0, -0.006]} castShadow>
                    <boxGeometry args={[Math.max(0.1, w - frameInset * 2), Math.max(0.1, h - frameInset * 2), design.doorStyle === "Raised Panel" ? 0.065 : 0.016]} />
                    <meshStandardMaterial
                      color={design.doorStyle === "Raised Panel" ? "#e4d8c6" : cabinetColour}
                      map={cabinetTexture}
                      roughness={0.48}
                      side={FrontSide}
                    />
                  </mesh>
                </group>
              )}
              {design.doorStyle === "Flat Slab" && (
                <mesh position={[0, 0, 0.012]} castShadow>
                  <boxGeometry args={[w - reveal, h - reveal, 0.026]} />
                  <meshStandardMaterial {...solidMaterial} />
                </mesh>
              )}
              {handleless && (
                <group position={[0, h / 2 - 0.055, 0.025]}>
                  <mesh>
                    <boxGeometry args={[w - 0.035, 0.075, 0.035]} />
                    <meshStandardMaterial color="#343631" metalness={0.48} roughness={0.3} side={FrontSide} />
                  </mesh>
                  <mesh position={[0, -0.045, 0.018]}>
                    <boxGeometry args={[w - 0.035, 0.018, 0.045]} />
                    <meshStandardMaterial color="#b4a47f" metalness={0.72} roughness={0.28} side={FrontSide} />
                  </mesh>
                </group>
              )}
            </>
          )}

          {!handleless && !isGlass && (isDrawer ? [-h / 3, 0, h / 3] : [item.category === "wall" ? -h * 0.4 : h * 0.4]).map((handleY, index) => (
            <mesh key={`handle-${index}`} position={[0, handleY, 0.055]} castShadow>
              <boxGeometry args={[Math.min(w * 0.38, 0.75), 0.035, 0.035]} />
              <meshStandardMaterial color={handleColour} map={handleTexture} metalness={0.82} roughness={0.23} side={FrontSide} />
            </mesh>
          ))}
        </group>
      </group>

      {item.category === "wall" && mood !== "daylight" && (
        <group position={[0, -h / 2 - 0.012, d / 2 - 0.06]}>
          <mesh>
            <boxGeometry args={[w - 0.15, 0.018, 0.025]} />
            <meshStandardMaterial color="#ffce8a" emissive="#ffb84d" emissiveIntensity={1.4} />
          </mesh>
          <pointLight position={[0, -0.08, 0.28]} color="#ffce8a" intensity={0.55} distance={2.2} decay={2} />
        </group>
      )}
    </group>
  );
}

interface CountertopRun {
  wall: CabinetModel["wall"];
  start: number;
  end: number;
  centerCross: number;
  cabinetDepth: number;
}

function getCountertopRuns(cabinets: CabinetModel[]): { runs: CountertopRun[]; corners: CabinetModel[] } {
  const baseCabinets = cabinets.filter((cabinet) => cabinet.category !== "wall" && cabinet.category !== "pantry");
  const corners = baseCabinets.filter((cabinet) => cabinet.category === "corner");
  const runs: CountertopRun[] = [];
  for (const wall of ["back", "front", "left", "right"] as const) {
    const units = baseCabinets.filter((cabinet) => cabinet.wall === wall && cabinet.category !== "corner");
    const intervals = units.map((cabinet) => {
      const along = wall === "back" || wall === "front" ? cabinet.position[0] : cabinet.position[2];
      return {
        start: along - cabinet.width / 2,
        end: along + cabinet.width / 2,
        centerCross: wall === "back" || wall === "front" ? cabinet.position[2] : cabinet.position[0],
        cabinetDepth: cabinet.depth,
      };
    }).sort((a, b) => a.start - b.start);
    let active: CountertopRun | null = null;
    for (const interval of intervals) {
      if (active && interval.start <= active.end + 0.05) {
        active.end = Math.max(active.end, interval.end);
      } else {
        if (active) runs.push(active);
        active = { wall, start: interval.start, end: interval.end, centerCross: interval.centerCross, cabinetDepth: interval.cabinetDepth };
      }
    }
    if (active) runs.push(active);
  }
  return { runs, corners };
}

function CameraPreset({ angle, length, width, ceiling }: { angle: CameraAngle; length: number; width: number; ceiling: number }) {
  const { camera } = useThree();
  useEffect(() => {
    const positions: Record<CameraAngle, [number, number, number]> = {
      perspective: [0, ceiling * 0.68, width * 1.15],
      "front-elevation": [0, Math.min(ceiling * 0.55, 5.5), width * 1.15],
      "top-floor-plan": [0, Math.max(length, width) * 1.15, 0.01],
      "close-up-hardware": [length * 0.08, 3.3, width * 0.3],
    };
    camera.position.set(...positions[angle]);
    camera.lookAt(0, angle === "top-floor-plan" ? 0 : 2, 0);
    camera.updateProjectionMatrix();
  }, [angle, camera, ceiling, length, width]);
  return null;
}

function KitchenScene({ design, selectedCabinetId, setSelectedCabinetId, mood, doorsOpen, cameraAngle }: {
  design: KitchenDesign;
  selectedCabinetId: string | null;
  setSelectedCabinetId: (id: string | null) => void;
  mood: LightingMood;
  doorsOpen: boolean;
  cameraAngle: CameraAngle;
}) {
  const textures = useMemo<SceneTextures>(() => ({
    oak: createSurfaceTexture("oak"),
    walnut: createSurfaceTexture("walnut"),
    stone: createSurfaceTexture("stone"),
    quartz: createSurfaceTexture("quartz"),
    granite: createSurfaceTexture("granite"),
    metal: createSurfaceTexture("metal"),
    porcelain: createSurfaceTexture("porcelain"),
    textured: createSurfaceTexture("textured"),
  }), []);
  useEffect(() => () => Object.values(textures).forEach((texture) => texture.dispose()), [textures]);

  const roomLength = design.measurements.length / 12;
  const roomWidth = design.measurements.width / 12;
  const wallHeight = design.measurements.wallHeight / 12;
  const ceilingHeight = design.measurements.ceilingHeight / 12;
  const countertopTop = 34 / 12 + 0.04;
  const countertopThickness = 0.11;
  const countertopTexture = textureFor(getCountertopTextureKind(design.countertop), textures);
  const { runs, corners } = getCountertopRuns(design.cabinetInventory);
  const sinkUnit = design.cabinetInventory.find((cabinet) => cabinet.category === "sink");
  const cooktopUnit = design.cabinetInventory.find((cabinet) => cabinet.wall === "back" && (cabinet.category === "base" || cabinet.category === "drawer"))
    ?? design.cabinetInventory.find((cabinet) => cabinet.category === "base" || cabinet.category === "drawer");
  const hoodPosition: [number, number, number] | null = cooktopUnit ? [
    cooktopUnit.wall === "left" ? -roomLength / 2 + 1.15
      : cooktopUnit.wall === "right" ? roomLength / 2 - 1.15 : cooktopUnit.position[0] / 12,
    wallHeight * 0.62,
    cooktopUnit.wall === "back" ? -roomWidth / 2 + 1.15
      : cooktopUnit.wall === "front" ? roomWidth / 2 - 1.15 : cooktopUnit.position[2] / 12,
  ] : null;
  const ambientIntensity = mood === "daylight" ? 1.05 : mood === "warm-evening" ? 0.42 : 0.34;
  const keyIntensity = mood === "daylight" ? 2 : 0.65;

  return (
    <>
      <color attach="background" args={["#e9e5dc"]} />
      <ambientLight intensity={ambientIntensity} />
      <directionalLight position={[5, 9, 6]} intensity={keyIntensity} castShadow />
      {mood === "warm-evening" && <pointLight position={[0, ceilingHeight - 1, 0]} color="#ffce8a" intensity={1.1} distance={14} />}
      <Suspense fallback={null}>
        <Environment preset="apartment" />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.035, 0]} receiveShadow>
          <planeGeometry args={[roomLength + 1, roomWidth + 1]} />
          <meshStandardMaterial map={textures.porcelain} color="#f0eee8" roughness={0.38} metalness={0.03} side={FrontSide} />
        </mesh>
        <mesh position={[0, wallHeight / 2, -roomWidth / 2 - 0.05]} receiveShadow>
          <boxGeometry args={[roomLength + 0.2, wallHeight, 0.1]} />
          <meshStandardMaterial color="#f3f0e9" roughness={0.92} side={FrontSide} />
        </mesh>
        <mesh position={[-roomLength / 2 - 0.05, wallHeight / 2, 0]} receiveShadow>
          <boxGeometry args={[0.1, wallHeight, roomWidth]} />
          <meshStandardMaterial color="#ebe7df" roughness={0.92} side={FrontSide} />
        </mesh>
        <mesh position={[roomLength / 2 + 0.05, wallHeight / 2, 0]} receiveShadow>
          <boxGeometry args={[0.1, wallHeight, roomWidth]} />
          <meshStandardMaterial color="#ebe7df" roughness={0.92} side={FrontSide} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ceilingHeight, 0]}>
          <planeGeometry args={[roomLength + 0.1, roomWidth + 0.1]} />
          <meshStandardMaterial color="#faf8f3" roughness={0.95} side={FrontSide} />
        </mesh>

        {[-1, 1].map((edge) => (
          <mesh key={`back-trim-${edge}`} position={[0, edge === -1 ? 0.08 : ceilingHeight - 0.16, -roomWidth / 2 + 0.02]}>
            <boxGeometry args={[roomLength, 0.16, 0.12]} />
            <meshStandardMaterial color={edge === -1 ? "#d1c8b9" : "#e2dacc"} roughness={0.7} side={FrontSide} />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <mesh key={`side-trim-${side}`} position={[side * (roomLength / 2 - 0.02), ceilingHeight - 0.16, 0]}>
            <boxGeometry args={[0.12, 0.16, roomWidth]} />
            <meshStandardMaterial color="#e2dacc" roughness={0.7} side={FrontSide} />
          </mesh>
        ))}

        {runs.map((run, index) => {
          const span = (run.end - run.start + 0.04) / 12;
          const along = (run.start + run.end) / 24;
          const centerCross = run.centerCross / 12;
          const backOrFront = run.wall === "back" || run.wall === "front";
          const countertopDepth = (run.cabinetDepth + 1) / 12;
          const position: [number, number, number] = backOrFront
            ? [along, countertopTop - countertopThickness / 2, centerCross + (run.wall === "back" ? 0.5 / 12 : -0.5 / 12)]
            : [centerCross + (run.wall === "left" ? 0.5 / 12 : -0.5 / 12), countertopTop - countertopThickness / 2, along];
          const args: [number, number, number] = backOrFront
            ? [span, countertopThickness, countertopDepth]
            : [countertopDepth, countertopThickness, span];
          return (
            <group key={`counter-run-${index}`}>
              <mesh position={position} castShadow receiveShadow>
                <boxGeometry args={args} />
                <meshStandardMaterial color={design.countertop === "Wooden Countertop" ? "#B68A52" : "#ffffff"} map={countertopTexture} roughness={0.27} metalness={0.025} side={FrontSide} />
              </mesh>
              {design.backsplash !== "Plain Minimal" && run.wall !== "front" && (
                <mesh position={backOrFront
                  ? [along, countertopTop + 0.72, run.wall === "back" ? -roomWidth / 2 + 0.04 : roomWidth / 2 - 0.04]
                  : [run.wall === "left" ? -roomLength / 2 + 0.04 : roomLength / 2 - 0.04, countertopTop + 0.72, along]}>
                  <boxGeometry args={backOrFront ? [span, 1.35, 0.035] : [0.035, 1.35, span]} />
                  <meshStandardMaterial color="#eeeae1" map={textures.stone} roughness={0.72} side={FrontSide} />
                </mesh>
              )}
            </group>
          );
        })}
        {corners.map((corner) => (
          <mesh key={`corner-top-${corner.id}`} position={[corner.position[0] / 12, countertopTop - countertopThickness / 2, corner.position[2] / 12]} castShadow receiveShadow>
            <boxGeometry args={[(corner.width + 0.5) / 12, countertopThickness, (corner.depth + 0.5) / 12]} />
            <meshStandardMaterial color={design.countertop === "Wooden Countertop" ? "#B68A52" : "#ffffff"} map={countertopTexture} roughness={0.27} metalness={0.025} side={FrontSide} />
          </mesh>
        ))}

        {design.cabinetInventory.map((item) => (
          <Cabinet
            key={item.id}
            item={item}
            design={design}
            selected={selectedCabinetId === item.id}
            onSelect={() => setSelectedCabinetId(item.id)}
            doorsOpen={doorsOpen}
            mood={mood}
            textures={textures}
          />
        ))}

        {sinkUnit && design.appliances.sink && (
          <group position={[sinkUnit.position[0] / 12, countertopTop + 0.02, sinkUnit.position[2] / 12]} rotation={[0, ((sinkUnit.rotation ?? 0) * Math.PI) / 180, 0]}>
            <mesh position={[0, -0.005, 0]} castShadow>
              <boxGeometry args={[1.45, 0.055, 1.15]} />
              <meshStandardMaterial color="#888d8b" metalness={0.72} roughness={0.25} side={FrontSide} />
            </mesh>
            <mesh position={[0, -0.035, 0]}>
              <boxGeometry args={[1.25, 0.035, 0.95]} />
              <meshStandardMaterial color="#535a59" metalness={0.48} roughness={0.23} side={FrontSide} />
            </mesh>
            {design.appliances.faucet && (
              <>
                <mesh position={[0.82, 0.32, -0.28]}>
                  <cylinderGeometry args={[0.025, 0.025, 0.58, 12]} />
                  <meshStandardMaterial color={design.handle === "Matte Black" ? "#222321" : "#b38b62"} metalness={0.82} roughness={0.2} side={FrontSide} />
                </mesh>
                <mesh position={[0.68, 0.58, -0.28]} rotation={[0, 0, Math.PI / 2]}>
                  <torusGeometry args={[0.16, 0.025, 10, 28, Math.PI]} />
                  <meshStandardMaterial color={design.handle === "Matte Black" ? "#222321" : "#b38b62"} metalness={0.82} roughness={0.2} side={FrontSide} />
                </mesh>
              </>
            )}
          </group>
        )}

        {cooktopUnit && design.appliances.cooktop && (
          <group
            position={[cooktopUnit.position[0] / 12, countertopTop + 0.035, cooktopUnit.position[2] / 12]}
            rotation={[0, ((cooktopUnit.rotation ?? 0) * Math.PI) / 180, 0]}
          >
            <mesh>
              <boxGeometry args={[1.75, 0.055, 1.25]} />
              <meshStandardMaterial color="#171918" metalness={0.38} roughness={0.18} side={FrontSide} />
            </mesh>
            {[-1, 1].flatMap((xSign) => [-1, 1].map((zSign) => (
              <mesh key={`${xSign}-${zSign}`} position={[xSign * 0.42, 0.035, zSign * 0.29]}>
                <torusGeometry args={[0.22, 0.012, 8, 24]} />
                <meshStandardMaterial color="#828581" metalness={0.74} roughness={0.28} side={FrontSide} />
              </mesh>
            )))}
          </group>
        )}
        {cooktopUnit && design.appliances.hood && hoodPosition && (
          <group position={hoodPosition} rotation={[0, ((cooktopUnit.rotation ?? 0) * Math.PI) / 180, 0]}>
            <mesh>
              <boxGeometry args={[1.8, 0.2, 1.15]} />
              <meshStandardMaterial color="#343633" metalness={0.44} roughness={0.26} side={FrontSide} />
            </mesh>
            <mesh position={[0, wallHeight * 0.16, -0.32]}>
              <boxGeometry args={[0.72, wallHeight * 0.28, 0.18]} />
              <meshStandardMaterial color="#4b4d49" metalness={0.34} roughness={0.35} side={FrontSide} />
            </mesh>
          </group>
        )}

        <CameraPreset angle={cameraAngle} length={roomLength} width={roomWidth} ceiling={ceilingHeight} />
        <OrbitControls makeDefault enablePan enableZoom enableRotate minDistance={4} maxDistance={Math.max(roomLength, roomWidth) * 1.8} target={cameraAngle === "top-floor-plan" ? [0, 0, 0] : [0, 2, 0]} />
        <ContactShadows position={[0, 0.01, 0]} opacity={0.32} scale={Math.max(roomLength, roomWidth) * 1.5} blur={2.4} far={6} />
      </Suspense>
    </>
  );
}

export default function Kitchen3D({ mood = "daylight", doorsOpen = false, cameraAngle = "perspective" }: {
  mood?: LightingMood;
  doorsOpen?: boolean;
  cameraAngle?: CameraAngle;
}) {
  const design = useDesignStore((state) => state.design);
  const selectedCabinetId = useDesignStore((state) => state.selectedCabinetId);
  const setSelectedCabinetId = useDesignStore((state) => state.setSelectedCabinetId);
  const width = Math.max(4, design.measurements.width / 12);
  const ceiling = Math.max(6, design.measurements.ceilingHeight / 12);

  return (
    <div className="h-full min-h-[420px] w-full">
      <Canvas shadows camera={{ position: [0, ceiling * 0.68, width * 1.15], fov: 42 }} gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <KitchenScene
          design={design}
          selectedCabinetId={selectedCabinetId}
          setSelectedCabinetId={setSelectedCabinetId}
          mood={mood}
          doorsOpen={doorsOpen}
          cameraAngle={cameraAngle}
        />
      </Canvas>
    </div>
  );
}
