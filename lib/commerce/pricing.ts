export function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(minor / 100);
}

export function minVariantPrice(
  variants: { priceAmount: number; currency: string }[],
): { amount: number; currency: string } | null {
  if (variants.length === 0) return null;
  let best = variants[0];
  for (const v of variants) if (v.priceAmount < best.priceAmount) best = v;
  return { amount: best.priceAmount, currency: best.currency };
}

export function parseOptions(json: string): Record<string, string> {
  try {
    const v = JSON.parse(json);
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const out: Record<string, string> = {};
      for (const [k, val] of Object.entries(v)) out[k] = String(val);
      return out;
    }
    return {};
  } catch {
    return {};
  }
}

export function variantForOptions(
  variants: { id: string; options: string }[],
  selected: Record<string, string>,
): string | null {
  const keys = Object.keys(selected);
  for (const v of variants) {
    const opts = parseOptions(v.options);
    if (keys.every((k) => opts[k] === selected[k])) return v.id;
  }
  return null;
}
