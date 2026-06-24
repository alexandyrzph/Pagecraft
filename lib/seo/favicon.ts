import type { Metadata } from "next";

export function faviconMetadata(faviconUrl: string | null | undefined): Pick<Metadata, "icons"> {
  return faviconUrl ? { icons: { icon: faviconUrl } } : {};
}
