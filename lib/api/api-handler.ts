import {
  requireApiRole,
  requireApiWorkspace,
  type Role,
  type WorkspaceCtx,
} from "@/lib/auth/workspace";
import { requireApiSite, requireApiSiteRole, type SiteCtx } from "@/lib/auth/site";
import { authzTotal } from "@/lib/observability";

export async function runGuarded<C extends { role: Role }>(
  guard: C | { response: Response },
  fn: (ctx: C) => Response | Promise<Response>,
): Promise<Response> {
  if ("response" in guard) {
    authzTotal.inc({ result: "denied", status: guard.response.status });
    return guard.response;
  }
  authzTotal.inc({ result: "allowed", role: guard.role });
  return fn(guard);
}

export async function withWorkspace(
  fn: (ws: WorkspaceCtx) => Response | Promise<Response>,
): Promise<Response> {
  return runGuarded(await requireApiWorkspace(), fn);
}

export async function withRole(
  min: Role,
  fn: (ws: WorkspaceCtx) => Response | Promise<Response>,
): Promise<Response> {
  return runGuarded(await requireApiRole(min), fn);
}

export async function withSite(
  fn: (ctx: SiteCtx) => Response | Promise<Response>,
): Promise<Response> {
  return runGuarded(await requireApiSite(), fn);
}

export async function withSiteRole(
  min: Role,
  fn: (ctx: SiteCtx) => Response | Promise<Response>,
): Promise<Response> {
  return runGuarded(await requireApiSiteRole(min), fn);
}
