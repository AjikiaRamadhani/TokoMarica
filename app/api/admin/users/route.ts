import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { APP_ROLES } from "@/lib/access-control";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const params = new URL(request.url).searchParams;
    const search = params.get("search")?.trim();
    const page = Math.max(1, Number(params.get("page") ?? 1));
    const limit = Math.min(50, Math.max(1, Number(params.get("limit") ?? 20)));
    const where = search
      ? { OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { whatsapp: { contains: search } },
        ] }
      : {};
    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit, select: { id: true, name: true, email: true, whatsapp: true, role: true, createdAt: true } }),
      prisma.user.count({ where }),
    ]);
    return NextResponse.json({ users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("[GET /api/admin/users]", error);
    return NextResponse.json({ error: "Gagal mengambil data user" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json() as { userId?: unknown; role?: unknown };
    if (typeof body.userId !== "string" || !APP_ROLES.includes(body.role as (typeof APP_ROLES)[number])) {
      return NextResponse.json({ error: "User atau role tidak valid" }, { status: 400 });
    }
    if (body.userId === session.user.id) {
      return NextResponse.json({ error: "Role akun yang sedang digunakan tidak dapat diubah sendiri" }, { status: 409 });
    }
    const nextRole = body.role as (typeof APP_ROLES)[number];
    const target = await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    if (nextRole !== "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      const current = await prisma.user.findUnique({ where: { id: body.userId }, select: { role: true } });
      if (current?.role === "ADMIN" && adminCount <= 1) return NextResponse.json({ error: "Admin terakhir tidak dapat diturunkan rolenya" }, { status: 409 });
    }
    const user = await prisma.user.update({ where: { id: body.userId }, data: { role: nextRole }, select: { id: true, name: true, email: true, whatsapp: true, role: true, createdAt: true } });
    return NextResponse.json(user);
  } catch (error) {
    console.error("[PATCH /api/admin/users]", error);
    return NextResponse.json({ error: "Gagal mengubah role user" }, { status: 500 });
  }
}
