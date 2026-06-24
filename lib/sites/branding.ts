export function siteBrandingJson(s: {
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
}): { name: string; logoUrl: string | null; faviconUrl: string | null } {
  return { name: s.name, logoUrl: s.logoUrl, faviconUrl: s.faviconUrl };
}
