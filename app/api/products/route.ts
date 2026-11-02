import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(50, Number(searchParams.get("limit") ?? 12));
    const categorySlug = searchParams.get("category");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") ?? "newest"; // newest | price_asc | price_desc | bestseller
    const ageParam = searchParams.get("age"); // "3-5" dst
    const skillFocus = searchParams.get("skillFocus"); // "Kognitif"
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");

    let ageFilter = {};
    if (ageParam) {
      const [min, max] = ageParam.split("-").map(Number);
      // Produk yang rentang usianya overlap sama rentang yang dipilih
      ageFilter = {
        AND: [
          { OR: [{ ageMin: null }, { ageMin: { lte: max } }] },
          { OR: [{ ageMax: null }, { ageMax: { gte: min } }] },
        ],
      };
    }

    const priceFilter: { gte?: number; lte?: number } = {};
    if (minPrice) priceFilter.gte = Number(minPrice);
    if (maxPrice) priceFilter.lte = Number(maxPrice);

    let categoryFilter: { categoryId?: { in: string[] } } = {};
    if (categorySlug) {
      const categories = await prisma.productCategory.findMany({
        select: { id: true, slug: true, parentId: true },
      });
      const selected = categories.find((category) => category.slug === categorySlug);
      if (selected) {
        const categoryIds = new Set([selected.id]);
        let parentIds = [selected.id];
        while (parentIds.length > 0) {
          const children = categories.filter((category) => category.parentId && parentIds.includes(category.parentId));
          for (const child of children) categoryIds.add(child.id);
          parentIds = children.map((child) => child.id);
        }
        categoryFilter = { categoryId: { in: [...categoryIds] } };
      } else {
        categoryFilter = { categoryId: { in: [] } };
      }
    }

    const where = {
      isActive: true,
      ...categoryFilter,
      ...(skillFocus ? { skillFocus: { has: skillFocus } } : {}),
      ...(Object.keys(priceFilter).length > 0 ? { price: priceFilter } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...ageFilter,
    };

    const orderBy =
      sort === "price_asc"
        ? { price: "asc" as const }
        : sort === "price_desc"
          ? { price: "desc" as const }
          : sort === "bestseller"
            ? { soldCount: "desc" as const }
            : { createdAt: "desc" as const };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          images: { orderBy: { order: "asc" }, take: 1 },
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json(
      {
        products,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[GET /api/products]", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
