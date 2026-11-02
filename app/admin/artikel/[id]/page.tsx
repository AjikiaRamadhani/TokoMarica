import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ArticleForm from "../../../components/admin/ArticleForm";

export const metadata: Metadata = {
  title: "Edit Artikel",
};

export default async function AdminEditArtikelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // AdminLayout (app/admin/layout.tsx) sudah memastikan hanya admin yang
  // sampai sini, jadi query langsung lewat Prisma di server component ini
  // aman tanpa perlu requireAdmin lagi.
  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      productPlacements: {
        orderBy: { sortOrder: "asc" },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              isActive: true,
              images: { orderBy: { order: "asc" }, take: 1 },
            },
          },
        },
      },
    },
  });

  if (!article) {
    notFound();
  }

  return (
    <ArticleForm
      initialData={{
        id: article.id,
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        coverImageUrl: article.coverImageUrl,
        videoUrl: article.videoUrl,
        videoProvider: article.videoProvider,
        videoDurationSeconds: article.videoDurationSeconds,
        isVideoFeatured: article.isVideoFeatured,
        categoryId: article.categoryId,
        status: article.status,
        publishedAt: article.publishedAt ? article.publishedAt.toISOString() : null,
        productPlacements: article.productPlacements,
      }}
    />
  );
}
