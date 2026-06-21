import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { normalizeHost } from "@/lib/domains/host";

export async function lookupHostSite(host: string) {
  const hostname = normalizeHost(host);
  if (!hostname) return null;
  const domain = await prisma.domain.findUnique({ where: { hostname }, include: { site: true } });
  if (!domain || domain.status !== "ACTIVE") return null;
  return { siteId: domain.siteId, site: domain.site, domain };
}

export const resolveHostSite = cache(lookupHostSite);
