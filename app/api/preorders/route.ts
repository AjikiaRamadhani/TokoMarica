import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { snap } from "@/lib/midtrans";
import { preorderIsOpen, preorderReservationNumber } from "@/lib/preorder";
import { validateInteger, validatePhone } from "@/lib/request-validation";

export async function GET() {
  const now = new Date();
  const campaigns = await prisma.preOrderCampaign.findMany({
    where: {
      status: "PUBLISHED",
      preorderOpenAt: { lte: now },
      OR: [{ preorderCloseAt: null }, { preorderCloseAt: { gte: now } }],
    },
    orderBy: { releaseAt: "asc" },
    include: { product: { include: { images: { orderBy: { order: "asc" }, take: 1 } } } },
  });
  return NextResponse.json(campaigns.map((campaign) => ({ ...campaign, remaining: campaign.stockLimit === null ? null : Math.max(0, campaign.stockLimit - campaign.reservedQuantity) })));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  const userId = session.user.id;
  const userEmail = session.user.email;
  try {
    const body = (await request.json()) as { campaignId?: string; quantity?: number; whatsapp?: string };
    const quantity = validateInteger(body.quantity ?? 1, "Jumlah pre-order", 1);
    const whatsapp = body.whatsapp === undefined || body.whatsapp === "" ? { value: null as string | null } : validatePhone(body.whatsapp, "WhatsApp");
    if (!body.campaignId || quantity.error || ("error" in whatsapp && whatsapp.error) || typeof quantity.value !== "number") return NextResponse.json({ error: "Data pre-order tidak valid" }, { status: 400 });
    const campaign = await prisma.preOrderCampaign.findUnique({ where: { id: body.campaignId }, include: { product: true } });
    if (!campaign || campaign.status !== "PUBLISHED" || !preorderIsOpen(campaign.preorderOpenAt, campaign.preorderCloseAt)) return NextResponse.json({ error: "Pre-order belum dibuka atau sudah ditutup" }, { status: 409 });
    if (campaign.stockLimit !== null && campaign.reservedQuantity + quantity.value > campaign.stockLimit) return NextResponse.json({ error: "Sisa kuota pre-order tidak mencukupi" }, { status: 409 });
    const number = preorderReservationNumber();
    const reservation = await prisma.$transaction(async (tx) => {
      const updated = await tx.preOrderCampaign.updateMany({ where: { id: campaign.id, status: "PUBLISHED", ...(campaign.stockLimit === null ? {} : { reservedQuantity: { lte: campaign.stockLimit - quantity.value } }) }, data: { reservedQuantity: { increment: quantity.value } } });
      if (!updated.count) throw new Error("PREORDER_SOLD_OUT");
      return tx.preOrderReservation.create({ data: { reservationNumber: number, campaignId: campaign.id, userId, customerName: session.user.name ?? "Pelanggan Marica", customerEmail: userEmail, customerWhatsapp: whatsapp.value ?? null, quantity: quantity.value, totalPrice: campaign.price * quantity.value } });
    });
    const transaction = await snap.createTransaction({ transaction_details: { order_id: number, gross_amount: reservation.totalPrice }, customer_details: { first_name: reservation.customerName, email: reservation.customerEmail, phone: reservation.customerWhatsapp ?? undefined }, item_details: [{ id: campaign.product.id, price: campaign.price, quantity: reservation.quantity, name: campaign.title.slice(0, 50) }] });
    const updated = await prisma.preOrderReservation.update({ where: { id: reservation.id }, data: { midtransOrderId: number, midtransSnapToken: transaction.token ?? transaction.redirect_url } });
    return NextResponse.json({ reservation: updated, snapToken: transaction.token, redirectUrl: transaction.redirect_url }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PREORDER_SOLD_OUT") return NextResponse.json({ error: "Sisa kuota pre-order tidak mencukupi" }, { status: 409 });
    console.error("[POST /api/preorders]", error);
    return NextResponse.json({ error: "Gagal membuat pre-order" }, { status: 500 });
  }
}
