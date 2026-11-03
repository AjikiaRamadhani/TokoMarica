import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { refundRedeemedPointsInTransaction } from "@/lib/points";
import { addProductAvailability } from "@/lib/order-product-availability";
import { getTrackingUrl } from "@/lib/shipping-tracking";

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
