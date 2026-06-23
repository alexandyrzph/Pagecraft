import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { withSiteRole } from "@/lib/api/api-handler";
import { json, notFound, badRequest, error } from "@/lib/api/api-response";
import { enforce } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const THUMB_DIR = path.join(process.cwd(), "public", "uploads", "thumbnails");
const MAX_BYTES = 8 * 1024 * 1024;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const limited = enforce(req, "thumbnail", 30, 60_000);
  if (limited) return limited;

  return withSiteRole("EDITOR", async (ctx) => {
    const { id } = await params;
    const page = await prisma.page.findFirst({ where: { id, siteId: ctx.site.id } });
    if (!page) return notFound();

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!file || typeof file === "string") return badRequest("No file provided");
    if (file.size > MAX_BYTES) return error(413, "Thumbnail too large");

    await mkdir(THUMB_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(THUMB_DIR, `${id}.png`), buffer);

    const url = `/uploads/thumbnails/${id}.png`;
    const takenForUpdatedAt = page.updatedAt;
    await prisma.pageThumbnail.upsert({
      where: { pageId: id },
      create: { pageId: id, url, takenForUpdatedAt },
      update: { url, takenForUpdatedAt },
    });

    return json({ url, version: takenForUpdatedAt.getTime() });
  });
}
