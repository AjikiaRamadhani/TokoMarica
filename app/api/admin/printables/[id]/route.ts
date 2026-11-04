import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const printable = await prisma.printable.update({
      where: { id },
      data: {
        ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
        ...(typeof body.slug === "string" ? { slug: body.slug.trim() } : {}),
        ...(typeof body.description === "string" ? { description: body.description.trim() } : {}),
        ...(typeof body.subject === "string" ? { subject: body.subject.trim() } : {}),
        ...(typeof body.ageMin === "number" ? { ageMin: body.ageMin } : {}),
        ...(typeof body.ageMax === "number" ? { ageMax: body.ageMax } : {}),
        ...(typeof body.thumbnailUrl === "string" ? { thumbnailUrl: body.thumbnailUrl.trim() || null } : {}),
        ...(typeof body.fileUrl === "string" ? { fileUrl: body.fileUrl.trim() } : {}),
        ...(typeof body.price === "number" && body.price >= 0 ? { price: body.price } : {}),
        points: 0,
        ...(typeof body.isFeatured === "boolean" ? { isFeatured: body.isFeatured } : {}),
        ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
      },
    });
    return NextResponse.json(printable);
  } catch (error) {
    console.error("[PATCH /api/admin/printables/[id]]", error);
    return NextResponse.json({ error: "Gagal memperbarui printable" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const printable = await prisma.printable.findUnique({ where: { id }, select: { id: true } });
    if (!printable) return NextResponse.json({ error: "Printable tidak ditemukan" }, { status: 404 });

    await prisma.$transaction(async (transaction) => {
      await transaction.printableLead.deleteMany({ where: { printableId: id } });
      await transaction.printable.delete({ where: { id } });
    });

    return NextResponse.json({ message: "Printable dihapus" });
  } catch (error) {
    console.error("[DELETE /api/admin/printables/[id]]", error);
    return NextResponse.json({ error: "Gagal menghapus printable" }, { status: 500 });
  }
}
