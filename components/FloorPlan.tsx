"use client";

import { useDesignStore } from "@/store/design";

export default function FloorPlan() {
  const { design, selectedCabinetId, setSelectedCabinetId } = useDesignStore();
  const scale = 2.2;
  const length = design.measurements.length / 12 * scale * 12;
  const width = design.measurements.width / 12 * scale * 12;
  return (
    <div className="flex h-full min-h-[420px] items-center justify-center overflow-auto bg-[#eeece4] p-6">
      <svg viewBox={`-40 -40 ${length + 80} ${width + 80}`} className="max-h-[520px] max-w-full" role="img" aria-label="Kitchen 2D floor plan">
        <rect x="0" y="0" width={length} height={width} fill="#faf9f6" stroke="#292A27" strokeWidth="5" />
        {design.cabinetInventory.map((cabinet) => {
          const cx = (cabinet.position[0] / 12) * scale * 12 + length / 2;
          const cy = (cabinet.position[2] / 12) * scale * 12 + width / 2;
          const w = Math.max(cabinet.width / 12 * scale * 12, 22);
          const d = Math.max(cabinet.depth / 12 * scale * 12, 22);
          return (
            <g key={cabinet.id} onClick={() => setSelectedCabinetId(cabinet.id)} className="cursor-pointer">
              <rect x={cx - w / 2} y={cy - d / 2} width={w} height={d} fill={selectedCabinetId === cabinet.id ? "#b8956a" : "#c9c5ba"} stroke="#292A27" strokeWidth={selectedCabinetId === cabinet.id ? 4 : 2} rx="2" />
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#292A27">{cabinet.name.replace(" Cabinet", "")}</text>
            </g>
          );
        })}
        {design.appliances.sink && <circle cx={length / 2} cy={width - 38} r="18" fill="#f7f5f0" stroke="#292A27" strokeWidth="3" />}
        {design.appliances.cooktop && <rect x={length - 130} y={width - 50} width="82" height="28" fill="#292A27" rx="3" />}
        <path d={`M 0 ${width + 28} H ${length}`} stroke="#292A27" strokeWidth="2" />
        <text x={length / 2} y={width + 22} textAnchor="middle" fontSize="12" fill="#292A27">{design.measurements.length} IN</text>
        <text x="-24" y={width / 2} textAnchor="middle" fontSize="12" fill="#292A27" transform={`rotate(-90 -24 ${width / 2})`}>{design.measurements.width} IN</text>
      </svg>
    </div>
  );
}
