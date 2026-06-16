"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { createLimiter } from "@/lib/thumbnails/queue";

// Shared across all cards: at most 2 screenshot requests in flight at once.
const limiter = createLimiter(2);

export function PageThumbnail({
  pageId,
  title,
  gradient,
  initialUrl,
  version,
  stale,
}: {
  pageId: string;
  title: string;
  gradient: string;
  initialUrl: string | null;
  version: number | null;
  stale: boolean;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [v, setV] = useState(version);
  const [loading, setLoading] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!stale || started.current) return;
    started.current = true;
    setLoading(true);
    limiter(() =>
      fetch(`/api/pages/${pageId}/thumbnail`, { method: "POST" }).then((r) =>
        r.ok ? r.json() : null,
      ),
    )
      .then((d: { url?: string; version?: number } | null) => {
        if (d?.url) {
          setUrl(d.url);
          setV(d.version ?? null);
        }
      })
      .catch(() => {
        /* keep last image / gradient — never break the dashboard */
      })
      .finally(() => setLoading(false));
  }, [stale, pageId]);

  const src = url ? `${url}?v=${v ?? 0}` : null;

  return (
    <div className="relative h-32 overflow-hidden">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={title} className="h-full w-full object-cover object-top" />
      ) : (
        <div className={cn("h-full w-full bg-gradient-to-br", gradient)}>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-black text-white/90 transition-transform duration-300 group-hover:scale-110">
              {title.charAt(0).toUpperCase() || "P"}
            </span>
          </div>
        </div>
      )}
      {loading && <div className="absolute inset-0 animate-pulse bg-zinc-900/5" />}
    </div>
  );
}
