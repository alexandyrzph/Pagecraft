import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveHostSite } from "@/lib/domains/resolve";
import { requestHost } from "@/lib/domains/request-host";
import { getActiveSite } from "@/lib/auth/site";

export async function resolveStoreSiteId(): Promise<string | null> {
  const resolved = await resolveHostSite(await requestHost());
  if (resolved) return resolved.siteId;
  const ctx = await getActiveSite();
  return ctx?.site.id ?? null;
}

export async function loadStorefront(siteId: string) {
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  const store = await prisma.store.findUnique({ where: { siteId } });
  if (!site || !store) notFound();
  return { site, store };
}
