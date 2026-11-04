import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ArticleForm from "../../../components/admin/ArticleForm";

export default async function AdminEditVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  if (!article) notFound();

  return (
    <ArticleForm
      mode="video"
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
        publishedAt: article.publishedAt?.toISOString() ?? null,
        productPlacements: article.productPlacements,
      }}
    />
  );
}
