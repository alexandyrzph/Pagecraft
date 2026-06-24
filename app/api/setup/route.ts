import { requireApiUser } from "@/lib/auth/auth";
import { runSetup } from "@/lib/setup/run-setup";
import { persistActiveContext } from "@/lib/auth/site";
import { created, badRequest } from "@/lib/api/api-response";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const u = await requireApiUser();
  if ("response" in u) return u.response;
  const body = await req.json().catch(() => ({}));
  const siteName = String(body?.site?.name ?? "").trim();
  if (!siteName) return badRequest("Site name required");
  const wsDraft = body?.workspace ?? null;
  if (wsDraft && !String(wsDraft?.name ?? "").trim()) return badRequest("Workspace name required");

  let result;
  try {
    result = await runSetup(u.user.id, {
      workspace: wsDraft
        ? {
            name: String(wsDraft.name),
            logoUrl: typeof wsDraft.logoUrl === "string" ? wsDraft.logoUrl : null,
          }
        : null,
      site: {
        name: siteName,
        logoUrl: typeof body?.site?.logoUrl === "string" ? body.site.logoUrl : null,
        faviconUrl: typeof body?.site?.faviconUrl === "string" ? body.site.faviconUrl : null,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "no_workspace") return badRequest("no_workspace");
    return badRequest("Could not complete setup");
  }
  await persistActiveContext(result.workspaceId, result.siteId);
  return created(result);
}
