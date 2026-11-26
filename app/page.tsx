"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowDown, ArrowRight, Boxes, Menu, Palette, ReceiptText,
  Ruler, X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { formatINR } from "@/lib/currency";
import { DOOR_PRESETS, KITCHEN_PRESETS } from "@/lib/presets";

const photos = {
  hero: "/cabinet-studio/hero-kitchen.jpg",
};

const collections = [
  {
    slug: "modern-minimalist",
    ...KITCHEN_PRESETS["modern-minimalist"],
  },
  {
    slug: "scandinavian-oak",
    ...KITCHEN_PRESETS["scandinavian-oak"],
  },
  {
    slug: "contemporary-luxury",
    ...KITCHEN_PRESETS["contemporary-luxury"],
  },
  {
    slug: "classic-shaker",
    ...KITCHEN_PRESETS["classic-shaker"],
  },
  {
    slug: "sage-brass",
    ...KITCHEN_PRESETS["sage-brass"],
  },
  {
    slug: "luxury-walnut",
    ...KITCHEN_PRESETS["luxury-walnut"],
  },
];

const doorStyles = [
  { ...DOOR_PRESETS["classic-shaker"], slug: "classic-shaker", note: "Enduring structure", frame: "70 mm frame", finish: "Satin lacquer", image: "/cabinet-studio/door-classic.jpg", position: "center" },
  { ...DOOR_PRESETS["slim-shaker"], slug: "slim-shaker", note: "Quiet refinement", frame: "35 mm micro-frame", finish: "Matte lacquer", image: "/cabinet-studio/door-slim-shaker.png", position: "center" },
  { ...DOOR_PRESETS["flat-slab"], slug: "flat-slab", note: "Modern restraint", frame: "Seamless 22 mm face", finish: "Anti-fingerprint matte", image: "/cabinet-studio/door-flat-slab.png", position: "center" },
  { ...DOOR_PRESETS["glass-front"], slug: "glass-front", note: "Light and display", frame: "Slim aluminium frame", finish: "Fluted bronze glass", image: "/cabinet-studio/door-glass-front.png", position: "center" },
];

const materials = {
  "Cabinet Finishes": [
    { name: "Natural Oak", color: "#B38B62", image: "/cabinet-studio/material-natural-oak.png", finish: "Open-pore European oak veneer", texture: "oak" },
    { name: "American Walnut", color: "#694A36", image: "/cabinet-studio/material-american-walnut.png", finish: "Book-matched American walnut", texture: "walnut" },
    { name: "Muted Sage", color: "#9DA58F", image: "/cabinet-studio/material-muted-sage.png", finish: "Matte anti-fingerprint lacquer", texture: "sage" },
    { name: "Matte Charcoal", color: "#393A36", image: "/cabinet-studio/material-matte-charcoal.png", finish: "Soft-touch super-matte lacquer", texture: "charcoal" },
    { name: "Warm Ivory", color: "#F6F3ED", image: "/cabinet-studio/material-warm-ivory.png", finish: "Silk-matte mineral lacquer", texture: "ivory" },
  ],
  Countertops: [
    { name: "Carrara Marble", color: "#D8D6D0", image: "/cabinet-studio/material-carrara-marble.png", finish: "Italian vein-matched natural stone", texture: "marble" },
    { name: "White Quartz", color: "#E9E7E1", image: "/cabinet-studio/material-white-quartz.png", finish: "Engineered quartz · low porosity", texture: "quartz" },
    { name: "Black Granite", color: "#343632", image: "/cabinet-studio/material-black-granite.png", finish: "Honed natural granite", texture: "granite" },
  ],
  Hardware: [
    { name: "Brushed Brass", color: "#B38B62", image: "/cabinet-studio/material-brushed-brass.png", finish: "Living finish · hand-brushed brass", texture: "brass" },
    { name: "Matte Black", color: "#272824", image: "/cabinet-studio/material-matte-black.png", finish: "Powder-coated solid metal", texture: "black" },
    { name: "Brushed Nickel", color: "#9A9B96", image: "/cabinet-studio/material-brushed-nickel.png", finish: "Brushed PVD stainless steel", texture: "nickel" },
  ],
};

type MaterialCategory = keyof typeof materials;
type MaterialChoice = (typeof materials)[MaterialCategory][number];
type ImageReference = {
  src: string;
  title: string;
  alt: string;
  hint: string;
  tags: string[];
  preset?: string;
  door?: string;
  material?: string;
};
const navigation = [
  ["Kitchen Collections", "#kitchen-collections"],
  ["Inspiration Gallery", "#inspiration-gallery"],
  ["Door Styles", "#door-styles"],
  ["Materials", "#materials"],
  ["How It Works", "#how-it-works"],
  ["About", "#about"],
  ["Contact", "#contact"],
];
const processSteps = [
  { Icon: Ruler, number: "01", title: "Choose Your Layout", copy: "Begin with the shape that makes the most of your room." },
  { Icon: Palette, number: "02", title: "Customize Your Cabinets", copy: "Compose a considered palette of doors, finishes and surfaces." },
  { Icon: Boxes, number: "03", title: "Visualize Your Kitchen", copy: "Explore your evolving design in an interactive 3D studio." },
  { Icon: ReceiptText, number: "04", title: "Get Your Instant Quote", copy: "See a clear, itemized indicative estimate as you design." },
];
const benefits = [
  ["A living 3D design", "See your choices take shape in a responsive, parametric kitchen."],
  ["Materials with character", "Explore considered finishes, hardware and surfaces together."],
  ["A thoughtful starting point", "Begin from a layout recommendation shaped around your room."],
  ["Pricing in clear view", "Follow an indicative estimate as your design evolves."],
];

function InteractiveImage({ image, sizes, onPreview, onCreate, priority = false, imageClassName = "object-cover", showCreate = true }: {
  image: ImageReference;
  sizes: string;
  onPreview: (image: ImageReference) => void;
  onCreate: (image: ImageReference) => void;
  priority?: boolean;
  imageClassName?: string;
  showCreate?: boolean;
}) {
  return (
    <>
      <button type="button" onClick={() => onPreview(image)} aria-label={`Preview ${image.title}`} className="absolute inset-0 z-10 w-full text-left">
        <Image src={image.src} alt={image.alt} fill priority={priority} sizes={sizes} className={imageClassName} />
      </button>
      {showCreate && (
        <button type="button" onClick={() => onCreate(image)} className="absolute right-4 top-4 z-30 inline-flex items-center gap-2 bg-[#F6F3ED] px-3 py-2 text-[9px] font-medium uppercase tracking-[0.12em] text-[#272824] opacity-100 transition hover:bg-white md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100">
          Create 3D Model <ArrowRight size={12} />
        </button>
      )}
    </>
  );
}

export default function Home() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [account, setAccount] = useState<{ name: string; role: "customer" | "admin" } | null>(null);
  const [accountLoaded, setAccountLoaded] = useState(false);
  const [materialCategory, setMaterialCategory] = useState<MaterialCategory>("Cabinet Finishes");
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialChoice>(materials["Cabinet Finishes"][0]);
  const [previewImage, setPreviewImage] = useState<ImageReference | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json() as { user: { name: string; role: "customer" | "admin" } | null };
        setAccount(data.user);
      })
      .catch(() => undefined)
      .finally(() => setAccountLoaded(true));
  }, []);

  useEffect(() => {
    const updateScroll = () => setScrolled(window.scrollY > 40);
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => window.removeEventListener("scroll", updateScroll);
  }, []);

  useEffect(() => {
    if (!previewImage) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewImage(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [previewImage]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAccount(null);
    setAccountMenuOpen(false);
    setMenuOpen(false);
  };

  const accountLink = account
    ? account.role === "admin" ? "/admin" : "/dashboard"
    : "/login?next=%2Fdesign";

  const createModelFromImage = (image: ImageReference) => {
    const params = new URLSearchParams({ imageUrl: image.src, imageHint: image.hint });
    if (image.preset) params.set("preset", image.preset);
    if (image.door) params.set("door", image.door);
    if (image.material) params.set("material", image.material);
    setPreviewImage(null);
    router.push(`/design?${params.toString()}`);
  };

  const collectionImage = (collection: (typeof collections)[number]): ImageReference => ({
    src: collection.image,
    title: collection.name,
    alt: `${collection.name} kitchen cabinetry`,
    hint: collection.slug,
    preset: collection.slug,
    tags: [collection.layout.toUpperCase(), collection.doorStyle, collection.colour, collection.finish],
  });

  const doorImage = (style: (typeof doorStyles)[number]): ImageReference => ({
    src: style.image,
    title: `${style.name} Cabinetry`,
    alt: `${style.name} cabinet doors and kitchen cabinetry`,
    hint: `door-${style.slug}`,
    door: style.slug,
    tags: [style.name, style.finish, style.frame],
  });

  const materialImage = (material: MaterialChoice): ImageReference => {
    const materialSlug = material.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const preset = material.name === "Natural Oak" || material.name === "Brushed Nickel" ? "scandinavian-oak"
      : material.name === "American Walnut" || material.name === "Black Granite" ? "luxury-walnut"
        : material.name === "Muted Sage" ? "sage-brass"
          : material.name === "Matte Charcoal" || material.name === "Matte Black" || material.name === "White Quartz" ? "modern-minimalist"
            : "classic-shaker";
    return {
      src: material.image,
      title: material.name,
      alt: `${material.name} material inspiration`,
      hint: `material-${materialSlug}`,
      preset,
      material: materialSlug,
      tags: [materialCategory, material.finish],
    };
  };

  const heroReference: ImageReference = {
    src: photos.hero,
    title: "Warm Walnut & Marble Kitchen",
    alt: "Warm white and walnut luxury kitchen with a marble island",
    hint: "hero-kitchen",
    preset: "contemporary-luxury",
    tags: ["U-SHAPED", "Walnut", "Natural Wood Grain", "Marble"],
  };

  const changeMaterialCategory = (category: MaterialCategory) => {
    setMaterialCategory(category);
    setSelectedMaterial(materials[category][0]);
  };

  const riseIn = reduceMotion
    ? { initial: false as const, whileInView: { opacity: 1, y: 0 } }
    : { initial: { opacity: 0, y: 26 }, whileInView: { opacity: 1, y: 0 } };

  return (
    <main className="overflow-hidden bg-[#F6F3ED] text-[#272824]">
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${menuOpen ? "bg-[#F6F3ED] text-[#272824]" : scrolled ? "border-b border-[#272824]/10 bg-[#F6F3ED]/90 text-[#272824] shadow-[0_8px_32px_rgba(39,40,36,.06)] backdrop-blur-md" : "bg-transparent text-white"}`}>
        <div className="mx-auto flex h-[78px] max-w-[1480px] items-center justify-between px-5 md:px-10">
          <Link href="/" aria-label="Cabinet Studio home" className="relative z-[52] font-serif text-[17px] tracking-[0.18em] md:text-xl">
            CABINET <span className={scrolled ? "text-[#B38B62]" : "text-[#E9E1D5]"}>STUDIO</span>
          </Link>
          <nav className="hidden items-center gap-6 xl:flex" aria-label="Main navigation">
            {navigation.map(([label, href]) => (
              <a key={href} href={href} className="nav-link relative py-3 text-[12px] tracking-[0.04em]">{label}</a>
            ))}
          </nav>
          <div className="hidden items-center gap-5 lg:flex">
            {!accountLoaded ? <span className="h-4 w-24 animate-pulse bg-current/10" aria-label="Loading account" /> : account ? (
              <div className="relative">
                <button onClick={() => setAccountMenuOpen((open) => !open)} className="text-xs tracking-wide transition hover:text-[#B38B62]" aria-expanded={accountMenuOpen}>
                  {account.name} <span aria-hidden="true">⌄</span>
                </button>
                {accountMenuOpen && <div className="absolute right-0 top-full z-[60] mt-3 min-w-48 border border-[#272824]/10 bg-[#F6F3ED] p-2 text-[#272824] shadow-xl">
                  <Link href={accountLink} onClick={() => setAccountMenuOpen(false)} className="block px-3 py-2 text-xs hover:bg-[#E9E1D5]">{account.role === "admin" ? "Admin Panel" : "My Dashboard"}</Link>
                  {account.role === "admin" && <Link href="/dashboard" onClick={() => setAccountMenuOpen(false)} className="block px-3 py-2 text-xs hover:bg-[#E9E1D5]">My Dashboard</Link>}
                  <button onClick={logout} className="block w-full px-3 py-2 text-left text-xs hover:bg-[#E9E1D5]">Logout</button>
                </div>}
              </div>
            ) : <Link href="/login?next=%2Fdesign" className="text-xs tracking-wide transition hover:text-[#B38B62]">Login / My Account</Link>}
            <Link href="/design" className={`group flex items-center gap-3 px-5 py-3 text-xs tracking-wide transition ${scrolled ? "bg-[#272824] text-[#F6F3ED] hover:bg-[#694A36]" : "bg-[#F6F3ED] text-[#272824] hover:bg-[#E9E1D5]"}`}>
              Design Your Kitchen <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <button onClick={() => setMenuOpen((current) => !current)} className="relative z-[52] grid h-11 w-11 place-items-center xl:hidden" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-[51] flex h-[100dvh] flex-col overflow-y-auto overscroll-contain bg-[#F6F3ED] px-7 pb-10 pt-28 text-[#272824] xl:hidden"
            >
              <p className="eyebrow">Explore Cabinet Studio</p>
              <nav className="mt-8 flex flex-col" aria-label="Mobile navigation">
                {navigation.map(([label, href], index) => (
                  <a key={href} href={href} onClick={() => setMenuOpen(false)} className="flex items-center justify-between border-b border-[#272824]/10 py-4 font-serif text-2xl">
                    <span>{label}</span><span className="text-xs text-[#B38B62]">0{index + 1}</span>
                  </a>
                ))}
              </nav>
              <div className="mt-auto grid gap-3">
                {account ? <div className="grid gap-2">
                  <Link href={accountLink} onClick={() => setMenuOpen(false)} className="border border-[#272824]/25 px-5 py-4 text-center text-sm">{account.role === "admin" ? "Admin Panel" : "My Dashboard"}</Link>
                  {account.role === "admin" && <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="border border-[#272824]/25 px-5 py-4 text-center text-sm">My Dashboard</Link>}
                  <button onClick={logout} className="border border-[#272824]/25 px-5 py-4 text-sm">Logout</button>
                </div> : <Link href="/login?next=%2Fdesign" onClick={() => setMenuOpen(false)} className="border border-[#272824]/25 px-5 py-4 text-center text-sm">Login / My Account</Link>}
                <Link href="/design" onClick={() => setMenuOpen(false)} className="bg-[#272824] px-5 py-4 text-center text-sm text-[#F6F3ED]">Design Your Kitchen <ArrowRight className="ml-2 inline" size={16} /></Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <section className="relative flex min-h-[92vh] items-end overflow-hidden bg-[#272824] text-white">
        <motion.div
          initial={reduceMotion ? false : { scale: 1 }}
          animate={{ scale: reduceMotion ? 1 : 1.06 }}
          transition={{ duration: reduceMotion ? 0 : 20, ease: "easeInOut", repeat: reduceMotion ? 0 : Infinity, repeatType: "reverse" }}
          className="absolute inset-0"
        >
          <InteractiveImage image={heroReference} sizes="100vw" onPreview={setPreviewImage} onCreate={createModelFromImage} priority imageClassName="object-cover object-center" showCreate={false} />
        </motion.div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#171814]/75 via-[#272824]/35 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#171814]/50 via-transparent to-[#171814]/10" />
        <div className="relative z-20 mx-auto w-full max-w-[1480px] px-6 pb-24 pt-40 md:px-12 md:pb-32 lg:pb-36">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.16, delayChildren: reduceMotion ? 0 : 0.2 } } }}
            className="max-w-[800px]"
          >
            <motion.p variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: reduceMotion ? 0 : 0.7 }} className="mb-7 text-[10px] font-medium uppercase tracking-[0.34em] text-[#E9E1D5] md:text-xs">
              Bespoke cabinetry · Designed around you
            </motion.p>
            <motion.h1 variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: reduceMotion ? 0 : 0.8 }} className="font-serif text-[54px] leading-[0.98] tracking-[-0.035em] sm:text-7xl md:text-8xl lg:text-[104px]">
              Design Your<br />Dream Kitchen.
            </motion.h1>
            <motion.p variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: reduceMotion ? 0 : 0.7 }} className="mt-7 max-w-[570px] text-sm leading-7 text-white/85 md:text-base md:leading-8">
              A more personal approach to the heart of your home. Explore enduring cabinetry, compose every detail and discover an indicative price — beautifully, all in one place.
            </motion.p>
            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: reduceMotion ? 0 : 0.7 }} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/design" className="group flex min-h-14 items-center justify-center gap-4 bg-[#F6F3ED] px-7 text-xs font-medium tracking-wide text-[#272824] transition hover:bg-[#E9E1D5]">
                Start Designing <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#kitchen-collections" className="flex min-h-14 items-center justify-center border border-white/55 px-7 text-xs font-medium tracking-wide transition hover:border-[#F6F3ED] hover:bg-white/10">
                Explore Collections
              </a>
              <button onClick={() => createModelFromImage(heroReference)} className="flex min-h-14 items-center justify-center gap-3 border border-white/55 px-7 text-xs font-medium tracking-wide transition hover:border-[#F6F3ED] hover:bg-white/10">
                Create 3D Model <ArrowRight size={14} />
              </button>
            </motion.div>
          </motion.div>
        </div>
        <a href="#kitchen-collections" className="absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[9px] uppercase tracking-[0.22em] text-white/75" aria-label="Scroll to kitchen collections">
          <span>Scroll to discover</span>
          <motion.span animate={reduceMotion ? {} : { y: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}><ArrowDown size={15} /></motion.span>
        </a>
      </section>

      <section id="kitchen-collections" className="scroll-mt-24 px-5 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-[1360px]">
          <motion.div {...riseIn} transition={{ duration: 0.65 }} viewport={{ once: true, amount: 0.25 }} className="mb-12 flex flex-col justify-between gap-5 md:mb-16 md:flex-row md:items-end">
            <div>
              <p className="eyebrow">A study in living</p>
              <h2 className="mt-4 max-w-2xl font-serif text-5xl leading-[1.02] tracking-[-0.025em] md:text-7xl">Find your<br className="hidden sm:block" /> expression.</h2>
            </div>
            <p className="max-w-[390px] text-sm leading-7 text-[#6D6F68]">Distinctive directions shaped around proportion, material and the rituals of everyday living.</p>
          </motion.div>
          <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-6">
            {collections.map((collection, index) => (
              <motion.article
                key={collection.slug}
                {...riseIn}
                transition={{ duration: 0.65, delay: reduceMotion ? 0 : index * 0.09 }}
                viewport={{ once: true, amount: 0.15 }}
                className={`${index === 0 ? "lg:mt-12" : ""} ${index === 2 ? "lg:-mt-12" : ""}`}
              >
                <div className="group relative block overflow-hidden bg-[#E9E1D5]">
                  <div className="relative aspect-[0.77] overflow-hidden">
                    <InteractiveImage image={collectionImage(collection)} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" onPreview={setPreviewImage} onCreate={createModelFromImage} imageClassName="object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                  </div>
                  <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-[#171814]/85 via-[#171814]/5 to-transparent opacity-55 transition-opacity duration-500 group-hover:opacity-95" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-5 text-white transition-transform duration-500 group-hover:-translate-y-1 md:p-6">
                    <p className="text-[9px] uppercase tracking-[0.22em] text-white/75">{collection.description}</p>
                    <h3 className="mt-2 font-serif text-2xl md:text-[27px]">{collection.name}</h3>
                    <div className="grid grid-rows-[0fr] transition-all duration-500 group-hover:grid-rows-[1fr] group-focus-visible:grid-rows-[1fr]">
                      <div className="overflow-hidden">
                        <div className="pt-4 opacity-0 transition-opacity delay-100 duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                          <p className="text-xs font-medium">{formatINR(collection.startingPrice)} <span className="font-normal text-white/70">indicative starting price</span></p>
                          <p className="mt-2 text-[10px] text-white/75">{collection.finishes}</p>
                          <span className="mt-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em]">Preview image or create a model <ArrowRight size={13} /></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="inspiration-gallery" className="bg-[#F0ECE4] px-5 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-9 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div><p className="eyebrow">Saved for inspiration</p><h2 className="mt-3 font-serif text-4xl md:text-6xl">Spaces to imagine.</h2></div>
            <p className="max-w-sm text-sm leading-6 text-[#6D6F68]">Open any reference to explore its finishes, then use it as a starting point for your own 3D kitchen.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[collections[1], collections[4], collections[2]].map((collection) => (
              <article key={`inspiration-${collection.slug}`} className="group relative">
                <div className="relative aspect-[1.25] overflow-hidden bg-[#D4C9B9]">
                  <InteractiveImage image={collectionImage(collection)} sizes="(max-width: 768px) 100vw, 33vw" onPreview={setPreviewImage} onCreate={createModelFromImage} imageClassName="object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-[#171814]/75 via-transparent to-transparent" />
                  <h3 className="pointer-events-none absolute bottom-4 left-5 z-20 font-serif text-2xl text-white">{collection.name}</h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="door-styles" className="scroll-mt-24 bg-[#E9E1D5] px-5 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-[1360px]">
          <motion.div {...riseIn} transition={{ duration: 0.65 }} viewport={{ once: true, amount: 0.25 }} className="grid gap-6 lg:grid-cols-[1fr_390px] lg:items-end">
            <div><p className="eyebrow">The detail that defines</p><h2 className="mt-4 max-w-4xl font-serif text-5xl leading-[1.02] tracking-[-0.025em] md:text-7xl">A profile for every<br className="hidden md:block" /> point of view.</h2></div>
            <p className="pb-1 text-sm leading-7 text-[#6D6F68]">From a softly framed classic to a seamless contemporary plane, each profile brings its own character to the room.</p>
          </motion.div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
            {doorStyles.map((style, index) => (
              <motion.article key={style.slug} {...riseIn} transition={{ duration: 0.6, delay: reduceMotion ? 0 : index * 0.08 }} viewport={{ once: true, amount: 0.15 }} className="group">
                <div className="relative block overflow-hidden bg-[#D4C9B9]">
                  <div className="relative aspect-[0.92] overflow-hidden">
                    <InteractiveImage image={doorImage(style)} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" onPreview={setPreviewImage} onCreate={createModelFromImage} imageClassName="object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                  </div>
                  <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-[#171814]/75 via-transparent to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-95" />
                  <span className="pointer-events-none absolute left-4 top-4 z-20 border border-white/45 bg-[#272824]/20 px-3 py-2 text-[9px] uppercase tracking-[0.15em] text-white backdrop-blur-sm">{style.frame}</span>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-5 text-white">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-white/70">{style.note}</p>
                    <h3 className="mt-2 font-serif text-2xl">{style.name}</h3>
                    <div className="mt-0 grid grid-rows-[0fr] transition-all duration-500 group-hover:mt-4 group-hover:grid-rows-[1fr]">
                      <div className="overflow-hidden">
                        <p className="text-[11px] text-white/80">Recommended: {style.finish}</p>
                        <span className="mt-3 inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.15em]">Preview image or create a model <ArrowRight size={12} /></span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="materials" className="scroll-mt-24 px-5 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-[1360px]">
          <motion.div {...riseIn} transition={{ duration: 0.65 }} viewport={{ once: true, amount: 0.2 }}>
            <p className="eyebrow">The material conversation</p>
            <h2 className="mt-4 max-w-3xl font-serif text-5xl leading-[1.02] tracking-[-0.025em] md:text-7xl">A palette to<br className="hidden sm:block" /> experience.</h2>
          </motion.div>
          <div className="mt-12 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div>
              <div className="flex flex-wrap gap-2 border-b border-[#272824]/15 pb-4">
                {(Object.keys(materials) as MaterialCategory[]).map((category) => (
                  <button key={category} onClick={() => changeMaterialCategory(category)} className={`px-3 py-2 text-[10px] uppercase tracking-[0.12em] transition ${materialCategory === category ? "bg-[#272824] text-[#F6F3ED]" : "text-[#6D6F68] hover:bg-[#E9E1D5]"}`}>{category}</button>
                ))}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {materials[materialCategory].map((material) => (
                  <button key={material.name} onClick={() => setSelectedMaterial(material)} onMouseEnter={() => setSelectedMaterial(material)} className={`group flex items-center gap-3 border p-3 text-left transition ${selectedMaterial.name === material.name ? "border-[#272824] bg-[#F6F3ED]" : "border-transparent hover:border-[#272824]/20"}`}>
                    <span className="h-10 w-10 shrink-0 border border-[#272824]/10 shadow-inner" style={{ backgroundColor: material.color, backgroundImage: material.texture === "oak" || material.texture === "walnut" ? "repeating-linear-gradient(5deg,transparent 0 4px,rgba(60,40,20,.14) 5px,transparent 6px 10px)" : material.texture === "marble" || material.texture === "quartz" ? "repeating-linear-gradient(135deg,transparent 0 11px,rgba(90,90,90,.16) 12px,transparent 13px 22px)" : undefined }} />
                    <span className="min-w-0"><span className="block text-[11px] font-medium">{material.name}</span><span className="mt-1 block text-[9px] text-[#77796F]">{materialCategory}</span></span>
                  </button>
                ))}
              </div>
              <p className="mt-7 max-w-md text-xs leading-6 text-[#77796F]">Select a finish to see how its tone and surface character shift the overall expression of your kitchen.</p>
            </div>
            <motion.div key={selectedMaterial.name} initial={reduceMotion ? false : { opacity: 0.7 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="group relative min-h-[370px] overflow-hidden bg-[#272824] md:min-h-[490px]">
              <InteractiveImage image={materialImage(selectedMaterial)} sizes="(max-width: 1024px) 100vw, 60vw" onPreview={setPreviewImage} onCreate={createModelFromImage} imageClassName="object-cover opacity-85" />
              <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-[#171814]/90 via-[#171814]/25 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-6 text-white md:p-9">
                <p className="text-[9px] uppercase tracking-[0.22em] text-white/75">{materialCategory}</p>
                <h3 className="mt-3 font-serif text-4xl md:text-5xl">{selectedMaterial.name}</h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-white/80">{selectedMaterial.finish}</p>
                <p className="mt-6 text-[10px] uppercase tracking-[0.12em] text-white/85">Select the image to preview · Create 3D Model in the top corner</p>
              </div>
              <div className="pointer-events-none absolute right-6 top-16 z-20 h-12 w-12 border border-white/60 p-1"><span className="block h-full w-full" style={{ backgroundColor: selectedMaterial.color }} /></div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 bg-[#F0ECE4] px-5 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-[1360px]">
          <motion.div {...riseIn} transition={{ duration: 0.65 }} viewport={{ once: true, amount: 0.2 }}>
            <p className="eyebrow">A clear, considered process</p>
            <h2 className="mt-4 font-serif text-5xl leading-[1.02] tracking-[-0.025em] md:text-7xl">A considered way<br className="hidden sm:block" /> to create.</h2>
          </motion.div>
          <div className="mt-14 grid border-l border-t border-[#272824]/15 sm:grid-cols-2 lg:grid-cols-4">
            {processSteps.map(({ Icon, number, title, copy }, index) => (
              <motion.article key={number} {...riseIn} transition={{ duration: 0.6, delay: reduceMotion ? 0 : index * 0.1 }} viewport={{ once: true, amount: 0.18 }} className="group min-h-[270px] border-b border-r border-[#272824]/15 p-6 transition-colors duration-300 hover:bg-[#E9E1D5] md:p-8">
                <Icon size={22} strokeWidth={1.35} className="transition duration-300 group-hover:-translate-y-1 group-hover:text-[#B38B62]" />
                <p className="mt-14 font-serif text-3xl text-[#B38B62] transition-colors duration-300 group-hover:text-[#694A36]">{number}</p>
                <h3 className="mt-3 font-serif text-xl">{title}</h3>
                <p className="mt-3 text-xs leading-6 text-[#6D6F68]">{copy}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="scroll-mt-24 px-5 py-24 md:px-10 md:py-32">
        <div className="mx-auto grid max-w-[1360px] gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <motion.div {...riseIn} transition={{ duration: 0.65 }} viewport={{ once: true, amount: 0.2 }}>
            <p className="eyebrow">Why Cabinet Studio</p>
            <h2 className="mt-4 font-serif text-5xl leading-[1.02] tracking-[-0.025em] md:text-7xl">Clarity in<br /> every detail.</h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-[#6D6F68]">A thoughtful design experience from first inspiration to a more informed conversation about your kitchen.</p>
          </motion.div>
          <div className="grid border-l border-t border-[#272824]/15 sm:grid-cols-2">
            {benefits.map(([title, copy], index) => (
              <motion.article key={title} {...riseIn} transition={{ duration: 0.55, delay: reduceMotion ? 0 : index * 0.07 }} viewport={{ once: true, amount: 0.18 }} className="group min-h-44 border-b border-r border-[#272824]/15 p-6 transition-colors duration-300 hover:bg-[#E9E1D5] md:p-8">
                <span className="text-[9px] uppercase tracking-[0.2em] text-[#B38B62]">0{index + 1}</span>
                <h3 className="mt-5 font-serif text-xl transition-colors group-hover:text-[#694A36]">{title}</h3>
                <p className="mt-3 text-xs leading-6 text-[#6D6F68]">{copy}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#272824] px-5 py-24 text-[#F6F3ED] md:px-10 md:py-32">
        <div className="absolute -right-20 -top-32 h-[440px] w-[440px] rounded-full border border-[#F6F3ED]/10" />
        <div className="absolute -right-4 -top-16 h-[310px] w-[310px] rounded-full border border-[#F6F3ED]/10" />
        <motion.div {...riseIn} transition={{ duration: 0.7 }} viewport={{ once: true, amount: 0.3 }} className="relative mx-auto max-w-[1000px] text-center">
          <p className="text-[9px] uppercase tracking-[0.28em] text-[#B38B62]">Your next chapter begins here</p>
          <h2 className="mx-auto mt-6 max-w-4xl font-serif text-5xl leading-[1.02] tracking-[-0.025em] md:text-7xl">Make room for<br className="sm:hidden" /> something beautiful.</h2>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-white/65">Start with an idea. Leave with a kitchen that feels unmistakably yours.</p>
          <Link href="/design" className="group mt-9 inline-flex min-h-14 items-center gap-4 bg-[#F6F3ED] px-7 text-xs font-medium tracking-wide text-[#272824] transition hover:bg-[#E9E1D5]">
            Create Your Kitchen <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </section>

      <footer id="contact" className="scroll-mt-24 bg-[#E9E1D5] px-5 pb-8 pt-16 md:px-10 md:pt-20">
        <div className="mx-auto grid max-w-[1360px] gap-12 border-b border-[#272824]/15 pb-14 md:grid-cols-2 lg:grid-cols-[1.35fr_.8fr_.8fr_1fr]">
          <div>
            <Link href="/" className="font-serif text-xl tracking-[0.15em]">CABINET STUDIO</Link>
            <p className="mt-5 max-w-sm text-xs leading-6 text-[#5D5F59]">Thoughtful cabinetry, enduring materials and a more personal way to imagine the heart of your home.</p>
            <p className="mt-5 text-[10px] uppercase tracking-[0.16em] text-[#694A36]">Designed for the way you live.</p>
          </div>
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em]">Explore</h3>
            <div className="mt-5 flex flex-col gap-3 text-xs text-[#5D5F59]">
              <a className="footer-link" href="#kitchen-collections">Collections</a>
              <Link className="footer-link" href="/design">3D Configurator</Link>
              <a className="footer-link" href="#materials">Materials</a>
              <Link className="footer-link" href="/design">Book Consultation</Link>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em]">Studio</h3>
            <div className="mt-5 flex flex-col gap-3 text-xs text-[#5D5F59]">
              <a className="footer-link" href="#about">Our approach</a>
              <a className="footer-link" href="#how-it-works">How it works</a>
              <Link className="footer-link" href="/login">Login / My Account</Link>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em]">India · Studio enquiries</h3>
            <p className="mt-5 text-xs leading-6 text-[#5D5F59]">Share your project details to begin a design conversation. Consultation arrangements can be discussed with your enquiry.</p>
            <Link href="/design" className="mt-4 inline-flex items-center gap-2 text-xs text-[#694A36]">Request a consultation <ArrowRight size={13} /></Link>
          </div>
        </div>
        <div className="mx-auto flex max-w-[1360px] flex-col justify-between gap-3 pt-6 text-[9px] text-[#6D6F68] md:flex-row md:items-center">
          <span>© Cabinet Studio. Crafted with intention.</span>
          <span>All prices are indicative estimates in INR for demonstration only. Final pricing is subject to design review.</span>
        </div>
      </footer>

      {previewImage && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-[#171814]/75 p-4 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="image-preview-title" onClick={(event) => event.stopPropagation()} className="relative grid max-h-[92vh] w-full max-w-5xl overflow-auto bg-[#F6F3ED] md:grid-cols-[1.15fr_.85fr]">
            <div className="relative min-h-[280px] bg-[#D4C9B9] md:min-h-[520px]">
              <Image src={previewImage.src} alt={previewImage.alt} fill sizes="(max-width: 768px) 100vw, 60vw" className="object-cover" />
            </div>
            <div className="flex flex-col p-6 md:p-9">
              <button onClick={() => setPreviewImage(null)} aria-label="Close image preview" className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center border border-[#272824]/20 bg-[#F6F3ED]"><X size={18} /></button>
              <p className="eyebrow">Reference image</p>
              <h2 id="image-preview-title" className="mt-4 pr-8 font-serif text-3xl leading-tight md:text-4xl">{previewImage.title}</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {previewImage.tags.map((tag) => <span key={tag} className="border border-[#272824]/15 px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-[#5D5F59]">{tag}</span>)}
              </div>
              <p className="mt-6 text-sm leading-7 text-[#6D6F68]">Use the visible layout, cabinet colour, finish, door style and surfaces as a starting point for your 3D design.</p>
              <p className="mt-3 text-xs leading-6 text-[#77796F]">Visual match is an estimate: a single photo cannot reveal exact dimensions or unseen walls.</p>
              <button onClick={() => createModelFromImage(previewImage)} className="group mt-auto inline-flex min-h-14 items-center justify-center gap-3 bg-[#272824] px-5 text-xs font-medium uppercase tracking-[0.12em] text-[#F6F3ED] transition hover:bg-[#694A36]">
                Create 3D Model from This Image <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
