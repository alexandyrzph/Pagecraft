import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseContent } from "@/lib/page-service";
import { requireUser } from "@/lib/auth/auth";
import { getActiveSite } from "@/lib/auth/site";
import { EditorClient } from "@/components/editor/EditorClient";

export const dynamic = "force-dynamic";

export default async function SiteRegionEditor({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  await requireUser();
  const ctx = await getActiveSite();
  if (!ctx) redirect("/onboarding");
  const { region } = await params;
  if (region !== "header" && region !== "footer") notFound();

  const site = await prisma.site.findFirst({ where: { id: ctx.site.id } });
  const content = parseContent(site ? (region === "footer" ? site.footer : site.header) : "[]");

  return (
    <EditorClient
      mode="site"
      siteRegion={region}
      page={{
        id: "site",
        title: region === "footer" ? "Footer" : "Header",
        slug: "",
        published: false,
        content,
        seo: {},
        theme: {},
      }}
    />
  );
}
