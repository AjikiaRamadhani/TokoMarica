import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { slugify } from "@/lib/slugify";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const printables = await prisma.printable.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { leads: true } } },
  });
  return NextResponse.json(printables);
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      title?: string;
      slug?: string;
      description?: string;
      subject?: string;
      ageMin?: number;
      ageMax?: number;
      thumbnailUrl?: string;
      fileUrl?: string;
      price?: number;
      isFeatured?: boolean;
      isActive?: boolean;
    };

    if (!body.title?.trim() || !body.description?.trim() || !body.subject?.trim() || !body.fileUrl?.trim()) {
      return NextResponse.json({ error: "Judul, deskripsi, subject, dan file PDF wajib diisi" }, { status: 400 });
    }

    if (body.price !== undefined && (!Number.isInteger(body.price) || body.price < 0)) {
      return NextResponse.json({ error: "Harga harus berupa bilangan bulat tidak negatif" }, { status: 400 });
    }

    const printable = await prisma.printable.create({
      data: {
        title: body.title.trim(),
        slug: slugify(body.slug?.trim() || body.title),
        description: body.description.trim(),
        subject: body.subject.trim(),
        ageMin: body.ageMin,
        ageMax: body.ageMax,
        thumbnailUrl: body.thumbnailUrl?.trim() || null,
        fileUrl: body.fileUrl.trim(),
        price: body.price ?? 0,
        points: 0,
        isFeatured: body.isFeatured ?? false,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json(printable, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/printables]", error);
    return NextResponse.json({ error: "Gagal membuat printable" }, { status: 500 });
  }
}
