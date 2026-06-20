"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { BlockRenderProps } from "@/lib/blocks/registry-types";
import { DynamicIcon, Editable } from "./shared";
import { RichText } from "./RichText";

export function HeadingBlock({ block, editable, style, className, id, setProp }: BlockRenderProps) {
  const level: string = (block.props.level as string) ?? "h2";
  return (
    <Editable
      as={level as keyof React.JSX.IntrinsicElements}
      value={(block.props.text as string) ?? ""}
      editable={editable}
      placeholder="Heading"
      onCommit={(v) => setProp("text", v)}
      id={id}
      className={cn("pb-heading", className)}
      style={style}
    />
  );
}

export function TextBlock({ block, editable, style, className, id, setProp }: BlockRenderProps) {
  return (
    <RichText
      value={(block.props.text as string) ?? ""}
      editable={editable}
      onCommit={(v) => setProp("text", v)}
      id={id}
      className={className}
      style={style}
    />
  );
}

export function ButtonBlock({ block, editable, style, className, id, setProp }: BlockRenderProps) {
  const {
    text = "Click me",
    href = "#",
    align = "left",
  } = block.props as {
    text?: string;
    href?: string;
    align?: string;
  };
  return (
    <div style={{ textAlign: align as CSSProperties["textAlign"] }}>
      <a
        href={editable ? undefined : href}
        onClick={editable ? (e) => e.preventDefault() : undefined}
        id={id}
        className={cn(
          "pb-button inline-block cursor-pointer no-underline transition-transform hover:-translate-y-0.5",
          className,
        )}
        style={style}
      >
        <Editable
          as="span"
          value={text}
          editable={editable}
          placeholder="Button"
          onCommit={(v) => setProp("text", v)}
        />
      </a>
    </div>
  );
}

export function ImageBlock({ block, editable, style, className, id }: BlockRenderProps) {
  const {
    src = "https://picsum.photos/seed/pagebuilder/900/560",
    alt = "",
    objectFit = "cover",
  } = block.props as { src?: string; alt?: string; objectFit?: string };
  const [loaded, setLoaded] = useState(false);
  const [lastSrc, setLastSrc] = useState(src);
  const ref = useRef<HTMLImageElement>(null);

  if (src !== lastSrc) {
    setLastSrc(src);
    setLoaded(false);
  }

  useEffect(() => {
    if (ref.current?.complete) setLoaded(true);
  }, [src]);

  // Public / export: plain, static-safe image (no JS-gated visibility).
  if (!editable) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        id={id}
        src={src}
        alt={alt}
        className={cn("block h-auto max-w-full", className)}
        style={{ objectFit: objectFit as CSSProperties["objectFit"], ...style }}
      />
    );
  }

  // Editor: shimmer placeholder while the image loads, then fade in.
  return (
    <span className="relative block" style={{ minHeight: loaded ? undefined : 160 }}>
      {!loaded && <span className="pc-skeleton absolute inset-0 rounded-xl" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        id={id}
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={cn(
          "block h-auto max-w-full transition-opacity duration-500",
          className,
          loaded ? "opacity-100" : "opacity-0",
        )}
        style={{ objectFit: objectFit as CSSProperties["objectFit"], ...style }}
      />
    </span>
  );
}

export function IconBlock({ block, style, className, id }: BlockRenderProps) {
  const {
    name = "Star",
    size = 48,
    color = "var(--pc-brand, #6366f1)",
    align = "center",
  } = block.props as { name?: string; size?: number | string; color?: string; align?: string };
  return (
    <div
      id={id}
      className={className}
      style={{ textAlign: align as CSSProperties["textAlign"], ...style }}
    >
      <DynamicIcon
        name={name}
        size={typeof size === "number" ? size : parseInt(size, 10) || 48}
        style={{ color, display: "inline-block" }}
      />
    </div>
  );
}

function toEmbedUrl(url: string): string {
  if (!url) return "";
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
}

export function VideoBlock({ block, style, className, id }: BlockRenderProps) {
  const url: string = (block.props.url as string) ?? "";
  const embed = toEmbedUrl(url);
  const isFile = /\.(mp4|webm|ogg)$/i.test(embed);
  return (
    <div
      id={id}
      className={cn("overflow-hidden", className)}
      style={{ position: "relative", aspectRatio: "16 / 9", ...style }}
    >
      {!embed ? (
        <div className="flex h-full w-full items-center justify-center bg-slate-200 text-slate-500">
          Add a video URL
        </div>
      ) : isFile ? (
        <video src={embed} controls className="h-full w-full" />
      ) : (
        <iframe
          src={embed}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
    </div>
  );
}

export function ListBlock({ block, editable, style, className, id, setProp }: BlockRenderProps) {
  const items: string[] = (block.props.items as string[]) ?? [];
  const iconName: string = (block.props.icon as string) ?? "Check";
  const iconColor: string = (block.props.iconColor as string) ?? "var(--pc-brand, #6366f1)";
  return (
    <ul id={id} className={cn("flex flex-col gap-3", className)} style={style}>
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <DynamicIcon
            name={iconName}
            size={20}
            style={{ color: iconColor, flexShrink: 0, marginTop: 2 }}
          />
          <Editable
            as="span"
            value={item}
            editable={editable}
            onCommit={(v) => setProp(`items.${i}`, v)}
          />
        </li>
      ))}
    </ul>
  );
}

export function QuoteBlock({ block, editable, style, className, id, setProp }: BlockRenderProps) {
  const { text = "", author = "" } = block.props as { text?: string; author?: string };
  return (
    <blockquote id={id} className={cn("pb-quote border-l-4 pl-5", className)} style={style}>
      <Editable
        as="p"
        multiline
        value={text}
        editable={editable}
        placeholder="Quote text"
        onCommit={(v) => setProp("text", v)}
        className="italic"
      />
      <Editable
        as="footer"
        value={author}
        editable={editable}
        placeholder="Author"
        onCommit={(v) => setProp("author", v)}
        className="mt-3 text-sm font-semibold opacity-70"
      />
    </blockquote>
  );
}
