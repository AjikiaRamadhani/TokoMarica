import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { coreApi } from "@/lib/midtrans";
import { sendEventTicketEmailIfNeeded } from "@/lib/event-ticket-mailer";
import crypto from "crypto";
import { awardPointsInTransaction, calculateEarnedPoints } from "@/lib/points";

type MidtransStatus = {
  transaction_status?: string;
  transaction_id?: string;
  gross_amount?: string;
  fraud_status?: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookingNumber: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  }

  const { bookingNumber } = await params;
  const bookingRecord = await prisma.eventBooking.findFirst({
    where: { bookingNumber, userId: session.user.id },
    include: { event: true, tickets: true },
  });

  if (!bookingRecord) return NextResponse.json({ error: "Booking tidak ditemukan" }, { status: 404 });
  let booking = bookingRecord;

  if (
    booking.status === "PENDING_PAYMENT" &&
    booking.midtransOrderId &&
    booking.midtransSnapToken &&
    !booking.midtransSnapToken.startsWith("http")
  ) {
    try {
      const transactionApi = (coreApi as unknown as {
        transaction: { status: (transactionId: string) => Promise<unknown> };
      }).transaction;
      const payment = (await transactionApi.status(booking.midtransOrderId)) as MidtransStatus;
      const isPaid =
        payment.transaction_status === "settlement" ||
        (payment.transaction_status === "capture" && payment.fraud_status !== "deny");

      if (isPaid && (!payment.gross_amount || Number(payment.gross_amount) === booking.totalPrice)) {
        await prisma.$transaction(async (transaction) => {
          const changed = await transaction.eventBooking.updateMany({
            where: { id: booking.id, status: "PENDING_PAYMENT" },
            data: {
              status: "PAID",
              midtransTransactionId: payment.transaction_id ?? booking.midtransOrderId,
              paidAt: new Date(),
            },
          });
          if (!changed.count) return;
          if ((await transaction.eventTicket.count({ where: { bookingId: booking.id } })) === 0) {
            await transaction.eventTicket.createMany({
              data: booking.participantNames.map((participantName, index) => ({
                ticketCode: `${booking.bookingNumber}-${index + 1}`,
                qrToken: crypto.randomUUID(),
                bookingId: booking.id,
                participantName,
              })),
            });
          }
          await awardPointsInTransaction(transaction, {
            userId: booking.userId,
            points: calculateEarnedPoints(booking.totalPrice),
            reason: `Pembayaran event: ${booking.bookingNumber}`,
            referenceType: "EVENT_BOOKING",
            referenceId: booking.id,
            idempotencyKey: `event-booking-paid:${booking.id}`,
          });
        });
        await sendEventTicketEmailIfNeeded(booking.id);
        const refreshedBooking = await prisma.eventBooking.findFirst({
          where: { id: booking.id },
          include: { event: true, tickets: true },
        });
        if (refreshedBooking) booking = refreshedBooking;
      }
    } catch (error) {
      console.error("[GET /api/event-bookings/[bookingNumber] payment sync]", error);
    }
  }

  return NextResponse.json(booking);
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ bookingNumber: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  }

  const { bookingNumber } = await params;
  const cancelled = await prisma.eventBooking.updateMany({
    where: {
      bookingNumber,
      userId: session.user.id,
      status: "PENDING_PAYMENT",
    },
    data: { status: "CANCELLED" },
  });

  if (cancelled.count === 0) {
    return NextResponse.json(
      { error: "Booking tidak ditemukan atau sudah tidak bisa dibatalkan" },
      { status: 409 }
    );
  }

  return NextResponse.json({ message: "Booking dibatalkan" });
}