import { Cabinet, LayoutType } from "./types";

const BASE_HEIGHT = 34;
const CABINET_DEPTH = 24;
const WALL_HEIGHT = 30;
const PANTRY_WIDTH = 24;

export function validateMeasurements(length: number, width: number, wallHeight: number, ceilingHeight: number) {
  const errors: string[] = [];
  if (length <= 0) errors.push("Kitchen length must be greater than zero.");
  if (width <= 0) errors.push("Kitchen width must be greater than zero.");
  if (wallHeight <= 0) errors.push("Wall height must be greater than zero.");
  if (ceilingHeight <= 0) errors.push("Ceiling height must be greater than zero.");
  if (ceilingHeight < wallHeight) errors.push("Ceiling height cannot be lower than wall height.");
  if (length < 48 || width < 48) errors.push("Minimum demonstrated kitchen dimension is 48 inches.");
  return errors;
}

function segmentWidths(span: number) {
  if (span < 12) return [];
  const count = Math.ceil(span / 30);
  return Array.from({ length: count }, () => span / count);
}

function footprint(cabinet: Cabinet) {
  const rotated = Math.abs(cabinet.rotation % 180) === 90;
  const width = rotated ? cabinet.depth : cabinet.width;
  const depth = rotated ? cabinet.width : cabinet.depth;
  return {
    left: cabinet.position[0] - width / 2,
    right: cabinet.position[0] + width / 2,
    back: cabinet.position[2] - depth / 2,
    front: cabinet.position[2] + depth / 2,
    bottom: cabinet.position[1] - cabinet.height / 2,
    top: cabinet.position[1] + cabinet.height / 2,
  };
}

export function cabinetsOverlap(a: Cabinet, b: Cabinet) {
  const first = footprint(a);
  const second = footprint(b);
  const overlaps = (aMin: number, aMax: number, bMin: number, bMax: number) =>
    Math.min(aMax, bMax) - Math.max(aMin, bMin) > 0.001;
  return overlaps(first.left, first.right, second.left, second.right)
    && overlaps(first.back, first.front, second.back, second.front)
    && overlaps(first.bottom, first.top, second.bottom, second.top);
}

export function recommendCabinets(layout: LayoutType, length: number, width: number, wallHeight: number): Cabinet[] {
  const roomLength = Math.max(length, 48);
  const roomWidth = Math.max(width, 48);
  const cornerSize = Math.min(30, Math.max(12, (Math.min(roomLength, roomWidth) - 24) / 2));
  const pantryHeight = Math.min(Math.max(wallHeight, 12), 84);
  const wallHeightCabinet = Math.min(WALL_HEIGHT, Math.max(12, wallHeight - 52));
  const wallBottom = Math.min(BASE_HEIGHT + 18, wallHeight - wallHeightCabinet);
  const cabinets: Cabinet[] = [];

  const add = (
    name: string,
    category: Cabinet["category"],
    cabinetWidth: number,
    cabinetHeight: number,
    cabinetDepth: number,
    position: [number, number, number],
    wall: Cabinet["wall"],
    rotation = 0,
  ) => {
    cabinets.push({
      id: `${category}-${cabinets.length}`,
      sku: `${category.toUpperCase()}-${Math.round(cabinetWidth).toString().padStart(3, "0")}`,
      name,
      category,
      width: cabinetWidth,
      height: cabinetHeight,
      depth: cabinetDepth,
      quantity: 1,
      unitPrice: 0,
      position,
      wall,
      rotation,
    });
  };

  const addCorner = (wall: "back" | "right", x: number) => {
    const z = -roomWidth / 2 + cornerSize / 2;
    add("L-Corner Cabinet", "corner", cornerSize, BASE_HEIGHT, cornerSize, [x, BASE_HEIGHT / 2, z], wall);
  };

  const addRun = (
    wall: Cabinet["wall"],
    start: number,
    span: number,
    options: { reservePantry?: boolean; addWallUnits?: boolean; categories?: boolean; sinkIndex?: number | "middle"; cabinetDepth?: number } = {},
  ) => {
    const cabinetDepth = options.cabinetDepth ?? CABINET_DEPTH;
    const hasPantry = options.reservePantry === true && span >= 60;
    const pantrySpan = hasPantry ? PANTRY_WIDTH : 0;
    const runSpan = span - pantrySpan;
    const widths = segmentWidths(runSpan);
    const sinkIndex = options.sinkIndex === "middle" ? Math.floor(widths.length / 2) : options.sinkIndex;
    let offset = 0;
    widths.forEach((cabinetWidth, index) => {
      let category: Cabinet["category"] = "base";
      if (options.categories !== false) {
        category = widths.length === 1 ? "sink" : index === 0 ? "base" : index === 1 ? "drawer" : index === 2 ? "sink" : "base";
      } else if (index === sinkIndex) {
        category = "sink";
      }
      const along = start + offset + cabinetWidth / 2;
      const rotation = wall === "left" ? 90 : wall === "right" ? -90 : wall === "front" ? 180 : 0;
      const x = wall === "back" || wall === "front"
        ? along
        : wall === "left" ? -roomLength / 2 + cabinetDepth / 2 : roomLength / 2 - cabinetDepth / 2;
      const z = wall === "back"
        ? -roomWidth / 2 + cabinetDepth / 2
        : wall === "front" ? roomWidth / 2 - cabinetDepth / 2 : along;
      add(category === "sink" ? "Sink Base Cabinet" : category === "drawer" ? "Three Drawer Base" : "Base Cabinet",
        category, cabinetWidth, BASE_HEIGHT, cabinetDepth, [x, BASE_HEIGHT / 2, z], wall, rotation);

      if (options.addWallUnits && index < 2 && wallBottom >= BASE_HEIGHT + 8) {
        const wallX = wall === "left" ? -roomLength / 2 + 6
          : wall === "right" ? roomLength / 2 - 6 : x;
        const wallZ = wall === "back" ? -roomWidth / 2 + 6
          : wall === "front" ? roomWidth / 2 - 6 : z;
        add("Wall Cabinet", "wall", cabinetWidth, wallHeightCabinet, 12,
          [wallX, wallBottom + wallHeightCabinet / 2, wallZ], wall, rotation);
      }
      offset += cabinetWidth;
    });

    if (hasPantry) {
      const along = start + runSpan + pantrySpan / 2;
      const rotation = wall === "left" ? 90 : wall === "right" ? -90 : wall === "front" ? 180 : 0;
      const x = wall === "back" || wall === "front"
        ? along
        : wall === "left" ? -roomLength / 2 + cabinetDepth / 2 : roomLength / 2 - cabinetDepth / 2;
      const z = wall === "back"
        ? -roomWidth / 2 + cabinetDepth / 2
        : wall === "front" ? roomWidth / 2 - cabinetDepth / 2 : along;
      add("Tall Pantry Cabinet", "pantry", PANTRY_WIDTH, pantryHeight, cabinetDepth,
        [x, pantryHeight / 2, z], wall, rotation);
    }
  };

  if (layout === "straight") {
    const pantry = roomLength >= 120;
    addRun("back", -roomLength / 2, roomLength, { reservePantry: pantry, addWallUnits: true });
  } else if (layout === "l") {
    addCorner("back", -roomLength / 2 + cornerSize / 2);
    addRun("back", -roomLength / 2 + cornerSize, roomLength - cornerSize, { addWallUnits: true });
    addRun("left", -roomWidth / 2 + cornerSize, roomWidth - cornerSize, { reservePantry: roomWidth - cornerSize >= 60, addWallUnits: true });
  } else if (layout === "u") {
    addCorner("back", -roomLength / 2 + cornerSize / 2);
    addCorner("right", roomLength / 2 - cornerSize / 2);
    addRun("back", -roomLength / 2 + cornerSize, roomLength - cornerSize * 2, { addWallUnits: true });
    addRun("left", -roomWidth / 2 + cornerSize, roomWidth - cornerSize, { addWallUnits: true, categories: false });
    addRun("right", -roomWidth / 2 + cornerSize, roomWidth - cornerSize, { reservePantry: roomWidth - cornerSize >= 60, addWallUnits: true, categories: false });
  } else {
    const galleyCabinetDepth = Math.min(CABINET_DEPTH, (roomLength - 42) / 2);
    if (galleyCabinetDepth >= 18) {
      addRun("left", -roomWidth / 2, roomWidth, { addWallUnits: true, categories: false, cabinetDepth: galleyCabinetDepth });
      addRun("right", -roomWidth / 2, roomWidth, { reservePantry: roomWidth >= 60, categories: false, sinkIndex: "middle", cabinetDepth: galleyCabinetDepth });
    } else {
      addRun("left", -roomWidth / 2, roomWidth, { addWallUnits: true, categories: false });
    }
  }

  return cabinets;
}

export function findAvailableWallPosition(
  existing: Cabinet[],
  length: number,
  width: number,
  cabinetWidth = 30,
  cabinetDepth = CABINET_DEPTH,
): { position: [number, number, number]; wall: Cabinet["wall"]; rotation: number } | null {
  const halfLength = Math.max(length, 48) / 2;
  const halfWidth = Math.max(width, 48) / 2;
  const candidates: Array<{ position: [number, number, number]; wall: Cabinet["wall"]; rotation: number }> = [];
  const step = 6;

  for (let x = -halfLength + cabinetWidth / 2; x <= halfLength - cabinetWidth / 2; x += step) {
    candidates.push({ position: [x, BASE_HEIGHT / 2, -halfWidth + cabinetDepth / 2], wall: "back", rotation: 0 });
    candidates.push({ position: [x, BASE_HEIGHT / 2, halfWidth - cabinetDepth / 2], wall: "front", rotation: 180 });
  }
  for (let z = -halfWidth + cabinetWidth / 2; z <= halfWidth - cabinetWidth / 2; z += step) {
    candidates.push({ position: [-halfLength + cabinetDepth / 2, BASE_HEIGHT / 2, z], wall: "left", rotation: 90 });
    candidates.push({ position: [halfLength - cabinetDepth / 2, BASE_HEIGHT / 2, z], wall: "right", rotation: -90 });
  }

  return candidates.find((candidate) => {
    const test: Cabinet = {
      id: "candidate",
      sku: "BASE",
      name: "Base Cabinet",
      category: "base",
      width: cabinetWidth,
      height: BASE_HEIGHT,
      depth: cabinetDepth,
      quantity: 1,
      unitPrice: 0,
      ...candidate,
    };
    return existing.every((cabinet) => !cabinetsOverlap(test, cabinet));
  }) ?? null;
}

export function calculateWorkTriangle(cabinets: Cabinet[]) {
  const sink = cabinets.find((cabinet) => cabinet.category === "sink");
  const hob = cabinets.find((cabinet) => cabinet.category === "base" || cabinet.category === "drawer");
  const pantry = cabinets.find((cabinet) => cabinet.category === "pantry");
  if (!sink || !hob) return { score: 0, status: "Add sink and cooking zones", tip: "Add a sink and cooking zone to assess the work triangle." };

  const tallUnit = pantry ?? cabinets.reduce((farthest, cabinet) => {
    const distance = Math.abs(cabinet.position[0] - sink.position[0]) + Math.abs(cabinet.position[2] - sink.position[2]);
    const farthestDistance = Math.abs(farthest.position[0] - sink.position[0]) + Math.abs(farthest.position[2] - sink.position[2]);
    return distance > farthestDistance ? cabinet : farthest;
  }, hob);
  const distance = (a: Cabinet, b: Cabinet) =>
    Math.abs(a.position[0] - b.position[0]) + Math.abs(a.position[2] - b.position[2]);
  const legs = [distance(sink, hob), distance(hob, tallUnit), distance(tallUnit, sink)];
  const outsideComfortBand = legs.reduce((total, leg) => total + (leg < 48 ? (48 - leg) * 0.25 : leg > 108 ? (leg - 108) * 0.2 : 0), 0);
  const totalPenalty = Math.abs(legs.reduce((sum, leg) => sum + leg, 0) - 216) * 0.08;
  const score = Math.max(45, Math.min(100, Math.round(100 - outsideComfortBand - totalPenalty)));
  const longestLeg = Math.max(...legs);
  const tip = longestLeg > 108
    ? "The longest route is over 9 ft; consider moving the sink or cooking zone closer."
    : score >= 80
      ? "Sink, cooking zone and tall storage are arranged within a comfortable working reach."
      : "Try shortening the routes between preparation, cooking and tall storage.";
  return { score, status: score >= 80 ? "Optimal" : "Consider adjusting", tip };
}
