import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.marica.id";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const articles = await prisma.article.findMany({
        where: { status: "PUBLISHED" },
        select: {
            slug: true,
            coverImageUrl: true,
            publishedAt: true,
            updatedAt: true,
        },
        orderBy: { publishedAt: "desc" },
    });

    return [
        {
            url: siteUrl,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 1,
        },
        {
            url: `${siteUrl}/artikel`,
            lastModified: articles[0]?.updatedAt ?? new Date(),
            changeFrequency: "daily",
            priority: 0.9,
        },
        ...articles.map((article) => ({
            url: `${siteUrl}/artikel/${article.slug}`,
            lastModified: article.updatedAt ?? article.publishedAt ?? new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.8,
            ...(article.coverImageUrl ? { images: [article.coverImageUrl] } : {}),
        })),
    ];
}