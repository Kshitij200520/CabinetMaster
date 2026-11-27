"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";

interface RenderLightboxProps {
  open: boolean;
  imageSrc: string;
  alt: string;
  title?: string;
  onClose: () => void;
}

interface Point {
  x: number;
  y: number;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function touchDistance(t1: React.Touch, t2: React.Touch) {
  return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
}

/**
 * Full-screen image lightbox supporting mobile two-finger pinch-to-zoom,
 * single-finger pan, desktop mouse wheel zoom, drag pan, and PNG export.
 */
export default function RenderLightbox({
  open,
  imageSrc,
  alt,
  title = "Architectural Kitchen Render",
  onClose,
}: RenderLightboxProps) {
  if (!open || !imageSrc) return null;
  return <LightboxStage key={imageSrc} imageSrc={imageSrc} alt={alt} title={title} onClose={onClose} />;
}

function LightboxStage({
  imageSrc,
  alt,
  title,
  onClose,
}: Omit<RenderLightboxProps, "open">) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<{ pointer: Point; offset: Point } | null>(null);
  const pinchStartRef = useRef<{ distance: number; scale: number; offset: Point } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const touchStartPointRef = useRef<Point | null>(null);
  const touchMovedRef = useRef(false);

  const clampOffset = useCallback((next: Point, targetScale: number): Point => {
    if (targetScale <= 1.01) return { x: 0, y: 0 };
    const stage = stageRef.current;
    const maxX = stage ? (stage.clientWidth * (targetScale - 1)) / 2 + 48 : 360 * targetScale;
    const maxY = stage ? (stage.clientHeight * (targetScale - 1)) / 2 + 48 : 360 * targetScale;
    return {
      x: clamp(next.x, -maxX, maxX),
      y: clamp(next.y, -maxY, maxY),
    };
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const applyScale = useCallback((nextScale: number) => {
    const clamped = clamp(Number(nextScale.toFixed(2)), MIN_SCALE, MAX_SCALE);
    setScale(clamped);
    setOffset((prev) => clampOffset(prev, clamped));
  }, [clampOffset]);

  const toggleDoubleZoom = useCallback(() => {
    if (scale > 1.05) {
      resetView();
    } else {
      applyScale(2);
    }
  }, [applyScale, resetView, scale]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "+" || event.key === "=") applyScale(scale + 0.5);
      else if (event.key === "-") applyScale(scale - 0.5);
      else if (event.key === "0") resetView();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [applyScale, onClose, resetView, scale]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY < 0 ? 0.25 : -0.25;
      applyScale(scale + delta);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [applyScale, scale]);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (scale <= 1.01) return;
    event.preventDefault();
    setDragging(true);
    panStartRef.current = {
      pointer: { x: event.clientX, y: event.clientY },
      offset,
    };
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging || !panStartRef.current) return;
    const dx = event.clientX - panStartRef.current.pointer.x;
    const dy = event.clientY - panStartRef.current.pointer.y;
    setOffset(clampOffset({
      x: panStartRef.current.offset.x + dx,
      y: panStartRef.current.offset.y + dy,
    }, scale));
  };

  const stopMouseDrag = () => {
    setDragging(false);
    panStartRef.current = null;
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchMovedRef.current = false;
    if (event.touches.length === 2) {
      touchStartPointRef.current = null;
      panStartRef.current = null;
      setDragging(false);
      pinchStartRef.current = {
        distance: Math.max(1, touchDistance(event.touches[0], event.touches[1])),
        scale,
        offset,
      };
    } else if (event.touches.length === 1) {
      touchStartPointRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      pinchStartRef.current = null;
      if (scale > 1.01) {
        setDragging(true);
        panStartRef.current = {
          pointer: { x: event.touches[0].clientX, y: event.touches[0].clientY },
          offset,
        };
      }
    }
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2 && pinchStartRef.current) {
      touchMovedRef.current = true;
      const dist = touchDistance(event.touches[0], event.touches[1]);
      const nextScale = clamp(
        pinchStartRef.current.scale * (dist / pinchStartRef.current.distance),
        MIN_SCALE,
        MAX_SCALE,
      );
      setScale(nextScale);
      setOffset(clampOffset(pinchStartRef.current.offset, nextScale));
    } else if (event.touches.length === 1) {
      const startPt = touchStartPointRef.current;
      if (startPt && Math.hypot(event.touches[0].clientX - startPt.x, event.touches[0].clientY - startPt.y) > 8) {
        touchMovedRef.current = true;
      }
      if (panStartRef.current && scale > 1.01) {
        const dx = event.touches[0].clientX - panStartRef.current.pointer.x;
        const dy = event.touches[0].clientY - panStartRef.current.pointer.y;
        setOffset(clampOffset({
          x: panStartRef.current.offset.x + dx,
          y: panStartRef.current.offset.y + dy,
        }, scale));
      }
    }
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length < 2) {
      pinchStartRef.current = null;
    }
    if (event.touches.length === 0) {
      setDragging(false);
      panStartRef.current = null;

      if (!touchMovedRef.current && event.changedTouches.length === 1) {
        const touch = event.changedTouches[0];
        const now = Date.now();
        const prev = lastTapRef.current;
        if (prev && now - prev.time < 300 && Math.hypot(touch.clientX - prev.x, touch.clientY - prev.y) < 28) {
          lastTapRef.current = null;
          toggleDoubleZoom();
        } else {
          lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };
        }
      }
    }
  };

  const downloadPng = async () => {
    try {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = imageSrc;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 1024;
      canvas.height = img.naturalHeight || 768;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = "cabinet-studio-render.png";
      link.click();
    } catch {
      const link = document.createElement("a");
      link.href = imageSrc;
      link.download = "cabinet-studio-render.png";
      link.click();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white select-none"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-xs uppercase tracking-[0.2em] text-white/70">{title}</p>
          <p className="mt-0.5 hidden text-[11px] text-white/50 sm:block">Scroll or pinch to zoom · Drag to pan · Double-tap or double-click for 2x</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close fullscreen render"
          className="grid h-9 w-9 shrink-0 place-items-center rounded border border-white/20 bg-white/10 text-white hover:bg-white/20"
        >
          <X size={18} />
        </button>
      </div>

      <div
        ref={stageRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopMouseDrag}
        onMouseLeave={stopMouseDrag}
        onDoubleClick={toggleDoubleZoom}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative flex flex-1 min-h-0 w-full items-center justify-center overflow-hidden p-3 sm:p-6 touch-none ${
          scale > 1.01 ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
        }`}
      >
        <div
          className="flex h-full w-full items-center justify-center transition-transform duration-75 ease-out"
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={alt}
            draggable={false}
            className="max-h-full max-w-full object-contain pointer-events-none select-none"
          />
        </div>
      </div>

      <div className="border-t border-white/10 bg-black/80 px-3 py-3 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => applyScale(scale - 0.5)}
            disabled={scale <= MIN_SCALE}
            aria-label="Zoom out"
            className="inline-flex items-center gap-1.5 rounded border border-white/20 bg-white/10 px-3 py-2 text-xs hover:bg-white/20 disabled:opacity-40"
          >
            <ZoomOut size={14} /> <span className="hidden sm:inline">Zoom</span> -
          </button>
          <span className="min-w-[54px] text-center text-xs font-medium tabular-nums text-white/90">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => applyScale(scale + 0.5)}
            disabled={scale >= MAX_SCALE}
            aria-label="Zoom in"
            className="inline-flex items-center gap-1.5 rounded border border-white/20 bg-white/10 px-3 py-2 text-xs hover:bg-white/20 disabled:opacity-40"
          >
            <ZoomIn size={14} /> <span className="hidden sm:inline">Zoom</span> +
          </button>
          <button
            type="button"
            onClick={resetView}
            className="inline-flex items-center gap-1.5 rounded border border-white/20 bg-white/10 px-3 py-2 text-xs hover:bg-white/20"
          >
            <RotateCcw size={13} /> Reset
          </button>
          <button
            type="button"
            onClick={() => void downloadPng()}
            className="inline-flex items-center gap-1.5 rounded bg-white px-3 py-2 text-xs font-medium text-[#292A27] hover:bg-white/90"
          >
            <Download size={13} /> Download Render PNG
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded border border-white/20 bg-white/10 px-3 py-2 text-xs hover:bg-white/20"
          >
            Close <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
