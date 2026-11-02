import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { coreApi, snap } from "@/lib/midtrans";
import { settleOrderPayment } from "@/lib/settle-order-payment";
import { refundRedeemedPointsInTransaction } from "@/lib/points";
import { addProductAvailability } from "@/lib/order-product-availability";
import { sendOrderPaymentEmailIfNeeded } from "@/lib/order-mailer";
import { getTrackingUrl } from "@/lib/shipping-tracking";

type MidtransStatus = {
  transaction_status?: string;
  transaction_id?: string;
  gross_amount?: string;
  fraud_status?: string;
};

function isMidtransTransactionNotFound(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { httpStatusCode?: number; ApiResponse?: { status_code?: string } };
  return value.httpStatusCode === 404 || value.ApiResponse?.status_code === "404";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order || (order.userId !== session.user.id && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    const [enrichedOrder] = await addProductAvailability([order]);
    return NextResponse.json({
      ...enrichedOrder,
      trackingUrl: getTrackingUrl(order.shippingCourier, order.trackingNumber),
    });
  } catch (error) {
    console.error("[GET /api/orders/[id]]", error);
    return NextResponse.json({ error: "Gagal mengambil detail pesanan" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.userId !== session.user.id) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    if (body.action === "confirm_delivery") {
      if (order.status !== "SHIPPED") {
        return NextResponse.json({ error: "Pesanan belum berstatus dikirim" }, { status: 409 });
      }

      const delivered = await prisma.order.update({
        where: { id: order.id, status: "SHIPPED" },
        data: { status: "DELIVERED", deliveredAt: new Date() },
        include: { items: true },
      });
      await prisma.notification.create({
        data: {
          userId: order.userId,
          type: "ORDER_DELIVERED",
          title: "Pesanan telah diterima",
          message: `Pesanan ${order.orderNumber} sudah ditandai diterima. Yuk beri rating untuk produkmu.`,
          href: `/belanja/pesanan-saya/${order.id}`,
          relatedId: order.id,
        },
      });
      const [enrichedOrder] = await addProductAvailability([delivered]);
      return NextResponse.json({
        ...enrichedOrder,
        trackingUrl: getTrackingUrl(delivered.shippingCourier, delivered.trackingNumber),
      });
    }

    if (body.action !== "cancel") {
      return NextResponse.json({ error: "Aksi pesanan tidak valid" }, { status: 400 });
    }

    if (order.status !== "PENDING_PAYMENT") {
      return NextResponse.json(
        { error: "Pesanan hanya bisa dibatalkan sebelum pembayaran dan proses dimulai" },
        { status: 409 },
      );
    }

    const updated = await prisma.$transaction(async (transaction) => {
      const updatedOrder = await transaction.order.update({
        where: { id: order.id, status: "PENDING_PAYMENT" },
        data: { status: "CANCELLED" },
        include: { items: true },
      });

      await refundRedeemedPointsInTransaction(transaction, {
        userId: updatedOrder.userId,
        points: updatedOrder.pointsUsed,
        referenceId: updatedOrder.id,
        idempotencyKey: `order-points-reversal:${updatedOrder.id}`,
      });
      if (updatedOrder.userVoucherId) {
        await transaction.userVoucher.updateMany({
          where: { id: updatedOrder.userVoucherId, status: "USED" },
          data: { status: "AVAILABLE", usedAt: null },
        });
      }

      return updatedOrder;
    });

    const [enrichedOrder] = await addProductAvailability([updated]);
    return NextResponse.json({
      ...enrichedOrder,
      trackingUrl: getTrackingUrl(updated.shippingCourier, updated.trackingNumber),
    });
  } catch (error) {
    console.error("[PATCH /api/orders/[id]]", error);
    return NextResponse.json({ error: "Gagal membatalkan pesanan" }, { status: 500 });
  }
}

// Memastikan status pembayaran langsung ke Midtrans. Ini menjadi fallback
// untuk lingkungan lokal/Sandbox ketika webhook tidak dapat mengakses localhost.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, user: { select: { email: true } } },
    });

    if (!order || order.userId !== session.user.id) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    if (order.status !== "PENDING_PAYMENT") {
      return NextResponse.json(await addProductAvailability([order]).then(([item]) => item));
    }

    const hasLegacyWhatsAppFallback = order.midtransSnapToken?.startsWith("https://wa.me/") ?? false;
    if (!order.midtransSnapToken || hasLegacyWhatsAppFallback) {
      const paymentReference = order.midtransOrderId || order.orderNumber;
      const transaction = await snap.createTransaction({
        transaction_details: { order_id: paymentReference, gross_amount: order.total },
        customer_details: { first_name: order.shippingName, email: order.user.email ?? undefined, phone: order.shippingPhone },
        item_details: order.items.map((item) => ({ id: item.productId || item.id, price: item.price, quantity: item.quantity, name: item.productName.slice(0, 50) })),
      });
      const refreshed = await prisma.order.update({ where: { id: order.id }, data: { midtransOrderId: paymentReference, midtransSnapToken: transaction.token ?? transaction.redirect_url }, include: { items: true } });
      return NextResponse.json(await addProductAvailability([refreshed]).then(([item]) => item));
    }

    if (!order.midtransOrderId) {
      return NextResponse.json({ error: "Referensi pembayaran tidak ditemukan" }, { status: 400 });
    }

    // WinPay Checkout Page dan fallback WhatsApp tidak memiliki Snap token.
    // Statusnya menunggu callback WinPay atau konfirmasi manual via WhatsApp.
    if (order.midtransSnapToken?.startsWith("http")) {
      return NextResponse.json(await addProductAvailability([order]).then(([item]) => item));
    }

    const transactionApi = (
      coreApi as unknown as {
        transaction: { status: (transactionId: string) => Promise<unknown> };
      }
    ).transaction;
    let payment: MidtransStatus;
    try {
      payment = (await transactionApi.status(order.midtransOrderId)) as MidtransStatus;
    } catch (statusError) {
      // Order lama bisa memiliki reference/token dari environment Midtrans
      // berbeda. Jika transaksi tidak ditemukan, buat ulang Snap transaction
      // agar user tetap bisa melanjutkan pembayaran dari order yang sama.
      if (!isMidtransTransactionNotFound(statusError)) throw statusError;

      const transaction = await snap.createTransaction({
        transaction_details: { order_id: order.midtransOrderId, gross_amount: order.total },
        customer_details: {
          first_name: order.shippingName,
          email: order.user.email ?? undefined,
          phone: order.shippingPhone,
        },
        item_details: order.items.map((item) => ({
          id: item.productId || item.id,
          price: item.price,
          quantity: item.quantity,
          name: item.productName.slice(0, 50),
        })),
      });
      const refreshed = await prisma.order.update({
        where: { id: order.id },
        data: { midtransSnapToken: transaction.token ?? transaction.redirect_url },
        include: { items: true },
      });
      return NextResponse.json(await addProductAvailability([refreshed]).then(([item]) => item));
    }
    const isPaid =
      payment.transaction_status === "settlement" ||
      (payment.transaction_status === "capture" && payment.fraud_status !== "deny");

    if (isPaid) {
      if (payment.gross_amount && Number(payment.gross_amount) !== order.total) {
        return NextResponse.json({ error: "Nominal pembayaran tidak sesuai" }, { status: 400 });
      }

      await settleOrderPayment(
        order,
        payment.transaction_id ?? order.midtransOrderId,
      );
      await sendOrderPaymentEmailIfNeeded(order.id);
    }

    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    });
    const result = updated ?? order;
    return NextResponse.json(await addProductAvailability([result]).then(([item]) => item));
  } catch (error) {
    console.error("[POST /api/orders/[id]]", error);
    return NextResponse.json(
      { error: "Status pembayaran belum dapat diverifikasi" },
      { status: 502 },
    );
  }
}
