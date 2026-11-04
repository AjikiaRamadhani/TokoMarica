import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access-control";
import crypto from "crypto";
import { settlePlaypassBooking } from "@/lib/playpass-booking";
import { settleTableReservation } from "@/lib/table-reservation";
import { awardPointsInTransaction, calculateEarnedPoints } from "@/lib/points";
import { sendEventTicketEmailIfNeeded } from "@/lib/event-ticket-mailer";
import { sendPlaypassTicketEmailIfNeeded } from "@/lib/playpass-ticket-mailer";
import { sendTableReservationEmailIfNeeded } from "@/lib/table-reservation-mailer";

export async function GET() {
  const session = await requireRole("ADMIN", "KASIR");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [events, playpasses, tableReservations] = await Promise.all([
      prisma.eventBooking.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          event: { select: { id: true, title: true, eventDate: true, startTime: true, endTime: true } },
          tickets: { select: { ticketCode: true, participantName: true, status: true, checkedInAt: true } },
        },
      }),
      prisma.playpassBooking.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          package: { select: { id: true, name: true, durationMinutes: true, price: true } },
          tickets: { select: { ticketNumber: true, status: true, checkedInAt: true } },
        },
      }),
      prisma.tableReservation.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          package: { select: { id: true, name: true, durationMinutes: true, price: true, maxPlayers: true } },
        },
      }),
    ]);

    return NextResponse.json({ events, playpasses, tableReservations });
  } catch (error) {
    console.error("[GET /api/admin/bookings]", error);
    return NextResponse.json({ error: "Gagal mengambil data booking" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await requireRole("ADMIN", "KASIR");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json() as { type?: string; id?: string; status?: string };
    if (!body.type || !body.id || body.status !== "PAID") return NextResponse.json({ error: "Hanya konfirmasi pembayaran ke PAID yang didukung" }, { status: 400 });

    if (body.type === "PLAYPASS") {
      const booking = await settlePlaypassBooking(body.id, `MANUAL-WA-${body.id}`);
      if (!booking) return NextResponse.json({ error: "Booking Playpass tidak ditemukan" }, { status: 404 });
      await sendPlaypassTicketEmailIfNeeded(body.id);
      return NextResponse.json({ booking });
    }
    if (body.type === "TABLE") {
      const reservation = await settleTableReservation(body.id, `MANUAL-WA-${body.id}`);
      if (!reservation) return NextResponse.json({ error: "Reservasi meja tidak ditemukan" }, { status: 404 });
      await sendTableReservationEmailIfNeeded(body.id);
      return NextResponse.json({ reservation });
    }
    if (body.type === "EVENT") {
      const booking = await prisma.eventBooking.findUnique({ where: { id: body.id } });
      if (!booking) return NextResponse.json({ error: "Booking event tidak ditemukan" }, { status: 404 });
      if (booking.status === "PENDING_PAYMENT") {
        await prisma.$transaction(async (tx) => {
          const changed = await tx.eventBooking.updateMany({ where: { id: booking.id, status: "PENDING_PAYMENT" }, data: { status: "PAID", paidAt: new Date(), midtransTransactionId: null } });
          if (!changed.count) return;
          if ((await tx.eventTicket.count({ where: { bookingId: booking.id } })) === 0) {
            await tx.eventTicket.createMany({ data: booking.participantNames.map((participantName, index) => ({ ticketCode: `${booking.bookingNumber}-${index + 1}`, qrToken: crypto.randomUUID(), bookingId: booking.id, participantName })) });
          }
          await awardPointsInTransaction(tx, { userId: booking.userId, points: calculateEarnedPoints(booking.totalPrice), reason: `Pembayaran event: ${booking.bookingNumber}`, referenceType: "EVENT_BOOKING", referenceId: booking.id, idempotencyKey: `event-booking-paid:${booking.id}` });
        });
        await sendEventTicketEmailIfNeeded(booking.id);
      }
      return NextResponse.json(await prisma.eventBooking.findUnique({ where: { id: booking.id }, include: { tickets: true } }));
    }
    if (body.type === "PREORDER") {
      const reservation = await prisma.preOrderReservation.findUnique({ where: { id: body.id } });
      if (!reservation) return NextResponse.json({ error: "Pre-order tidak ditemukan" }, { status: 404 });
      const changed = await prisma.preOrderReservation.updateMany({ where: { id: body.id, status: "PENDING_PAYMENT" }, data: { status: "PAID", paidAt: new Date(), midtransTransactionId: null } });
      if (!changed.count) return NextResponse.json({ error: "Pre-order tidak ditemukan atau sudah diproses" }, { status: 409 });
      await prisma.$transaction(async (tx) => {
        await awardPointsInTransaction(tx, { userId: reservation.userId, points: calculateEarnedPoints(reservation.totalPrice), reason: `Pembayaran pre-order: ${reservation.reservationNumber}`, referenceType: "PREORDER_RESERVATION", referenceId: reservation.id, idempotencyKey: `preorder-paid:${reservation.id}` });
      });
      return NextResponse.json(await prisma.preOrderReservation.findUnique({ where: { id: body.id } }));
    }
    if (body.type === "SUBSCRIPTION") {
      const cycle = await prisma.subscriptionCycle.findUnique({ where: { id: body.id } });
      if (!cycle) return NextResponse.json({ error: "Cycle subscription tidak ditemukan" }, { status: 404 });
      await prisma.$transaction(async (tx) => {
        const changed = await tx.subscriptionCycle.updateMany({ where: { id: cycle.id, status: "PENDING_PAYMENT" }, data: { status: "PAID", paidAt: new Date(), midtransTransactionId: null } });
        if (!changed.count) return;
        await tx.subscription.update({ where: { id: cycle.subscriptionId }, data: { status: "ACTIVE", nextBillingAt: cycle.periodEnd, nextDeliveryAt: cycle.periodStart } });
        await tx.subscriptionDelivery.updateMany({ where: { cycleId: cycle.id, status: "SCHEDULED" }, data: { status: "PREPARING" } });
        const subscription = await tx.subscription.findUnique({ where: { id: cycle.subscriptionId }, select: { userId: true } });
        if (subscription) await awardPointsInTransaction(tx, { userId: subscription.userId, points: calculateEarnedPoints(cycle.amount), reason: `Pembayaran subscription: ${cycle.cycleNumber}`, referenceType: "SUBSCRIPTION_CYCLE", referenceId: cycle.id, idempotencyKey: `subscription-cycle-paid:${cycle.id}` });
      });
      return NextResponse.json(await prisma.subscriptionCycle.findUnique({ where: { id: cycle.id } }));
    }
    return NextResponse.json({ error: "Tipe booking tidak valid" }, { status: 400 });
  } catch (error) {
    console.error("[PUT /api/admin/bookings]", error);
    return NextResponse.json({ error: "Gagal mengonfirmasi pembayaran" }, { status: 500 });
  }
}
