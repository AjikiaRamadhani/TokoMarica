import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findSessionUser } from "@/lib/session-user";
import { validatePhone } from "@/lib/request-validation";

// GET /api/user/profile
// Mengambil data profil user yang sedang login beserta statistik akun
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  }

  try {
    const user = await findSessionUser(session);
    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const [pointAccount, activeVouchersCount, totalOrders] = await Promise.all([
      prisma.pointAccount.findUnique({
        where: { userId: user.id },
        select: { balance: true },
      }),
      prisma.userVoucher.count({
        where: { userId: user.id, status: "AVAILABLE" },
      }),
      prisma.order.count({
        where: { userId: user.id },
      }),
    ]);

    return NextResponse.json({
      ...user,
      stats: {
        pointBalance: pointAccount?.balance ?? 0,
        activeVouchers: activeVouchersCount,
        totalOrders: totalOrders,
      },
    });
  } catch (error) {
    console.error("[GET /api/user/profile]", error);
    return NextResponse.json({ error: "Gagal mengambil data profil" }, { status: 500 });
  }
}

// PATCH /api/user/profile
// Update informasi pribadi user (nama & nomor HP)
// Email tidak bisa diubah langsung karena butuh verifikasi
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      whatsapp?: string;
    };

    const { name, whatsapp } = body;

    // Validasi: minimal satu field yang diupdate
    if (name === undefined && whatsapp === undefined) {
      return NextResponse.json({ error: "Tidak ada data yang diperbarui" }, { status: 400 });
    }

    // Validasi nama
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (trimmedName.length < 2) {
        return NextResponse.json({ error: "Nama minimal 2 karakter" }, { status: 400 });
      }
      if (trimmedName.length > 100) {
        return NextResponse.json({ error: "Nama maksimal 100 karakter" }, { status: 400 });
      }
    }

    // Validasi nomor HP (opsional, tapi kalau diisi harus format yang valid)
    if (whatsapp !== undefined && whatsapp !== "") {
      const phoneCheck = validatePhone(whatsapp, "Nomor HP");
      if (phoneCheck.error) {
        return NextResponse.json(
          { error: "Format nomor HP tidak valid (contoh: 08123456789)" },
          { status: 400 }
        );
      }
    }

    const data: Record<string, string | null> = {};
    if (name !== undefined) data.name = name.trim();
    if (whatsapp !== undefined) data.whatsapp = whatsapp.trim() || null;

    const user = await findSessionUser(session);
    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        whatsapp: true,
        image: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("[PATCH /api/user/profile]", error);
    return NextResponse.json({ error: "Gagal memperbarui profil" }, { status: 500 });
  }
}
