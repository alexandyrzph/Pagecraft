import { ArrowDown, ArrowUp, FileText, Image as ImageIcon, Play, Star } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Block } from "@/lib/types";

// Shared bits for the mini wireframes (drag ghost + section inserter previews).
const bar = (w: string, extra = "h-1.5 bg-zinc-200") => <div className={cn("rounded", w, extra)} />;

type WireframeRenderer = (block: Block) => ReactNode;

const columns: WireframeRenderer = (block) => {
  const cols = Math.max(1, String(block.props?.layout ?? "1-1").split("-").length);
  return (
    <div className="flex h-12 gap-1.5">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="flex-1 rounded-md bg-zinc-100" />
      ))}
    </div>
  );
};

const column: WireframeRenderer = () => (
  <div className="flex h-12 justify-center">
    <div className="h-full w-1/2 rounded-md bg-zinc-100" />
  </div>
);

const spacer: WireframeRenderer = () => (
  <div className="flex h-12 flex-col items-center justify-between rounded-md border-2 border-dashed border-zinc-200 py-1 text-zinc-400">
    <ArrowUp size={14} />
    <ArrowDown size={14} />
  </div>
);

const divider: WireframeRenderer = () => (
  <div className="flex h-12 items-center">
    <div className="h-0.5 w-full rounded bg-zinc-200" />
  </div>
);

const heading: WireframeRenderer = () => (
  <div className="flex h-12 items-center">{bar("w-3/4", "h-3 bg-zinc-300")}</div>
);

const text: WireframeRenderer = () => (
  <div className="flex h-12 flex-col justify-center gap-1.5">
    {bar("w-full")}
    {bar("w-5/6")}
    {bar("w-2/3")}
  </div>
);

const button: WireframeRenderer = () => (
  <div className="flex h-12 items-center">
    <div className="h-6 w-24 rounded-lg bg-indigo-200" />
  </div>
);

const image: WireframeRenderer = () => (
  <div className="flex h-12 items-center justify-center rounded-md bg-zinc-100 text-zinc-300">
    <ImageIcon size={18} />
  </div>
);

const icon: WireframeRenderer = () => (
  <div className="flex h-12 items-center justify-center">
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-400">
      <Star size={16} />
    </span>
  </div>
);

const video: WireframeRenderer = () => (
  <div className="flex h-12 items-center justify-center rounded-md bg-zinc-800 text-white/80">
    <Play size={16} />
  </div>
);

const list: WireframeRenderer = () => (
  <div className="flex h-12 flex-col justify-center gap-1.5">
    {[0, 1, 2].map((i) => (
      <div key={i} className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-300" />
        {bar("w-2/3")}
      </div>
    ))}
  </div>
);

const quote: WireframeRenderer = () => (
  <div className="flex h-12 items-center gap-2 border-l-2 border-indigo-300 pl-2">
    <div className="flex flex-1 flex-col gap-1.5">
      {bar("w-full")}
      {bar("w-1/2")}
    </div>
  </div>
);

const heroCta: WireframeRenderer = () => (
  <div className="flex h-12 flex-col items-center justify-center gap-1 rounded-md bg-indigo-100">
    {bar("w-16", "h-2 bg-indigo-300")}
    {bar("w-10", "h-1 bg-indigo-200")}
    <div className="mt-0.5 h-3 w-10 rounded bg-white" />
  </div>
);

const featuresPricing: WireframeRenderer = () => (
  <div className="flex h-12 gap-1.5">
    {[0, 1, 2].map((i) => (
      <div key={i} className="flex flex-1 flex-col gap-1 rounded-md bg-zinc-100 p-1">
        <span className="h-2 w-2 rounded bg-indigo-300" />
        {bar("w-full", "h-1 bg-zinc-200")}
        {bar("w-2/3", "h-1 bg-zinc-200")}
      </div>
    ))}
  </div>
);

const testimonial: WireframeRenderer = () => (
  <div className="flex h-12 flex-col items-center justify-center gap-1">
    <span className="h-4 w-4 rounded-full bg-zinc-200" />
    {bar("w-20")}
    {bar("w-12")}
  </div>
);

const stats: WireframeRenderer = () => (
  <div className="flex h-12 items-end justify-around">
    {[0, 1, 2].map((i) => (
      <div key={i} className="flex flex-col items-center gap-1">
        <div className="h-4 w-6 rounded bg-indigo-200" />
        {bar("w-5", "h-1 bg-zinc-200")}
      </div>
    ))}
  </div>
);

const form: WireframeRenderer = () => (
  <div className="flex h-12 flex-col justify-center gap-1.5">
    <div className="h-2.5 w-full rounded bg-zinc-100" />
    <div className="h-2.5 w-full rounded bg-zinc-100" />
    <div className="h-2.5 w-12 rounded bg-indigo-200" />
  </div>
);

const footer: WireframeRenderer = () => (
  <div className="flex h-12 items-center gap-1.5 rounded-md bg-zinc-800 px-2">
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="h-1.5 w-6 rounded bg-white/40" />
    ))}
  </div>
);

const file: WireframeRenderer = () => (
  <div className="flex h-12 items-center gap-2 rounded-md border border-zinc-200 bg-white px-2">
    <span className="flex h-6 w-6 items-center justify-center rounded bg-indigo-100 text-indigo-400">
      <FileText size={13} />
    </span>
    <div className="flex flex-1 flex-col gap-1">
      {bar("w-2/3", "h-1.5 bg-zinc-300")}
      {bar("w-1/3", "h-1 bg-zinc-200")}
    </div>
  </div>
);

const collection: WireframeRenderer = () => (
  <div className="flex h-12 gap-1.5">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="flex flex-1 flex-col gap-1 overflow-hidden rounded-md border border-zinc-200 bg-white"
      >
        <span className="h-4 w-full bg-indigo-100" />
        <div className="flex flex-col gap-1 px-1">
          {bar("w-full", "h-1 bg-zinc-200")}
          {bar("w-2/3", "h-1 bg-zinc-200")}
        </div>
      </div>
    ))}
  </div>
);

export const WIREFRAME_RENDERERS = new Map<string, WireframeRenderer>([
  ["columns", columns],
  ["column", column],
  ["spacer", spacer],
  ["divider", divider],
  ["heading", heading],
  ["text", text],
  ["button", button],
  ["image", image],
  ["icon", icon],
  ["video", video],
  ["list", list],
  ["quote", quote],
  ["hero", heroCta],
  ["cta", heroCta],
  ["features", featuresPricing],
  ["pricing", featuresPricing],
  ["testimonial", testimonial],
  ["stats", stats],
  ["form", form],
  ["footer", footer],
  ["file", file],
  ["collection", collection],
]);

export const renderDefaultWireframe: WireframeRenderer = () => (
  // section / generic container — a band with content lines
  <div className="flex h-12 flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-zinc-200 bg-zinc-50">
    {bar("w-12")}
    {bar("w-8")}
  </div>
);
