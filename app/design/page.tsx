"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Activity, ArrowLeft, ArrowRight, Camera, Download, Eye, Lightbulb, LoaderCircle, Maximize2, Moon, Plus, RotateCcw, Save, Sparkles, Sun, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FloorPlan from "@/components/FloorPlan";
import { useDesignStore } from "@/store/design";
import { calculateQuote } from "@/lib/pricing";
import { backsplashes, cabinetColours, countertops, doorStyles, finishes, handles } from "@/lib/catalog";
import { calculateWorkTriangle, validateMeasurements } from "@/lib/recommendation";
import { formatINR } from "@/lib/currency";
import { DOOR_PRESETS, KITCHEN_PRESETS } from "@/lib/presets";
import { CameraAngle, Cabinet, KitchenDesign, LightingMood } from "@/lib/types";
import { downloadQuotePdf, QuoteDocument } from "@/lib/quote-pdf";

const Kitchen3D = dynamic(() => import("@/components/Kitchen3D"), { ssr: false, loading: () => <div className="grid h-full min-h-[420px] place-items-center text-sm text-[#77796F]">Loading 3D studio…</div> });
const MaterialStudio = dynamic(() => import("@/components/MaterialStudio"), { ssr: false, loading: () => <div className="grid h-full min-h-[420px] place-items-center text-sm text-[#77796F]">Preparing material samples…</div> });

const leadSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().email("Enter a valid email"),
  phone: z.string().regex(/^[0-9+() -]{7,20}$/, "Enter a valid phone number"),
  city: z.string().trim().min(2, "Enter your city").max(80),
  pinCode: z.string().regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit Indian PIN code"),
  message: z.string().max(1000).optional(),
});

type LeadValues = z.infer<typeof leadSchema>;
type SubmittedQuote = QuoteDocument & { _id: string; status: string };
type ImageTo3DResult = {
  design: KitchenDesign;
  source: "groq-vision" | "preset-fallback" | "analysis-fallback";
  note: string;
};
type AdvisorRecommendation = Pick<KitchenDesign, "layout" | "doorStyle" | "colour" | "finish" | "countertop" | "handle"> & {
  cabinets: Cabinet[];
  tips: string[];
  estimatedTotalINR: number;
  withinBudget: boolean | null;
};

async function requestImageTo3D(payload: {
  imageUrl?: string;
  imageBase64?: string;
  presetHint?: string;
  measurements: KitchenDesign["measurements"];
}) {
  const response = await fetch("/api/image-to-3d", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json() as ImageTo3DResult & { error?: string };
  if (!response.ok || !data.design) throw new Error(data.error || "Unable to build a 3D design from this image.");
  return data;
}

function DoorPreview({ name, active, colour }: { name: string; active: boolean; colour: string }) {
  const frame = name === "Slim Shaker" ? 6 : name === "Classic Shaker" ? 10 : 14;
  const raised = name === "Raised Panel";
  const recessed = name === "Recessed Panel";
  const glass = name === "Glass Front";
  const handleless = name === "Handleless Modern";
  return (
    <div className={`relative h-24 overflow-hidden border transition ${active ? "border-[#292A27] shadow-[0_10px_30px_rgba(41,42,39,.12)]" : "border-[#D8D5CD]"}`} style={{ background: active ? "#EEECE4" : "#F7F5F0" }}>
      <div className="absolute left-1/2 top-2 h-[88px] w-[64px] -translate-x-1/2" style={{ background: glass ? "#C8D3D2" : colour }}>
        {glass ? (
          <div className="absolute inset-2 border border-white/70 bg-white/15" />
        ) : name === "Flat Slab" || handleless ? (
          <div className="absolute inset-0" />
        ) : (
          <>
            <div className="absolute left-0 top-0 h-full" style={{ width: frame, background: recessed ? "#8E897D" : "rgba(255,255,255,.32)" }} />
            <div className="absolute right-0 top-0 h-full" style={{ width: frame, background: raised ? "rgba(255,255,255,.38)" : "rgba(255,255,255,.32)" }} />
            <div className="absolute left-0 right-0 top-0" style={{ height: frame, background: "rgba(255,255,255,.32)" }} />
            <div className="absolute bottom-0 left-0 right-0" style={{ height: frame, background: recessed ? "#8E897D" : "rgba(255,255,255,.32)" }} />
            {raised && <div className="absolute" style={{ left: frame * 1.6, right: frame * 1.6, top: frame * 1.5, bottom: frame * 1.5, border: "1px solid rgba(75,72,63,.22)", boxShadow: "inset 0 0 14px rgba(255,255,255,.25)" }} />}
          </>
        )}
        {handleless ? <div className="absolute right-0 top-5 h-1 w-8 bg-[#292A27]/70" /> : <div className="absolute right-[9px] top-[46px] h-3 w-0.5 rounded-full bg-[#B69A62]" />}
      </div>
    </div>
  );
}

export default function DesignPage() {
  const router = useRouter();
  const { design, setLayout, setMeasurements, setDesign, applyPreset, selectedCabinetId, setSelectedCabinetId, updateCabinet, addCabinet, removeCabinet } = useDesignStore();
  const [step, setStep] = useState(0);
  const [view, setView] = useState<"3d" | "2d" | "materials">("3d");
  const [lightingMood, setLightingMood] = useState<LightingMood>("daylight");
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>("perspective");
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedDesignId, setSavedDesignId] = useState("");
  const [submission, setSubmission] = useState<SubmittedQuote | null>(null);
  const [status, setStatus] = useState("");
  const [cabinetStatus, setCabinetStatus] = useState("");
  const [renderOpen, setRenderOpen] = useState(false);
  const [renderSnapshot, setRenderSnapshot] = useState("");
  const [aiRenderImage, setAiRenderImage] = useState("");
  const [renderSource, setRenderSource] = useState<"cloudflare-workers-ai" | "curated-fallback" | "">("");
  const [renderLoading, setRenderLoading] = useState(false);
  const [renderSplit, setRenderSplit] = useState(50);
  const [includeRenderInQuote, setIncludeRenderInQuote] = useState(false);
  const [roomReference, setRoomReference] = useState("");
  const [referenceImage, setReferenceImage] = useState("");
  const [imageModelLoading, setImageModelLoading] = useState(false);
  const [imageMatchNote, setImageMatchNote] = useState("");
  const [imageModelError, setImageModelError] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBudget, setAiBudget] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<AdvisorRecommendation | null>(null);
  const [productRates, setProductRates] = useState<Partial<Record<Cabinet["category"], number>>>({});
  const measurementsRef = useRef(design.measurements);
  const quote = calculateQuote(design, productRates);
  const selectedCabinet = design.cabinetInventory.find((item) => item.id === selectedCabinetId);
  const errors = validateMeasurements(design.measurements.length, design.measurements.width, design.measurements.wallHeight, design.measurements.ceilingHeight);
  const form = useForm<LeadValues>({ resolver: zodResolver(leadSchema), defaultValues: { name: "", email: "", phone: "", city: "", pinCode: "", message: "" } });
  const workTriangle = calculateWorkTriangle(design.cabinetInventory);
  const activePreset = Object.values(KITCHEN_PRESETS).find((preset) =>
    preset.doorStyle === design.doorStyle && preset.colour === design.colour && preset.countertop === design.countertop,
  );

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const designId = query.get("designId");
    if (designId) {
      fetch(`/api/designs/${encodeURIComponent(designId)}`, { cache: "no-store" })
        .then(async (response) => {
          const data = await response.json() as { design?: { config?: KitchenDesign; previewImage?: string; aiRenderImage?: string }; error?: string };
          if (response.status === 401) {
            router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
            return;
          }
          if (!response.ok || !data.design?.config) throw new Error(data.error || "Unable to load saved design.");
          setDesign(data.design.config);
          setSavedDesignId(designId);
          setRenderSnapshot(data.design.previewImage ?? "");
          setAiRenderImage(data.design.aiRenderImage ?? "");
        })
        .catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Unable to load saved design."));
      return;
    }
    const doorSlug = query.get("door");
    const presetSlug = query.get("preset");
    const material = query.get("material");
    if (presetSlug && Object.prototype.hasOwnProperty.call(KITCHEN_PRESETS, presetSlug)) {
      applyPreset(KITCHEN_PRESETS[presetSlug as keyof typeof KITCHEN_PRESETS]);
    }
    if (doorSlug && Object.prototype.hasOwnProperty.call(DOOR_PRESETS, doorSlug)) {
      setDesign({ doorStyle: DOOR_PRESETS[doorSlug as keyof typeof DOOR_PRESETS].doorStyle });
    }
    if (material) {
      const finishColours: Record<string, { colour: string; finish: string }> = {
        "natural-oak": { colour: "Natural Oak", finish: "Natural Wood Grain" },
        "american-walnut": { colour: "Walnut", finish: "Natural Wood Grain" },
        "muted-sage": { colour: "Sage Green", finish: "Matte" },
        "matte-charcoal": { colour: "Charcoal", finish: "Matte" },
        "warm-ivory": { colour: "Warm White", finish: "Matte" },
      };
      const counters: Record<string, string> = {
        "carrara-marble": "Carrara-inspired Marble",
        "white-quartz": "White Quartz",
        "black-granite": "Black Granite",
      };
      const hardware: Record<string, string> = {
        "brushed-brass": "Brushed Gold",
        "matte-black": "Matte Black",
        "brushed-nickel": "Brushed Nickel",
      };
      if (finishColours[material]) setDesign({ ...finishColours[material], colourHex: undefined });
      if (counters[material]) setDesign({ countertop: counters[material] });
      if (hardware[material]) setDesign({ handle: hardware[material] });
    }
    const imageUrl = query.get("imageUrl");
    if (imageUrl) {
      const presetHint = query.get("imageHint") ?? presetSlug ?? (doorSlug ? `door-${doorSlug}` : material ? `material-${material}` : "");
      void Promise.resolve()
        .then(() => {
          setReferenceImage(imageUrl);
          setImageModelError("");
          setImageMatchNote("");
          setImageModelLoading(true);
          setStatus("Analyzing image cabinetry, wood grain & layout → Building 3D model…");
          return requestImageTo3D({ imageUrl, presetHint, measurements: measurementsRef.current });
        })
        .then((result) => {
          setDesign(result.design);
          setSelectedCabinetId(null);
          setImageMatchNote(result.note);
          setStatus(result.source === "groq-vision"
            ? "Reference image analyzed and applied to the live 3D model."
            : "AI image analysis is unavailable; a matching preset has been applied as a starting point.");
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Unable to build a 3D model from this image.";
          setImageModelError(message);
          setStatus(message);
        })
        .finally(() => setImageModelLoading(false));
    }
  }, [applyPreset, router, setDesign, setSelectedCabinetId]);

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json() as { products: { category: Cabinet["category"]; basePriceINR: number }[] };
        setProductRates(Object.fromEntries(data.products.map((product) => [product.category, product.basePriceINR])));
      })
      .catch(() => undefined);
  }, []);

  const captureSnapshot = () => {
    const canvas = document.querySelector<HTMLCanvasElement>("#kitchen-viewport canvas");
    if (!canvas) return "";
    return canvas.toDataURL("image/jpeg", 0.85);
  };

  const createRenderReference = async (snapshot: string) => {
    const image = document.createElement("img");
    image.src = snapshot;
    await image.decode();
    const scale = Math.min(1, 511 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    const imageWidth = Math.max(1, Math.round(image.naturalWidth * scale));
    const imageHeight = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.width = Math.max(64, imageWidth);
    canvas.height = Math.max(64, imageHeight);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to prepare the live 3D model for image rendering.");
    context.fillStyle = "#F6F3ED";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, (canvas.width - imageWidth) / 2, (canvas.height - imageHeight) / 2, imageWidth, imageHeight);
    return canvas.toDataURL("image/jpeg", 0.9);
  };

  const redirectForLogin = () => {
    router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  };

  const persistDesign = async () => {
    setSaved(false);
    const snapshot = captureSnapshot() || renderSnapshot;
    const payload = {
      title: activePreset?.name ?? `${design.colour} ${design.layout.toUpperCase()} Kitchen`,
      design,
      previewImage: snapshot,
      aiRenderImage,
    };
    const response = await fetch(savedDesignId ? `/api/designs/${savedDesignId}` : "/api/designs", {
      method: savedDesignId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json() as { design?: { _id: string }; error?: string };
    if (response.status === 401) {
      redirectForLogin();
      throw new Error("Sign in to save your design.");
    }
    if (!response.ok || !data.design) throw new Error(data.error || "Unable to save design.");
    setSavedDesignId(data.design._id);
    if (snapshot) setRenderSnapshot(snapshot);
    setSaved(true);
    setStatus("Design saved to your account.");
    return data.design._id;
  };

  const submitQuote = async (values: LeadValues) => {
    setStatus("Submitting…");
    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerInfo: { name: values.name, email: values.email, phone: values.phone, city: values.city, pincode: values.pinCode },
          design,
          previewImage: captureSnapshot() || renderSnapshot,
          aiRenderImage,
          designId: savedDesignId || undefined,
        }),
      });
      const data = await response.json() as { quote?: SubmittedQuote; error?: string };
      if (!response.ok || !data.quote) throw new Error(data.error || "Quote request failed.");
      setSubmission(data.quote);
      setStatus(`Quote ${data.quote.quoteNumber} created. Preparing your PDF…`);
      try {
        await downloadQuotePdf(data.quote, includeRenderInQuote);
        setStatus(`Quote ${data.quote.quoteNumber} saved. Your PDF has downloaded.`);
      } catch {
        setStatus(`Quote ${data.quote.quoteNumber} saved, but the PDF could not be generated in this browser.`);
      }
    } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to submit quote."); }
  };

  const saveDesign = async () => {
    try { await persistDesign(); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Unable to save design."); }
  };

  const handleAddCabinet = () => {
    const added = addCabinet();
    setCabinetStatus(added ? "Cabinet added to the layout." : "No clear wall space is available for another cabinet.");
  };

  const handleRoomReference = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setStatus("Choose a JPEG, PNG, or WebP image for the room reference.");
      return;
    }
    if (file.size > 4_000_000) {
      setStatus("Choose a room photo smaller than 4 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setRoomReference(reader.result);
        setImageMatchNote("");
      }
      else setStatus("Unable to read the selected room photo.");
    };
    reader.onerror = () => setStatus("Unable to read the selected room photo.");
    reader.readAsDataURL(file);
  };

  const generate3DFromUploadedPhoto = async () => {
    if (!roomReference) return;
    setReferenceImage(roomReference);
    setImageModelError("");
    setImageMatchNote("");
    setImageModelLoading(true);
    setStatus("Analyzing image cabinetry, wood grain & layout → Building 3D model…");
    try {
      const result = await requestImageTo3D({
        imageBase64: roomReference,
        presetHint: "uploaded-photo",
        measurements: design.measurements,
      });
      setDesign(result.design);
      setSelectedCabinetId(null);
      setView("3d");
      setImageMatchNote(result.note);
      setStatus(result.source === "groq-vision"
        ? "Reference photo analyzed and applied to the live 3D model."
        : "AI image analysis is unavailable; a classic shaker preset has been applied as a starting point.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to build a 3D model from this photo.";
      setImageModelError(message);
      setStatus(message);
    } finally {
      setImageModelLoading(false);
    }
  };

  const generateStudioRender = async () => {
    if (view !== "3d") {
      setView("3d");
      setStatus("3D view is ready. Select Render Studio View again to capture the latest model.");
      return;
    }
    let snapshot = "";
    let renderReference = "";
    try {
      snapshot = captureSnapshot();
      if (snapshot) renderReference = await createRenderReference(snapshot);
    }
    catch {
      setStatus("Unable to prepare the captured 3D model for rendering. Please try again.");
      return;
    }
    if (!snapshot || !renderReference) {
      setStatus("The 3D model is still loading. Please try again in a moment.");
      return;
    }
    setRenderSnapshot(snapshot);
    setRenderSplit(50);
    setRenderOpen(true);
    setRenderLoading(true);
    setAiRenderImage("");
    setRenderSource("");
    setStatus("Creating an architectural preview from your kitchen design…");
    try {
      const response = await fetch("/api/render-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotBase64: renderReference, design, cameraAngle, lightingMood }),
      });
      const data = await response.json() as { aiRenderImage?: string; renderSource?: "cloudflare-workers-ai" | "curated-fallback"; error?: string };
      if (response.status === 401) {
        redirectForLogin();
        return;
      }
      if (!response.ok || !data.aiRenderImage) throw new Error(data.error || "Unable to generate the architectural render.");
      setAiRenderImage(data.aiRenderImage);
      const source = data.renderSource ?? "curated-fallback";
      setRenderSource(source);
      setStatus(source === "curated-fallback"
        ? "Cloudflare render is unavailable; showing a curated kitchen preview that you can still save."
        : "Cloudflare Workers AI created an image-to-image render from your captured 3D kitchen model.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to generate the architectural render.");
    } finally {
      setRenderLoading(false);
    }
  };

  const openRenderStudio = () => { void generateStudioRender(); };

  const saveRenderToDesign = async () => {
    try {
      await persistDesign();
      setStatus("The studio render and design have been saved to your account.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save the studio render.");
    }
  };

  const askAdvisor = async () => {
    setAiLoading(true);
    setStatus("");
    try {
      const lakhBudget = aiPrompt.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac)s?\b/i);
      const rupeeBudget = aiPrompt.match(/₹\s*([\d,]+)/);
      const parsedBudget = aiBudget.trim()
        ? Number(aiBudget.replace(/[^\d]/g, ""))
        : lakhBudget ? Math.round(Number(lakhBudget[1]) * 100_000)
          : rupeeBudget ? Number(rupeeBudget[1].replace(/,/g, "")) : undefined;
      const response = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          budgetINR: parsedBudget,
          measurements: design.measurements,
          roomPhoto: roomReference,
        }),
      });
      const data = await response.json() as { recommendation?: AdvisorRecommendation; error?: string };
      if (response.status === 401) {
        redirectForLogin();
        return;
      }
      if (!response.ok || !data.recommendation) throw new Error(data.error || "Unable to prepare a recommendation.");
      setRecommendation(data.recommendation);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to prepare a recommendation.");
    } finally {
      setAiLoading(false);
    }
  };

  const applyRecommendation = () => {
    if (!recommendation) return;
    setDesign({
      layout: recommendation.layout,
      cabinetInventory: recommendation.cabinets,
      doorStyle: recommendation.doorStyle,
      colour: recommendation.colour,
      colourHex: undefined,
      finish: recommendation.finish,
      countertop: recommendation.countertop,
      handle: recommendation.handle,
    });
    setSelectedCabinetId(null);
    setCabinetStatus("AI Studio Advisor recommendations applied to the live model.");
  };

  const downloadQuote = async () => {
    if (!submission) {
      setStep(6);
      setStatus("Complete the customer details to create a server-verified quote and download its PDF.");
      return;
    }
    try { await downloadQuotePdf(submission, includeRenderInQuote); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Unable to generate the quotation PDF."); }
  };

  const steps = ["Layout", "Measurements", "Cabinet Style", "Materials", "Visualizer", "Cabinets", "Quote"];
  return (
    <main className="min-h-screen bg-[#F7F5F0]">
      <header className="flex h-16 items-center justify-between border-b border-[#D8D5CD] px-4 md:px-8">
        <Link href="/" className="font-serif text-lg tracking-[0.14em]">CABINET STUDIO</Link>
        <div className="hidden items-center gap-1 md:flex">{steps.map((name, index) => <button key={name} onClick={() => setStep(index)} className={`px-3 py-2 text-xs ${index === step ? "border-b-2 border-[#292A27] font-semibold" : "text-[#77796F]"}`}>{index + 1}. {name}</button>)}</div>
        <button onClick={saveDesign} className="flex shrink-0 items-center gap-2 whitespace-nowrap px-2 text-sm"><Save size={16} /> Save</button>
      </header>

      <div className="grid min-h-[calc(100vh-64px)] lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)_minmax(280px,300px)]">
        <aside className="border-b border-[#D8D5CD] bg-white p-5 lg:border-b-0 lg:border-r">
          {step === 0 && <><p className="eyebrow">01 / Kitchen layout</p><h1 className="mt-3 font-serif text-3xl">Choose your shape.</h1><div className="mt-6 grid grid-cols-2 gap-3">{(["straight","l","u","galley"] as const).map((layout) => <button key={layout} onClick={() => setLayout(layout)} className={`border p-4 text-left ${design.layout === layout ? "border-[#292A27] bg-[#EFECE4]" : "border-[#D8D5CD]"}`}><div className="mb-4 h-16"><svg viewBox="0 0 100 70" className="h-full w-full"><rect x="10" y="18" width={layout === "straight" ? 80 : 58} height="12" fill="#292A27" /><path d={layout === "l" ? "M10 18V58H30V30" : layout === "u" ? "M10 18V58H30M68 18V58H48" : "M10 18V58M68 18V58"} fill="none" stroke="#292A27" strokeWidth="12" /></svg></div><b className="text-sm">{layout === "l" ? "L-Shaped" : layout === "u" ? "U-Shaped" : layout === "galley" ? "Galley" : "Straight"}</b></button>)}</div></>}
          {step === 1 && <><p className="eyebrow">02 / Measurements</p><h1 className="mt-3 font-serif text-3xl">Define the room.</h1><div className="mt-6 space-y-4">{([
            ["length","Kitchen length"],["width","Kitchen width"],["wallHeight","Wall height"],["ceilingHeight","Ceiling height"],
          ] as const).map(([key,label]) => <label key={key} className="block text-xs font-semibold uppercase tracking-wider">{label}<div className="mt-2 flex items-center border border-[#D8D5CD] bg-[#F7F5F0]"><input type="number" value={design.measurements[key]} onChange={(event) => setMeasurements({ [key]: Number(event.target.value) })} className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base outline-none" /><span className="pr-3 text-xs">IN</span></div></label>)}</div>{errors.map((error) => <p key={error} className="mt-3 text-sm text-red-700">{error}</p>)}</>}
          {step === 2 && <><p className="eyebrow">03 / Cabinet style</p><h1 className="mt-3 font-serif text-3xl">Frame the room.</h1><div className="mt-6 grid grid-cols-2 gap-3">{doorStyles.map((style) => <button key={style.name} onClick={() => setDesign({ doorStyle: style.name })} className={`p-2 text-left ${design.doorStyle === style.name ? "bg-[#EFECE4] ring-1 ring-[#292A27]" : ""}`}><DoorPreview name={style.name} active={design.doorStyle === style.name} colour={design.colourHex ?? cabinetColours.find(([name]) => name === design.colour)?.[1] ?? "#EEEBDD"} /><b className="mt-2 block text-sm">{style.name}</b><span className="mt-0.5 block text-xs text-[#77796F]">{style.description}</span></button>)}</div></>}
          {step === 3 && <><p className="eyebrow">04 / Materials</p><h1 className="mt-3 font-serif text-3xl">Compose finishes.</h1><div className="mt-5"><p className="mb-2 text-xs font-semibold uppercase">Cabinet colour</p><div className="grid grid-cols-4 gap-2">{cabinetColours.map(([name, value]) => <button title={name} key={name} onClick={() => setDesign({ colour: name, colourHex: undefined })} className={`h-10 border-2 ${design.colour === name ? "border-[#292A27]" : "border-transparent"}`} style={{ background: value }} />)}</div></div><label className="mt-5 block text-xs font-semibold uppercase">Finish<select value={design.finish} onChange={(e) => setDesign({ finish: e.target.value })} className="mt-2 w-full border border-[#D8D5CD] bg-white p-3">{finishes.map((x) => <option key={x}>{x}</option>)}</select></label><label className="mt-4 block text-xs font-semibold uppercase">Handles<select value={design.handle} onChange={(e) => setDesign({ handle: e.target.value })} className="mt-2 w-full border border-[#D8D5CD] bg-white p-3">{handles.map((x) => <option key={x}>{x}</option>)}</select></label><label className="mt-4 block text-xs font-semibold uppercase">Countertop<select value={design.countertop} onChange={(e) => setDesign({ countertop: e.target.value })} className="mt-2 w-full border border-[#D8D5CD] bg-white p-3">{countertops.map((x) => <option key={x}>{x}</option>)}</select></label><label className="mt-4 block text-xs font-semibold uppercase">Backsplash<select value={design.backsplash} onChange={(e) => setDesign({ backsplash: e.target.value })} className="mt-2 w-full border border-[#D8D5CD] bg-white p-3">{backsplashes.map((x) => <option key={x}>{x}</option>)}</select></label></>}
          {step === 4 && <><p className="eyebrow">05 / Visualizer</p><h1 className="mt-3 font-serif text-3xl">Experience the room.</h1><p className="mt-4 text-sm leading-6 text-[#77796F]">Inspect your layout, adjust the lighting mood and camera, or open doors to review the cabinet interiors.</p><div className="mt-5"><p className="mb-2 text-xs font-semibold uppercase">Lighting mood</p><div className="grid grid-cols-3 gap-1">{([["daylight","Daylight"],["warm-evening","Warm"],["under-cabinet-led","LED"]] as const).map(([mood,label]) => <button key={mood} onClick={() => setLightingMood(mood)} className={`border px-2 py-2 text-[10px] ${lightingMood === mood ? "border-[#292A27] bg-[#EFECE4]" : "border-[#D8D5CD]"}`}>{label}</button>)}</div></div><label className="mt-4 block text-xs font-semibold uppercase">Camera angle<select value={cameraAngle} onChange={(event) => setCameraAngle(event.target.value as CameraAngle)} className="mt-2 w-full border border-[#D8D5CD] bg-white p-3 text-sm"><option value="perspective">Perspective</option><option value="front-elevation">Front elevation</option><option value="top-floor-plan">Top floor plan</option><option value="close-up-hardware">Close-up hardware</option></select></label><button onClick={() => setDoorsOpen((open) => !open)} className="mt-4 w-full border border-[#D8D5CD] px-4 py-3 text-sm">{doorsOpen ? "Close doors" : "Open doors"}</button><label className="mt-5 block text-xs font-semibold uppercase">Room photo reference<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleRoomReference(event.target.files?.[0])} className="mt-2 block w-full text-xs normal-case file:mr-3 file:border-0 file:bg-[#EFECE4] file:px-3 file:py-2" /></label>{roomReference && <><Image src={roomReference} alt="Uploaded room reference" width={720} height={260} unoptimized className="mt-3 h-32 w-full object-cover" /><button onClick={() => void generate3DFromUploadedPhoto()} disabled={imageModelLoading} className="mt-3 flex w-full items-center justify-center gap-2 border border-[#292A27] px-4 py-3 text-xs disabled:opacity-50">{imageModelLoading ? <><LoaderCircle size={14} className="animate-spin" /> Building 3D model…</> : "Generate 3D Model from Photo"}</button></>}<div className="mt-7 border border-[#D8D5CD] bg-[#F7F5F0] p-4"><p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]"><Sparkles size={14} /> AI Studio Advisor</p><label className="mt-4 block text-[10px] font-semibold uppercase tracking-wider">Describe your kitchen idea<textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} maxLength={1200} placeholder="L-shaped sage kitchen with brass handles under ₹2.5 lakhs" className="mt-2 min-h-20 w-full border border-[#D8D5CD] bg-white p-3 text-sm font-normal normal-case" /></label><label className="mt-3 block text-[10px] font-semibold uppercase tracking-wider">Budget in INR<input type="number" min={50000} max={10000000} value={aiBudget} onChange={(event) => setAiBudget(event.target.value)} placeholder="250000" className="mt-2 w-full border border-[#D8D5CD] bg-white p-3 text-sm font-normal tabular-nums normal-case" /></label><button onClick={askAdvisor} disabled={aiLoading || aiPrompt.trim().length < 3} className="mt-4 flex w-full items-center justify-center gap-2 bg-[#292A27] px-4 py-3 text-xs text-white disabled:opacity-50">{aiLoading ? <><LoaderCircle size={14} className="animate-spin" /> Thinking…</> : "Get design recommendation"}</button>{recommendation && <div className="mt-4 border-t border-[#D8D5CD] pt-4"><p className="font-serif text-xl">{recommendation.layout.toUpperCase()} · {recommendation.doorStyle}</p><p className="mt-1 text-xs">{recommendation.colour} · {recommendation.finish} · {recommendation.countertop} · {recommendation.handle}</p><p className="mt-2 font-serif text-lg">{formatINR(recommendation.estimatedTotalINR)} {recommendation.withinBudget === null ? "indicative estimate" : recommendation.withinBudget ? "· Within budget" : "· Above budget"}</p><ul className="mt-3 list-disc space-y-1 pl-4 text-[10px] leading-5 text-[#6D6F68]">{recommendation.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul><button onClick={applyRecommendation} className="mt-4 w-full border border-[#292A27] px-4 py-3 text-xs">Apply AI Design · {recommendation.cabinets.length} cabinets</button></div>}</div></>}
          {step === 5 && <><p className="eyebrow">06 / Cabinet configuration</p><h1 className="mt-3 font-serif text-3xl">Refine the inventory.</h1><button onClick={handleAddCabinet} className="mt-5 flex w-full items-center justify-center gap-2 bg-[#292A27] py-3 text-sm text-white"><Plus size={16} /> Add cabinet</button>{cabinetStatus && <p role="status" className="mt-2 text-xs text-[#77796F]">{cabinetStatus}</p>}<div className="mt-4 max-h-[520px] space-y-2 overflow-auto">{design.cabinetInventory.map((item) => <button key={item.id} onClick={() => setSelectedCabinetId(item.id)} className={`w-full border p-3 text-left ${selectedCabinetId === item.id ? "border-[#292A27]" : "border-[#D8D5CD]"}`}><b className="text-sm">{item.name}</b><p className="mt-1 text-xs text-[#77796F]">{item.width}&quot; W × {item.height}&quot; H</p></button>)}</div></>}
          {step === 6 && <><p className="eyebrow">07 / Quote</p><h1 className="mt-3 font-serif text-3xl">Request your estimate.</h1>{submission ? <div className="mt-6 border border-[#A4AA94] bg-[#EFECE4] p-5"><p className="text-xs font-semibold uppercase">Quote saved · {submission.status}</p><p className="mt-2 font-serif text-2xl">{submission.quoteNumber}</p><p className="mt-2 text-sm">{formatINR(submission.grandTotalINR)}</p><button onClick={downloadQuote} className="mt-4 flex items-center gap-2 border border-[#292A27] px-4 py-3 text-xs"><Download size={15} /> Download server-verified PDF</button><Link href="/dashboard" className="mt-4 block text-xs underline underline-offset-4">View in your dashboard</Link></div> : <form onSubmit={form.handleSubmit(submitQuote)} className="mt-5 space-y-3">{(["name","email","phone","city","pinCode"] as const).map((key) => <label key={key} className="block text-xs font-semibold uppercase">{key === "pinCode" ? "PIN Code" : key}<input {...form.register(key)} maxLength={key === "pinCode" ? 6 : undefined} inputMode={key === "pinCode" ? "numeric" : undefined} className="mt-1 w-full border border-[#D8D5CD] bg-[#F7F5F0] p-3 text-sm outline-none" /><span className="mt-1 block text-xs normal-case text-red-700">{form.formState.errors[key]?.message}</span></label>)}<button className="w-full bg-[#292A27] py-3 text-sm text-white">Create Final Quote & Download PDF</button></form>}<p className="mt-3 text-xs text-[#77796F]">{status}</p></>}
        </aside>

        <section id="kitchen-viewport" className="relative min-h-[420px] bg-[#EEECE4]">
          <div className="absolute left-4 top-4 z-10 flex bg-white shadow-sm"><button onClick={() => setView("3d")} className={`px-4 py-2 text-xs ${view === "3d" ? "bg-[#292A27] text-white" : ""}`}>3D VIEW</button><button onClick={() => setView("2d")} className={`px-4 py-2 text-xs ${view === "2d" ? "bg-[#292A27] text-white" : ""}`}>2D PLAN</button><button onClick={() => setView("materials")} className={`px-4 py-2 text-xs ${view === "materials" ? "bg-[#292A27] text-white" : ""}`}>MATERIALS</button></div>
          {view === "3d" && <Kitchen3D mood={lightingMood} doorsOpen={doorsOpen} cameraAngle={cameraAngle} />}
          {view === "2d" && <FloorPlan />}
          {view === "materials" && <MaterialStudio design={design} countertopRatePerSqFt={quote.countertopRatePerSqFt} handleUpgrade={quote.handleUpgrade} onTryIn3D={() => { setView("3d"); setStep(4); }} />}
          {view === "3d" && imageMatchNote && referenceImage && (
            <div className="absolute left-4 top-[3.6rem] z-10 flex max-w-[230px] items-center gap-3 border border-white/60 bg-white/95 p-2 shadow-sm" title={imageMatchNote}>
              <div className="relative h-12 w-14 shrink-0 overflow-hidden bg-[#E9E1D5]">
                <Image src={referenceImage} alt="Kitchen reference used for this 3D model" fill unoptimized sizes="56px" className="object-cover" />
              </div>
              <div><p className="text-[9px] font-semibold uppercase leading-4 tracking-[0.1em]">Matched from<br />Reference Image</p><p className="mt-1 text-[9px] text-[#77796F]">{imageMatchNote}</p></div>
            </div>
          )}
          {imageModelError && !imageModelLoading && (
            <div role="status" className="absolute left-4 top-4 z-20 max-w-[min(90%,420px)] border border-red-200 bg-white/95 px-4 py-3 text-xs text-red-800 shadow-sm">{imageModelError}</div>
          )}
          {imageModelLoading && (
            <div className="absolute inset-0 z-30 grid place-items-center bg-[#F7F5F0]/85 p-6 text-center backdrop-blur-sm">
              <div className="flex items-center gap-3 bg-white px-5 py-4 text-sm shadow">
                <LoaderCircle size={18} className="shrink-0 animate-spin" />
                <span>Analyzing image cabinetry, wood grain &amp; layout → Building 3D model…</span>
              </div>
            </div>
          )}
          {view === "3d" && <>
            <div className="absolute right-4 top-4 z-10 rounded-full border border-white/60 bg-white/90 px-4 py-2 text-xs shadow-sm" title={workTriangle.tip}><span className="inline-flex items-center gap-2"><Activity size={14} /> Work Triangle: <b>{workTriangle.score}/100</b> {workTriangle.status}</span></div>
            <div className="absolute bottom-4 left-4 z-10 hidden gap-1 rounded bg-white/90 p-1 shadow-sm sm:flex">{([["daylight","Daylight",Sun],["warm-evening","Warm",Moon],["under-cabinet-led","LED",Lightbulb]] as const).map(([mood,label,Icon]) => <button key={mood} onClick={() => setLightingMood(mood)} aria-pressed={lightingMood === mood} title={`${label} lighting`} className={`flex items-center gap-1 px-2 py-2 text-[10px] ${lightingMood === mood ? "bg-[#292A27] text-white" : ""}`}><Icon size={13} />{label}</button>)}</div>
          </>}
          <div className="absolute bottom-4 right-4 z-10 flex flex-wrap justify-end gap-2"><button onClick={() => setDoorsOpen((open) => !open)} className="flex items-center gap-2 bg-white px-3 py-2 text-xs shadow-sm" title="Inspect cabinet interiors"><Eye size={15} />{doorsOpen ? "Close doors" : "Open doors"}</button><button onClick={openRenderStudio} className="flex items-center gap-2 bg-[#292A27] px-3 py-2 text-xs text-white shadow-sm"><Camera size={15} /> Render Studio View</button><button onClick={() => setView("3d")} className="grid h-9 w-9 place-items-center bg-white shadow-sm" title="Reset view"><RotateCcw size={16} /></button><button className="grid h-9 w-9 place-items-center bg-white shadow-sm" title="Fullscreen" onClick={() => document.documentElement.requestFullscreen()}><Maximize2 size={16} /></button></div>
        </section>

        <aside className="min-w-0 overflow-x-hidden border-t border-[#D8D5CD] bg-white px-5 py-5 lg:border-l lg:border-t-0">
          {selectedCabinet ? <div className="mb-5 border-b border-[#D8D5CD] pb-5"><p className="text-xs uppercase tracking-wider text-[#77796F]">Selected cabinet</p><h2 className="mt-2 font-serif text-xl">{selectedCabinet.name}</h2><p className="mt-2 text-sm">{selectedCabinet.width}&quot; × {selectedCabinet.height}&quot; × {selectedCabinet.depth}&quot;</p><label className="mt-3 block text-xs">Width<input type="number" value={selectedCabinet.width} onChange={(e) => updateCabinet(selectedCabinet.id, { width: Number(e.target.value) })} className="mt-1 w-full border border-[#D8D5CD] p-2" /></label><button onClick={() => removeCabinet(selectedCabinet.id)} className="mt-3 flex items-center gap-2 text-xs text-red-700"><Trash2 size={14} /> Remove cabinet</button></div> : null}
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">Live estimate</p><h2 className="mt-3 whitespace-nowrap font-serif text-3xl tabular-nums">{formatINR(quote.grandTotal)}</h2>
          <div className="mt-5 space-y-3 border-t border-[#D8D5CD] pt-4">{quote.cabinetRows.slice(0,5).map((row, index) => <div key={`${row.sku}-${index}`} className="flex min-w-0 items-center justify-between gap-2 text-sm tabular-nums"><span className="min-w-0 truncate">{row.quantity} × {row.name}</span><b className="shrink-0 whitespace-nowrap">{formatINR(row.lineTotal)}</b></div>)}</div>
          <div className="mt-5 space-y-2 border-t border-[#D8D5CD] pt-4 text-sm tabular-nums"><div className="flex min-w-0 justify-between gap-2"><span className="min-w-0 truncate">Cabinet subtotal</span><b className="shrink-0 whitespace-nowrap">{formatINR(quote.cabinetSubtotal)}</b></div><div className="flex min-w-0 justify-between gap-2"><span className="min-w-0 truncate">Handles & accessories</span><b className="shrink-0 whitespace-nowrap">{formatINR(quote.handleUpgrade + quote.accessories)}</b></div><div className="flex min-w-0 justify-between gap-2"><span className="min-w-0 truncate">Countertop & backsplash</span><b className="shrink-0 whitespace-nowrap">{formatINR(quote.countertop + quote.backsplash)}</b></div><div className="flex min-w-0 justify-between gap-2"><span className="min-w-0 truncate">Discount</span><b className="shrink-0 whitespace-nowrap">−{formatINR(quote.discount)}</b></div><div className="flex min-w-0 justify-between gap-2"><span className="min-w-0 truncate">Taxable amount</span><b className="shrink-0 whitespace-nowrap">{formatINR(quote.taxable)}</b></div><div className="flex min-w-0 justify-between gap-2"><span className="min-w-0 truncate">GST ({Math.round(quote.gstRate * 100)}%)</span><b className="shrink-0 whitespace-nowrap">{formatINR(quote.gst)}</b></div></div>
          <button onClick={downloadQuote} className="mt-5 flex w-full items-center justify-center gap-2 border border-[#292A27] py-3 text-sm"><Download size={16} /> Download INR Quote</button>
          <label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={includeRenderInQuote} onChange={(event) => setIncludeRenderInQuote(event.target.checked)} /> Include studio images in PDF quote</label>
          <p className="mt-4 text-[11px] leading-5 text-[#77796F]">Indicative INR pricing only. GST shown at 18%; final pricing is subject to measurement, material availability and design review.</p>
        </aside>
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-between border-t border-[#D8D5CD] bg-white p-3 lg:hidden"><button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="flex items-center gap-2 px-3"><ArrowLeft size={16} /> Back</button><span className="py-2 text-xs">{step + 1} / 7</span><button onClick={() => setStep(Math.min(6, step + 1))} disabled={step === 6} className="flex items-center gap-2 px-3">Next <ArrowRight size={16} /></button></div>
      {saved && <div className="fixed bottom-20 right-5 z-50 bg-[#292A27] px-5 py-3 text-sm text-white lg:bottom-5">Draft saved</div>}
      {renderOpen && <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="render-studio-title"><div className="max-h-[92vh] w-full max-w-5xl overflow-auto bg-[#F7F5F0] p-5 md:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.24em] text-[#77796F]">Cabinet Studio · Architectural preview</p><h2 id="render-studio-title" className="mt-1 font-serif text-3xl">Render Studio View</h2><p className="mt-2 text-sm text-[#77796F]">{activePreset?.name ?? "Custom kitchen"} · {design.layout.toUpperCase()} · {design.doorStyle} · {design.colour} · {design.countertop} · {formatINR(quote.grandTotal)}</p></div><button onClick={() => setRenderOpen(false)} aria-label="Close render preview" className="grid h-9 w-9 place-items-center border border-[#D8D5CD]"><X size={18} /></button></div><div className="relative mt-5 aspect-[16/8] overflow-hidden bg-[#dedbd3]">{aiRenderImage ? <Image src={aiRenderImage} alt={renderSource === "curated-fallback" ? "Curated architectural kitchen preview" : "Cloudflare AI architectural render based on the current kitchen design"} fill unoptimized sizes="(max-width: 768px) 100vw, 900px" className="object-cover" /> : <div className="absolute inset-0 grid place-items-center bg-[#E9E1D5] p-8 text-center text-sm text-[#6D6F68]">{renderLoading ? <span className="flex items-center gap-2"><LoaderCircle size={18} className="animate-spin" /> Creating an architectural kitchen preview…</span> : "Create a preview to compare it with your live 3D model."}</div>}{renderSnapshot && <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - renderSplit}% 0 0)` }}><Image src={renderSnapshot} alt="Captured live 3D CAD kitchen model" fill unoptimized sizes="(max-width: 768px) 100vw, 900px" className="object-cover" /></div>}{aiRenderImage && <><div className="absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${renderSplit}%` }} /><span className="absolute right-3 top-3 bg-[#292A27]/85 px-3 py-2 text-[10px] text-white">{renderSource === "curated-fallback" ? "CURATED KITCHEN PREVIEW" : "CLOUDFLARE AI RENDER"}</span></>}<span className="absolute left-3 top-3 bg-[#292A27]/85 px-3 py-2 text-[10px] text-white">LIVE 3D CAD MODEL</span></div><div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center"><label className="text-xs font-semibold uppercase tracking-wider">Before / after comparison<div className="mt-2 flex items-center gap-3"><span>3D</span><input type="range" min="0" max="100" value={renderSplit} onChange={(event) => setRenderSplit(Number(event.target.value))} className="w-full accent-[#694A36]" /><span>Preview</span></div></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeRenderInQuote} onChange={(event) => setIncludeRenderInQuote(event.target.checked)} /> Include render in PDF</label></div><div className="mt-5 flex flex-wrap gap-3"><button onClick={() => void generateStudioRender()} disabled={renderLoading} className="inline-flex items-center gap-2 border border-[#292A27] px-4 py-3 text-xs disabled:opacity-50"><Camera size={14} /> {renderLoading ? "Rendering…" : "Regenerate Render"}</button><button onClick={saveRenderToDesign} disabled={!aiRenderImage} className="bg-[#292A27] px-4 py-3 text-xs text-white disabled:opacity-50">Save Render to Design & PDF Quote</button></div><p className="mt-4 text-xs leading-5 text-[#77796F]">{status || "Cloudflare Workers AI renders may differ slightly from the live 3D model. Curated previews are shown if rendering is unavailable."}</p></div></div>}
    </main>
  );
}
