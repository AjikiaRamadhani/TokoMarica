import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { slugify } from "@/lib/slugify";
import {
  ARTICLE_STATUSES,
  validateArticlePayload,
} from "@/lib/article-validation";

async function generateUniqueSlug(title: string) {
  const base = slugify(title) || "artikel";
  let slug = base;
  let counter = 1;

  while (await prisma.article.findUnique({ where: { slug } })) {
    counter += 1;
    slug = `${base}-${counter}`;
  }

  return slug;
}

export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const requestedPage = Number(searchParams.get("page") ?? 1);
    const requestedLimit = Number(searchParams.get("limit") ?? 10);
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(50, requestedLimit)
      : 10;
    const status = searchParams.get("status"); // DRAFT | PUBLISHED
    if (status && !ARTICLE_STATUSES.includes(status as (typeof ARTICLE_STATUSES)[number])) {
      return NextResponse.json({ error: "Status artikel tidak valid" }, { status: 400 });
    }
    const categorySlug = searchParams.get("category");
    const search = searchParams.get("search");
    const media = searchParams.get("media");
    if (media && media !== "video") {
      return NextResponse.json({ error: "Media artikel tidak valid" }, { status: 400 });
    }

    const where = {
      ...(status ? { status: status as "DRAFT" | "PUBLISHED" } : {}),
      ...(categorySlug && categorySlug !== "semua" ? { category: { slug: categorySlug } } : {}),
      ...(media === "video" ? { videoUrl: { not: null } } : {}),
      ...(search
        ? { title: { contains: search, mode: "insensitive" as const } }
        : {}),
    };

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          category: { select: { id: true, name: true, slug: true, colorTag: true } },
          author: { select: { id: true, name: true } },
          productPlacements: {
            orderBy: { sortOrder: "asc" },
            include: { product: { select: { id: true, name: true, slug: true, price: true, isActive: true, images: { orderBy: { order: "asc" as const }, take: 1 } } } },
          },
        },
      }),
      prisma.article.count({ where }),
    ]);

    return NextResponse.json({
      articles,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[GET /api/admin/articles]", error);
    return NextResponse.json({ error: "Failed to fetch articles" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const validation = validateArticlePayload(await request.json(), {
      requireTitleAndContent: true,
    });
    if (validation.error || !validation.data) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { title, excerpt, content, coverImageUrl, videoUrl, videoProvider, videoDurationSeconds, isVideoFeatured, categoryId, status, publishedAt, productIds } = validation.data;
    if (!title || !content) {
      return NextResponse.json({ error: "Judul dan konten wajib diisi" }, { status: 400 });
    }
    if (categoryId && !(await prisma.articleCategory.findUnique({ where: { id: categoryId } }))) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 400 });
    }
    if (
      productIds &&
      (await prisma.product.count({ where: { id: { in: productIds }, isActive: true } })) !== productIds.length
    ) {
      return NextResponse.json({ error: "Satu atau lebih produk tidak ditemukan atau tidak aktif" }, { status: 400 });
    }

    const slug = await generateUniqueSlug(title);
    const finalStatus = status ?? "DRAFT";

    const article = await prisma.article.create({
      data: {
        title,
        slug,
        excerpt,
        content,
        coverImageUrl,
        videoUrl,
        videoProvider,
        videoDurationSeconds,
        isVideoFeatured: isVideoFeatured ?? false,
        categoryId,
        status: finalStatus,
        publishedAt: finalStatus === "PUBLISHED" ? new Date(publishedAt ?? Date.now()) : null,
        authorId: session.user.id,
        productPlacements: productIds
          ? { create: productIds.map((productId, sortOrder) => ({ productId, sortOrder })) }
          : undefined,
      },
      include: {
        category: { select: { id: true, name: true, slug: true, colorTag: true } },
        productPlacements: {
          orderBy: { sortOrder: "asc" },
          include: { product: { select: { id: true, name: true, slug: true, price: true, isActive: true, images: { orderBy: { order: "asc" }, take: 1 } } } },
        },
      },
    });

    return NextResponse.json(article, { status: 201 });
  } catch (error: unknown) {
    console.error("[POST /api/admin/articles]", error);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Slug artikel sudah digunakan, silakan coba lagi" }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal membuat artikel" }, { status: 500 });
  }
}
