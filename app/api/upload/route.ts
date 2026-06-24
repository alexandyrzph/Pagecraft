import { withSiteRole } from "@/lib/api/api-handler";
import { created, badRequest, error } from "@/lib/api/api-response";
import { enforce } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/storage";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024;

let seq = 0;

export async function POST(req: Request) {
  const limited = enforce(req, "upload", 30, 60_000);
  if (limited) return limited;

  return withSiteRole("EDITOR", async (ctx) => {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!file || typeof file === "string") {
      return badRequest("No file provided");
    }
    if (file.size > MAX_BYTES) {
      return error(413, "File too large (max 25 MB)");
    }

    const dot = file.name.lastIndexOf(".");
    const ext =
      dot >= 0
        ? file.name
            .slice(dot + 1)
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
        : "";
    const base = slugify(dot >= 0 ? file.name.slice(0, dot) : file.name) || "file";
    const filename = `${base}-${Date.now().toString(36)}${(seq++).toString(36)}${ext ? "." + ext : ""}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await saveFile(filename, buffer, file.type || "application/octet-stream");
    const asset = await prisma.asset.create({
      data: {
        name: file.name.slice(0, 200),
        url,
        type: file.type || "",
        size: file.size,
        siteId: ctx.site.id,
      },
    });

    return created({
      id: asset.id,
      url: asset.url,
      name: asset.name,
      type: asset.type,
      size: asset.size,
    });
  });
}
