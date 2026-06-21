import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveSite } from "@/lib/auth/site";
import { FormsClient } from "@/components/app-shell/FormsClient";

export const dynamic = "force-dynamic";

export default async function FormsPage() {
  const ctx = await getActiveSite();
  if (!ctx) redirect("/onboarding");
  const pages = await prisma.page.findMany({
    where: { siteId: ctx.site.id, submissions: { some: {} } },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });
  const dto = pages.map((p) => ({ id: p.id, title: p.title, count: p._count.submissions }));
  return <FormsClient pages={dto} />;
}
