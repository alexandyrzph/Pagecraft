import { withWorkspace } from "@/lib/api/api-handler";
import { json, badRequest } from "@/lib/api/api-response";
import { setActiveSite } from "@/lib/auth/site";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withWorkspace(async () => {
    const body = await req.json().catch(() => ({}));
    const ok = await setActiveSite(String(body?.id ?? ""));
    return ok ? json({ ok: true }) : badRequest("Unknown site");
  });
}
