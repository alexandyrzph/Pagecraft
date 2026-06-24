import { prisma } from "@/lib/prisma";
import { parseContent } from "@/lib/page-service";
import { withSite, withSiteRole } from "@/lib/api/api-handler";
import { json } from "@/lib/api/api-response";
import { parseJsonArray } from "@/lib/api/json-parse";
import { siteBrandingJson } from "@/lib/sites/branding";

export const dynamic = "force-dynamic";

function siteJson(site: {
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  header: string;
  footer: string;
  colors: string;
  textStyles: string;
}) {
  return {
    ...siteBrandingJson(site),
    header: parseContent(site.header),
    footer: parseContent(site.footer),
    colors: parseJsonArray(site.colors),
    textStyles: parseJsonArray(site.textStyles),
  };
}

export async function GET() {
  return withSite(async (ctx) => {
    const site = await prisma.site.findFirst({ where: { id: ctx.site.id } });
    if (!site) return json({ header: [], footer: [], colors: [], textStyles: [] });
    return json(siteJson(site));
  });
}

export async function PUT(req: Request) {
  return withSiteRole("EDITOR", async (ctx) => {
    const body = await req.json().catch(() => ({}));
    const data: {
      header?: string;
      footer?: string;
      colors?: string;
      textStyles?: string;
      name?: string;
      logoUrl?: string | null;
      faviconUrl?: string | null;
    } = {};
    if (Array.isArray(body.header)) data.header = JSON.stringify(body.header);
    if (Array.isArray(body.footer)) data.footer = JSON.stringify(body.footer);
    if (Array.isArray(body.colors)) data.colors = JSON.stringify(body.colors);
    if (Array.isArray(body.textStyles)) data.textStyles = JSON.stringify(body.textStyles);
    if (typeof body.name === "string") data.name = body.name.slice(0, 80);
    if (typeof body.logoUrl === "string") data.logoUrl = body.logoUrl || null;
    if (typeof body.faviconUrl === "string") data.faviconUrl = body.faviconUrl || null;
    const site = await prisma.site.update({ where: { id: ctx.site.id }, data });
    return json(siteJson(site));
  });
}
