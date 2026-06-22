// Pure parser that turns an untrusted JSON create body into the normalized
// fields the POST route needs. Kept out of the handler so the field rules stay
// independent of the database calls.
import { slugify } from "@/lib/utils";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" ? (value as JsonRecord) : {};
}

export interface ProductInput {
  title: string;
  explicitHandle: boolean;
  base: string;
  description: string;
  status: string;
  priceAmount: number;
  inventory: number;
  imageData: { url: string; alt: string; position: number }[];
}

function buildImageData(images: unknown): { url: string; alt: string; position: number }[] {
  const rawImages = Array.isArray(images) ? images : [];
  return rawImages
    .filter((im: { url?: unknown }) => typeof im?.url === "string" && im.url.length > 0)
    .map((im: { url: string; alt?: string }, idx: number) => ({
      url: im.url,
      alt: typeof im.alt === "string" ? im.alt : "",
      position: idx,
    }));
}

export function parseProductInput(body: unknown): ProductInput {
  const b = asRecord(body);
  const title = String(b.title ?? "").trim() || "Untitled product";
  const explicitHandle = typeof b.handle === "string" && b.handle.trim().length > 0;
  const base = slugify(explicitHandle ? String(b.handle) : title).slice(0, 80);
  const description = typeof b.description === "string" ? b.description : "";
  const status = typeof b.status === "string" ? b.status : "draft";
  const v0 = asRecord(Array.isArray(b.variants) ? b.variants[0] : undefined);
  const priceAmount = typeof v0.priceAmount === "number" ? Math.round(v0.priceAmount) : 0;
  const inventory = typeof v0.inventory === "number" ? Math.round(v0.inventory) : 0;
  const imageData = buildImageData(b.images);
  return { title, explicitHandle, base, description, status, priceAmount, inventory, imageData };
}
