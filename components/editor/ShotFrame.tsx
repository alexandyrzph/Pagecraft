"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { domToBlob } from "modern-screenshot";
import type { Block, CollectionMap } from "@/lib/types";
import { responsiveCss } from "@/lib/blocks/styles";
import { designSystemCss } from "@/lib/design/design-system";
import { themeVars } from "@/lib/design/theme";
import { copyStyles } from "@/lib/editor/iframe-styles";
import { BlockRenderer, type ComponentMap } from "@/components/BlockRenderer";
import { useEditor } from "@/store/editor-store";
import { useDesignSystem } from "@/store/design-system";
import {
  registerThumbnailCapturer,
  type ThumbnailResult,
} from "@/lib/thumbnails/capture-controller";
import { uploadThumbnail } from "@/lib/thumbnails/upload-thumbnail";
import { useComponents } from "./components-context";
import { useCollections } from "./collections-context";
import { useSite } from "./site-context";

const WIDTH = 1280;
const HEIGHT = 800;

function raf(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

async function settleImages(doc: Document, timeoutMs: number): Promise<void> {
  const imgs = Array.from(doc.images);
  await Promise.race([
    Promise.all(imgs.map((img) => img.decode().catch(() => undefined))),
    new Promise<void>((r) => setTimeout(r, timeoutMs)),
  ]);
}

async function doCapture(
  body: HTMLElement,
  pageId: string,
  isCancelled: () => boolean,
): Promise<ThumbnailResult | null> {
  const doc = body.ownerDocument;
  await doc.fonts?.ready;
  await settleImages(doc, 4000);
  await raf();
  await raf();
  const blob = await domToBlob(body, {
    width: WIDTH,
    height: HEIGHT,
    scale: 1,
    backgroundColor: "#ffffff",
    type: "image/png",
    timeout: 8000,
    features: { restoreScrollPosition: true },
  });
  if (!blob || isCancelled()) return null;
  return uploadThumbnail(pageId, blob);
}

type PageContentProps = {
  tree: Block[];
  header: Block[];
  footer: Block[];
  components: ComponentMap;
  collections: CollectionMap;
};

type ShotPortalProps = PageContentProps & {
  body: HTMLElement;
  capturing: boolean;
};

function ShotPortal({ body, capturing, ...pageProps }: ShotPortalProps) {
  if (!capturing) return null;
  return createPortal(<PageContent {...pageProps} />, body);
}

function PageContent({ tree, header, footer, components, collections }: PageContentProps) {
  return (
    <>
      {header.length > 0 && (
        <BlockRenderer
          tree={header}
          viewport="desktop"
          inlineStyles={false}
          components={components}
          collections={collections}
        />
      )}
      <BlockRenderer
        tree={tree}
        viewport="desktop"
        inlineStyles={false}
        components={components}
        collections={collections}
      />
      {footer.length > 0 && (
        <BlockRenderer
          tree={footer}
          viewport="desktop"
          inlineStyles={false}
          components={components}
          collections={collections}
        />
      )}
    </>
  );
}

type ShotCaptureResult = {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onLoad: () => void;
  body: HTMLElement | null;
  capturing: boolean;
  portalProps: PageContentProps;
};

function useShotCapture(): ShotCaptureResult {
  const ref = useRef<HTMLIFrameElement>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);
  const dynRef = useRef<HTMLStyleElement | null>(null);
  const [capturing, setCapturing] = useState(false);
  const resolveRef = useRef<((r: ThumbnailResult | null) => void) | null>(null);

  const tree = useEditor((s) => s.tree);
  const theme = useEditor((s) => s.theme);
  const colors = useDesignSystem((s) => s.colors);
  const textStyles = useDesignSystem((s) => s.textStyles);
  const components = useComponents();
  const collections = useCollections();
  const site = useSite();

  const handleLoad = () => {
    const doc = ref.current?.contentDocument;
    if (!doc) return;
    copyStyles(doc);
    const dyn = doc.createElement("style");
    dyn.setAttribute("data-pc-shot", "");
    doc.head.appendChild(dyn);
    dynRef.current = dyn;
    doc.documentElement.style.height = "100%";
    doc.body.style.margin = "0";
    doc.body.style.minHeight = "100%";
    doc.body.style.background = "#ffffff";
    setBody(doc.body);
  };

  useEffect(() => {
    if (!body || !dynRef.current) return;
    dynRef.current.textContent =
      designSystemCss(colors, textStyles) +
      "\n" +
      responsiveCss([...tree, ...site.header, ...site.footer], { editable: false });
    const vars = themeVars(theme) as Record<string, string>;
    for (const [k, v] of Object.entries(vars)) body.style.setProperty(k, v);
  }, [body, tree, site.header, site.footer, colors, textStyles, theme]);

  useEffect(() => {
    const capture = (): Promise<ThumbnailResult | null> =>
      new Promise((resolve) => {
        if (!useEditor.getState().pageId || !ref.current?.contentDocument?.body) {
          resolve(null);
          return;
        }
        resolveRef.current = resolve;
        setCapturing(true);
      });
    registerThumbnailCapturer(capture);
    return () => registerThumbnailCapturer(null);
  }, []);

  useEffect(() => {
    if (!capturing || !body) return;
    let cancelled = false;
    const finish = (r: ThumbnailResult | null) => {
      if (cancelled) return;
      resolveRef.current?.(r);
      resolveRef.current = null;
      setCapturing(false);
    };
    const pageId = useEditor.getState().pageId;
    if (!pageId) {
      finish(null);
      return;
    }
    void doCapture(body, pageId, () => cancelled)
      .then((result) => finish(result))
      .catch((e) => {
        console.error("[thumbnail] shot failed", e);
        finish(null);
      });
    return () => {
      cancelled = true;
      resolveRef.current?.(null);
      resolveRef.current = null;
    };
  }, [capturing, body]);

  return {
    iframeRef: ref,
    onLoad: handleLoad,
    body,
    capturing,
    portalProps: {
      tree,
      header: site.header,
      footer: site.footer,
      components: components.map,
      collections: collections.map,
    },
  };
}

export function ShotFrame() {
  const { iframeRef, onLoad, body, capturing, portalProps } = useShotCapture();

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        left: -99999,
        top: 0,
        width: WIDTH,
        height: HEIGHT,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <iframe
        ref={iframeRef}
        title="thumbnail"
        srcDoc="<!doctype html><html><head></head><body></body></html>"
        onLoad={onLoad}
        style={{ width: WIDTH, height: HEIGHT, border: 0, background: "#fff" }}
      />
      {body && <ShotPortal body={body} capturing={capturing} {...portalProps} />}
    </div>
  );
}
