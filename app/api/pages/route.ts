import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/page-service";
import { withSite, withSiteRole } from "@/lib/api/api-handler";
import { json, created } from "@/lib/api/api-response";
import { parseBody, createPageSchema } from "@/lib/api/schemas";
import { logActivity } from "@/lib/activity";
import { instrumentApi, timeDb } from "@/lib/observability";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return instrumentApi("/api/pages", req, () =>
    withSite(async (ctx) => {
      const pages = await timeDb("page.findMany", () =>
        prisma.page.findMany({ where: { siteId: ctx.site.id }, orderBy: { updatedAt: "desc" } }),
      );
      return json(pages);
    }),
  );
}

export async function POST(req: Request) {
  return instrumentApi("/api/pages", req, () =>
    withSiteRole("EDITOR", async (ctx) => {
      const parsed = await parseBody(req, createPageSchema);
      if ("response" in parsed) return parsed.response;
      const title = (parsed.data.title || "Untitled Page").slice(0, 120);
      const slug = await uniqueSlug(ctx.site.id, title);
      const content = JSON.stringify(parsed.data.content ?? []);
      const page = await prisma.page.create({
        data: { title, slug, content, siteId: ctx.site.id },
      });
      await logActivity(ctx.workspace.id, ctx.user.id, "page.created", page.id, { title });
      return created(page);
    }),
  );
}
