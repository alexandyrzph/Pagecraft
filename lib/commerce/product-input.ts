// Pure builders that translate an untrusted JSON request body into the partial
// Prisma update payloads used by the product PATCH route. Kept out of the route
// handler so each field-picking rule is unit-testable in isolation.

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" ? (value as JsonRecord) : {};
}

/** Scalar product fields, included only when present and the right type. */
export function pickProductData(body: unknown): JsonRecord {
  const b = asRecord(body);
  const data: JsonRecord = {};
  if (typeof b.title === "string") data.title = b.title;
  if (typeof b.description === "string") data.description = b.description;
  if (typeof b.status === "string") data.status = b.status;
  if (typeof b.data === "string") data.data = b.data;
  return data;
}

/** Variant update fields; a new price also clears the cached Stripe price id. */
export function pickVariantData(variant: unknown) {
  const v = asRecord(variant);
  return {
    ...(typeof v.title === "string" ? { title: v.title } : {}),
    ...(typeof v.options === "string" ? { options: v.options } : {}),
    ...(typeof v.sku === "string" ? { sku: v.sku } : {}),
    ...(typeof v.priceAmount === "number"
      ? { priceAmount: v.priceAmount, stripePriceId: null }
      : {}),
    ...(typeof v.inventory === "number" ? { inventory: v.inventory } : {}),
    ...(typeof v.inventoryPolicy === "string" ? { inventoryPolicy: v.inventoryPolicy } : {}),
  };
}

export type ProductImageRow = { productId: string; url: string; alt: string; position: number };

/** Replacement image rows, position re-indexed to the filtered order. */
export function buildImageRows(images: unknown, productId: string): ProductImageRow[] {
  if (!Array.isArray(images)) return [];
  return images
    .map(asRecord)
    .filter((im): im is JsonRecord & { url: string } => typeof im.url === "string")
    .map((im, idx) => ({
      productId,
      url: im.url,
      alt: typeof im.alt === "string" ? im.alt : "",
      position: idx,
    }));
}
