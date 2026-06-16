import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyShotToken } from "@/lib/thumbnails/token";
import { PageDocument } from "@/components/PageDocument";

export const dynamic = "force-dynamic";

/**
 * Internal-only: renders any page (published or draft) for the screenshot
 * service. Reachable only with a valid signed `?t=` token, never linked in the
 * UI. Renders with animations off so a screenshot captures the final frame.
 */
export default async function ShotPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;
  if (!t || !verifyShotToken(id, t)) notFound();

  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) notFound();

  return <PageDocument page={page} animate={false} />;
}
