type DomainLike = { hostname?: string | null; status?: string | null; isPrimary?: boolean | null };

/** The hostname of the site's primary ACTIVE custom domain (falling back to the
 *  first ACTIVE one), or null when the site has no live domain yet. Pure. */
export function activeDomainHost(domains: unknown): string | null {
  if (!Array.isArray(domains)) return null;
  const active = (domains as DomainLike[]).filter((d) => d?.status === "ACTIVE" && !!d?.hostname);
  if (active.length === 0) return null;
  return (active.find((d) => d.isPrimary) ?? active[0]).hostname ?? null;
}

export function liveUrl(host: string, slug: string): string {
  return `https://${host}/p/${slug}`;
}
