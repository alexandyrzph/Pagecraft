// One-time data migration — superseded by the multi-site schema; kept as a no-op.
// fallow-ignore-file unused-file
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(s: string): string {
  return (
    (s || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "acme"
  );
}

async function main() {
  let ws = await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" } });
  if (!ws) {
    ws = await prisma.workspace.create({ data: { name: "Acme Inc", slug: slugify("Acme Inc") } });
    console.log("Created default workspace", ws.id, ws.slug);
  } else {
    console.log("Reusing existing workspace", ws.id, ws.slug);
  }

  const users = await prisma.user.findMany();
  for (const u of users) {
    await prisma.membership.upsert({
      where: { userId_workspaceId: { userId: u.id, workspaceId: ws.id } },
      update: {},
      create: { userId: u.id, workspaceId: ws.id, role: "OWNER" },
    });
  }
  console.log(`Ensured OWNER membership for ${users.length} user(s)`);
  console.log("Content is now scoped to sites; no column-level migration needed.");
}

main()
  .then(() => console.log("Migration complete."))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
