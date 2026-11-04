import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp-checkout";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const company = await prisma.companyProfile.findFirst({
    select: { id: true, whatsapp: true },
  });
  return NextResponse.json(company ?? { id: null, whatsapp: null });
}

export async function PATCH(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as { whatsapp?: unknown };
    if (typeof body.whatsapp !== "string" || !body.whatsapp.trim()) {
      return NextResponse.json(
        { error: "Nomor WhatsApp wajib diisi" },
        { status: 400 },
      );
    }

    const whatsapp = normalizeWhatsAppNumber(body.whatsapp);
    if (whatsapp.length < 10 || whatsapp.length > 15) {
      return NextResponse.json(
        { error: "Nomor WhatsApp tidak valid" },
        { status: 400 },
      );
    }

    const existing = await prisma.companyProfile.findFirst({
      select: { id: true },
    });
    const company = existing
      ? await prisma.companyProfile.update({
          where: { id: existing.id },
          data: { whatsapp },
          select: { id: true, whatsapp: true },
        })
      : await prisma.companyProfile.create({
          data: { name: "Marica", whatsapp },
          select: { id: true, whatsapp: true },
        });

    return NextResponse.json(company);
  } catch (error) {
    console.error("[PATCH /api/admin/company]", error);
    return NextResponse.json(
      { error: "Gagal menyimpan nomor WhatsApp" },
      { status: 500 },
    );
  }
}
