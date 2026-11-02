import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { coreApi } from "@/lib/midtrans";

type MidtransStatus = { transaction_status?: string; transaction_id?: string; gross_amount?: string; fraud_status?: string };

async function syncPayment(reservation: { id: string; status: string; midtransOrderId: string | null; totalPrice: number }) {
  if (reservation.status !== "PENDING_PAYMENT" || !reservation.midtransOrderId) return;
  const transactionApi = (coreApi as unknown as { transaction: { status: (id: string) => Promise<unknown> } }).transaction;
  const payment = (await transactionApi.status(reservation.midtransOrderId)) as MidtransStatus;
  const paid = payment.transaction_status === "settlement" || (payment.transaction_status === "capture" && payment.fraud_status !== "deny");
  if (!paid) return;
  if (payment.gross_amount && Number(payment.gross_amount) !== reservation.totalPrice) throw new Error("Nominal pembayaran tidak sesuai");
  await prisma.preOrderReservation.updateMany({ where: { id: reservation.id, status: "PENDING_PAYMENT" }, data: { status: "PAID", midtransTransactionId: payment.transaction_id ?? reservation.midtransOrderId, paidAt: new Date() } });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reservationNumber: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  }

  const { reservationNumber } = await params;
  const reservation = await prisma.preOrderReservation.findFirst({
    where: { reservationNumber, userId: session.user.id },
    include: {
      campaign: {
        include: {
          product: { include: { images: { orderBy: { order: "asc" }, take: 1 } } },
        },
      },
    },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Pre-order tidak ditemukan" }, { status: 404 });
  }

  try {
    await syncPayment(reservation);
    if (reservation.status === "PENDING_PAYMENT") {
      const refreshed = await prisma.preOrderReservation.findFirst({ where: { id: reservation.id, userId: session.user.id }, include: { campaign: { include: { product: { include: { images: { orderBy: { order: "asc" }, take: 1 } } } } } } });
      return NextResponse.json(refreshed ?? reservation);
    }
  } catch (error) {
    console.error("[GET /api/preorders/reservation] payment sync", error);
  }

  return NextResponse.json(reservation);
}

export async function POST(_request: Request, { params }: { params: Promise<{ reservationNumber: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  const { reservationNumber } = await params;
  const reservation = await prisma.preOrderReservation.findFirst({ where: { reservationNumber, userId: session.user.id } });
  if (!reservation) return NextResponse.json({ error: "Pre-order tidak ditemukan" }, { status: 404 });
  try {
    await syncPayment(reservation);
    const updated = await prisma.preOrderReservation.findFirst({ where: { id: reservation.id, userId: session.user.id }, include: { campaign: { include: { product: { include: { images: { orderBy: { order: "asc" }, take: 1 } } } } } } });
    return NextResponse.json(updated ?? reservation);
  } catch (error) {
    console.error("[POST /api/preorders/reservation] payment sync", error);
    return NextResponse.json({ error: "Status pembayaran belum dapat diverifikasi" }, { status: 502 });
  }
}
