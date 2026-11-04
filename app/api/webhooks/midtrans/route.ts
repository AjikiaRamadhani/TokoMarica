import { NextResponse } from "next/server";

// Legacy endpoint: all payments are now handled manually through WhatsApp.
export async function GET() {
  return NextResponse.json({ status: "disabled", message: "Pembayaran Midtrans sudah dinonaktifkan. Gunakan WhatsApp." }, { status: 410 });
}

<<<<<<< HEAD
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order_id, status_code, gross_amount, signature_key, transaction_status, transaction_id } =
      body as {
        order_id?: string;
        status_code?: string;
        gross_amount?: string;
        signature_key?: string;
        transaction_status?: string;
        transaction_id?: string;
      };

    if (
      !order_id ||
      !status_code ||
      !gross_amount ||
      !signature_key ||
      !transaction_status ||
      !transaction_id ||
      !process.env.MIDTRANS_SERVER_KEY
    ) {
      return NextResponse.json({ error: "Invalid Midtrans notification" }, { status: 400 });
    }

    // Verifikasi signature - WAJIB, biar gak ada orang random yang bisa
    // ngirim notifikasi palsu buat nge-mark order dia sebagai "lunas"
    const expectedSignature = crypto
      .createHash("sha512")
      .update(`${order_id}${status_code}${gross_amount}${process.env.MIDTRANS_SERVER_KEY}`)
      .digest("hex");

    const receivedSignature = Buffer.from(signature_key, "utf8");
    const calculatedSignature = Buffer.from(expectedSignature, "utf8");
    if (
      receivedSignature.length !== calculatedSignature.length ||
      !crypto.timingSafeEqual(receivedSignature, calculatedSignature)
    ) {
      console.error("[Midtrans webhook] Invalid signature for order", order_id);
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    if (order_id.startsWith("PPB-")) {
      const booking = await prisma.playpassBooking.findUnique({
        where: { midtransOrderId: order_id },
      });
      if (!booking) return NextResponse.json({ error: "Playpass booking not found" }, { status: 404 });
      if (Number(gross_amount) !== booking.totalPrice) {
        console.error("[Midtrans webhook] Playpass amount mismatch for", order_id);
        return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
      }

      if (transaction_status === "capture" || transaction_status === "settlement") {
        await settlePlaypassBooking(booking.id, transaction_id);
        await sendPlaypassTicketEmailIfNeeded(booking.id);
      } else if (transaction_status === "deny" || transaction_status === "cancel" || transaction_status === "expire") {
        await prisma.playpassBooking.updateMany({
          where: { id: booking.id, status: "PENDING_PAYMENT" },
          data: { status: transaction_status === "expire" ? "EXPIRED" : "CANCELLED" },
        });
      }
      return NextResponse.json({ message: "OK" });
    }

    if (order_id.startsWith("TBL-")) {
      const reservation = await prisma.tableReservation.findUnique({ where: { midtransOrderId: order_id } });
      if (!reservation) return NextResponse.json({ error: "Table reservation not found" }, { status: 404 });
      if (Number(gross_amount) !== reservation.totalPrice) return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
      if (transaction_status === "capture" || transaction_status === "settlement") {
        await settleTableReservation(reservation.id, transaction_id);
        await sendTableReservationEmailIfNeeded(reservation.id);
      } else if (transaction_status === "deny" || transaction_status === "cancel" || transaction_status === "expire") {
        await prisma.tableReservation.updateMany({ where: { id: reservation.id, status: "PENDING_PAYMENT" }, data: { status: transaction_status === "expire" ? "EXPIRED" : "CANCELLED" } });
      }
      return NextResponse.json({ message: "OK" });
    }

    if (order_id.startsWith("EVT-")) {
      const booking = await prisma.eventBooking.findUnique({
        where: { midtransOrderId: order_id },
      });

      if (!booking) {
        return NextResponse.json({ error: "Event booking not found" }, { status: 404 });
      }

      if (Number(gross_amount) !== booking.totalPrice) {
        console.error("[Midtrans webhook] Event amount mismatch for", order_id);
        return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
      }

      if (transaction_status === "capture" || transaction_status === "settlement") {
        await prisma.$transaction(async (transaction) => {
          const paidBooking = await transaction.eventBooking.updateMany({
            where: { id: booking.id, status: "PENDING_PAYMENT" },
            data: {
              status: "PAID",
              midtransTransactionId: transaction_id,
              paidAt: new Date(),
            },
          });

          if (paidBooking.count === 0) return;

          const existingTickets = await transaction.eventTicket.count({
            where: { bookingId: booking.id },
          });

          if (existingTickets === 0) {
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
      } else if (transaction_status === "pending") {
        await prisma.eventBooking.updateMany({
          where: { id: booking.id, status: "PENDING_PAYMENT" },
          data: { status: "PENDING_PAYMENT" },
        });
      } else if (
        transaction_status === "deny" ||
        transaction_status === "cancel" ||
        transaction_status === "expire"
      ) {
        await prisma.eventBooking.updateMany({
          where: { id: booking.id, status: "PENDING_PAYMENT" },
          data: { status: transaction_status === "expire" ? "EXPIRED" : "CANCELLED" },
        });
      }

      return NextResponse.json({ message: "OK" });
    }

    if (order_id.startsWith("POR-")) {
      const reservation = await prisma.preOrderReservation.findUnique({ where: { midtransOrderId: order_id } });
      if (!reservation) return NextResponse.json({ error: "Pre-order reservation not found" }, { status: 404 });
      if (Number(gross_amount) !== reservation.totalPrice) return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
      if (transaction_status === "capture" || transaction_status === "settlement") {
        await prisma.preOrderReservation.updateMany({ where: { id: reservation.id, status: "PENDING_PAYMENT" }, data: { status: "PAID", midtransTransactionId: transaction_id, paidAt: new Date() } });
      } else if (transaction_status === "deny" || transaction_status === "cancel" || transaction_status === "expire") {
        await prisma.$transaction(async (transaction) => {
          const changed = await transaction.preOrderReservation.updateMany({ where: { id: reservation.id, status: "PENDING_PAYMENT" }, data: { status: transaction_status === "expire" ? "EXPIRED" : "CANCELLED" } });
          if (changed.count) await transaction.preOrderCampaign.update({ where: { id: reservation.campaignId }, data: { reservedQuantity: { decrement: reservation.quantity } } });
        });
      }
      return NextResponse.json({ message: "OK" });
    }

    if (order_id.startsWith("SUBC-")) {
      const cycle = await prisma.subscriptionCycle.findUnique({ where: { midtransOrderId: order_id }, include: { subscription: { include: { plan: true } } } });
      if (!cycle) return NextResponse.json({ error: "Subscription cycle not found" }, { status: 404 });
      if (Number(gross_amount) !== cycle.amount) return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
      if (transaction_status === "capture" || transaction_status === "settlement") {
        await prisma.$transaction(async (transaction) => {
          const paid = await transaction.subscriptionCycle.updateMany({ where: { id: cycle.id, status: "PENDING_PAYMENT" }, data: { status: "PAID", midtransTransactionId: transaction_id, paidAt: new Date() } });
          if (!paid.count) return;
          await transaction.subscription.update({ where: { id: cycle.subscriptionId }, data: { status: "ACTIVE", nextBillingAt: cycle.periodEnd, nextDeliveryAt: cycle.periodStart } });
          await transaction.subscriptionDelivery.updateMany({ where: { cycleId: cycle.id, status: "SCHEDULED" }, data: { status: "PREPARING" } });
        });
      } else if (transaction_status === "deny" || transaction_status === "cancel" || transaction_status === "expire") {
        await prisma.$transaction(async (transaction) => {
          const changed = await transaction.subscriptionCycle.updateMany({ where: { id: cycle.id, status: "PENDING_PAYMENT" }, data: { status: transaction_status === "expire" ? "EXPIRED" : "CANCELLED" } });
          if (changed.count) await transaction.subscription.update({ where: { id: cycle.subscriptionId }, data: { status: "PAST_DUE" } });
        });
      }
      return NextResponse.json({ message: "OK" });
    }

    const order = await prisma.order.findUnique({
      where: { midtransOrderId: order_id },
      include: { items: true },
    });

    if (!order) {
      console.error("[Midtrans webhook] Order not found:", order_id);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (Number(gross_amount) !== order.total) {
      console.error("[Midtrans webhook] Product amount mismatch for", order_id);
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    if (transaction_status === "capture" && body.fraud_status && body.fraud_status !== "accept") {
      return NextResponse.json({ error: "Payment not accepted" }, { status: 400 });
    }

    if (transaction_status === "capture" || transaction_status === "settlement") {
      await settleOrderPayment(order, transaction_id);
      await sendOrderPaymentEmailIfNeeded(order.id);
    } else if (transaction_status === "pending") {
      await prisma.order.updateMany({
        where: { id: order.id, status: "PENDING_PAYMENT" },
        data: { status: "PENDING_PAYMENT" },
      });
    } else if (
      transaction_status === "deny" ||
      transaction_status === "cancel" ||
      transaction_status === "expire"
    ) {
      await prisma.order.updateMany({
        where: { id: order.id, status: "PENDING_PAYMENT" },
        data: { status: transaction_status === "expire" ? "EXPIRED" : "CANCELLED" },
      });
      await prisma.notification.create({
        data: {
          userId: order.userId,
          type: transaction_status === "expire" ? "ORDER_EXPIRED" : "ORDER_CANCELLED",
          title: transaction_status === "expire" ? "Pembayaran kedaluwarsa" : "Pembayaran dibatalkan",
          message: `Pembayaran pesanan ${order.orderNumber} tidak berhasil diproses.`,
          href: `/belanja/pesanan-saya/${order.id}`,
          relatedId: order.id,
        },
      });
      await prisma.$transaction(async (transaction) => {
        const cancelledOrder = await transaction.order.findUnique({
          where: { id: order.id },
          select: { status: true, pointsUsed: true, userId: true, userVoucherId: true },
        });
        if (!cancelledOrder || cancelledOrder.pointsUsed <= 0) return;
        await refundRedeemedPointsInTransaction(transaction, {
          userId: cancelledOrder.userId,
          points: cancelledOrder.pointsUsed,
          referenceId: order.id,
          idempotencyKey: `order-points-reversal:${order.id}`,
        });
        if (cancelledOrder.userVoucherId) {
          await transaction.userVoucher.updateMany({
            where: { id: cancelledOrder.userVoucherId, status: "USED" },
            data: { status: "AVAILABLE", usedAt: null },
          });
        }
      });
      if (transaction_status === "expire") {
        await sendOrderExpiredEmailIfNeeded(order.id);
      }
    }

    return NextResponse.json({ message: "OK" });
  } catch (error) {
    const statusCode =
      typeof error === "object" && error && "statusCode" in error && typeof error.statusCode === "number"
        ? error.statusCode
        : 500;

    if (statusCode === 409) {
      const detail =
        typeof error === "object" && error && "detail" in error && typeof error.detail === "string"
          ? error.detail
          : "Stok produk tidak cukup";
      return NextResponse.json({ error: detail }, { status: 409 });
    }

    console.error("[POST /api/webhooks/midtrans]", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
=======
export async function POST() {
  return NextResponse.json({ status: "disabled", message: "Pembayaran Midtrans sudah dinonaktifkan. Gunakan WhatsApp." }, { status: 410 });
>>>>>>> develop
}
