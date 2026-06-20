import { chromium, type Browser } from "playwright";
import { mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { signShotToken } from "@/lib/thumbnails/token";

const THUMB_DIR = path.join(process.cwd(), "public", "uploads", "thumbnails");
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const VIEWPORT = { width: 1280, height: 800 };

// Reuse one Chromium across shots; stash on globalThis so dev HMR doesn't leak browsers.
const g = globalThis as unknown as { __pcShotBrowser?: Promise<Browser> };
function getBrowser(): Promise<Browser> {
  if (!g.__pcShotBrowser) {
    g.__pcShotBrowser = chromium.launch({ args: ["--no-sandbox"] }).catch((e) => {
      g.__pcShotBrowser = undefined; // allow a later retry
      throw e;
    });
  }
  return g.__pcShotBrowser;
}

export type ShotResult = { url: string; takenForUpdatedAt: Date };

// Dedupe concurrent captures of the same page.
const inFlight = new Map<string, Promise<ShotResult>>();

/** Capture (or reuse an in-flight capture of) the page's preview screenshot. */
export function captureThumbnail(pageId: string): Promise<ShotResult> {
  const existing = inFlight.get(pageId);
  if (existing) return existing;
  const p = run(pageId).finally(() => inFlight.delete(pageId));
  inFlight.set(pageId, p);
  return p;
}

async function run(pageId: string): Promise<ShotResult> {
  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) throw new Error(`Page ${pageId} not found`);
  const takenForUpdatedAt = page.updatedAt; // the version this shot reflects

  const browser = await getBrowser();
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  try {
    const pg = await context.newPage();
    const token = signShotToken(pageId);
    await pg.goto(`${APP_URL}/internal/shot/${pageId}?t=${token}`, {
      waitUntil: "networkidle",
      timeout: 20_000,
    });
    await pg
      .evaluate(() => (document as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready)
      .catch(() => {});

    await mkdir(THUMB_DIR, { recursive: true });
    await pg.screenshot({ path: path.join(THUMB_DIR, `${pageId}.png`) }); // top of viewport (1280x800)

    const url = `/uploads/thumbnails/${pageId}.png`;
    await prisma.pageThumbnail.upsert({
      where: { pageId },
      create: { pageId, url, takenForUpdatedAt },
      update: { url, takenForUpdatedAt },
    });
    return { url, takenForUpdatedAt };
  } finally {
    await context.close();
  }
}
