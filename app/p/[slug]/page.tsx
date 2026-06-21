import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageDocument } from "@/components/PageDocument";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.page.findFirst({ where: { slug } });
  if (!page) return { title: "Page not found" };

  const title = page.metaTitle || page.title;
  const description = page.metaDescription || undefined;
  const images = page.ogImage ? [page.ogImage] : undefined;

  return {
    title,
    description,
    openGraph: { title, description, images, type: "website" },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await prisma.page.findFirst({ where: { slug } });
  if (!page || !page.published) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.metaTitle || page.title,
    description: page.metaDescription || undefined,
    url: `https://pagecraft.app/p/${slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageDocument page={page} />
    </>
  );
}
