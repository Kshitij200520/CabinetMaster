export const doorStyles = [
  { name: "Classic Shaker", description: "Timeless framed profile" },
  { name: "Slim Shaker", description: "Fine contemporary frame" },
  { name: "Raised Panel", description: "Traditional dimensional detail" },
  { name: "Recessed Panel", description: "Quiet architectural shadow" },
  { name: "Flat Slab", description: "Clean modern surface" },
  { name: "Handleless Modern", description: "Seamless linear grip" },
  { name: "Glass Front", description: "Elegant illuminated display" },
];

export const cabinetColours = [
  ["Pure White", "#F7F7F2"], ["Warm White", "#EEEBDD"], ["Ivory", "#E9E2CC"],
  ["Cream", "#E8DFC8"], ["Light Grey", "#C9C9C3"], ["Charcoal", "#4A4A45"],
  ["Matte Black", "#242421"], ["Navy Blue", "#26364A"], ["Sage Green", "#A4AA94"],
  ["Olive Green", "#777B55"], ["Dusty Blue", "#7D9097"], ["Natural Oak", "#B8956A"],
  ["Light Oak", "#CDB58C"], ["Walnut", "#71533A"], ["Espresso", "#3D3028"], ["Honey Wood", "#B68A52"],
];

export const finishes = ["Matte", "Satin", "High Gloss", "Natural Wood Grain", "Textured"];
export const handles = ["Brushed Gold", "Matte Black", "Brushed Nickel", "Chrome", "Brass", "Handleless"];
export const countertops = ["White Marble", "Carrara-inspired Marble", "Calacatta-inspired Marble", "White Quartz", "Black Granite", "Concrete Grey", "Natural Stone", "Wooden Countertop"];
export const backsplashes = ["White Subway Tile", "Marble", "Neutral Stone", "Textured Ceramic", "Plain Minimal"];

export const colourValue = (name: string, override?: string) =>
  override && /^#[0-9A-Fa-f]{6}$/.test(override)
    ? override
    : cabinetColours.find(([label]) => label === name)?.[1] ?? "#EEEBDD";
