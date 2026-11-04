import { prisma } from "@/lib/prisma";
import { awardPointsInTransaction, calculateEarnedPoints } from "@/lib/points";
import { changeInventoryQuantity } from "@/lib/inventory-stock";

type OrderToSettle = {
  id: string;
  userId: string;
  orderNumber: string;
  total: number;
  items: Array<{ productId: string | null; quantity: number }>;
};

/**
 * Finalizes a verified payment exactly once. For the WhatsApp/manual flow,
 * this is called by the admin after payment is verified.
 */
export async function settleOrderPayment(
  order: OrderToSettle,
  transactionId: string,
) {
  await prisma.$transaction(async (transaction) => {
    const lockedOrders = await transaction.$queryRaw<Array<{ id: string; status: string }>>`
      SELECT id, status
      FROM "orders"
      WHERE id = ${order.id}
      FOR UPDATE
    `;

    // Midtrans can send the same notification more than once.
    if (lockedOrders.length === 0 || lockedOrders[0].status !== "PENDING_PAYMENT") {
      return;
    }

    const validItems = order.items.filter(
      (item): item is { productId: string; quantity: number } => Boolean(item.productId),
    );
    if (validItems.length !== order.items.length) {
      throw Object.assign(new Error("PRODUCT_UNAVAILABLE"), {
        statusCode: 409,
        detail: `Produk pada pesanan ${order.orderNumber} sudah tidak tersedia`,
      });
    }

    const productIds = validItems.map((item) => item.productId);
    const lockedProducts = await transaction.$queryRaw<
      Array<{ id: string; stock: number }>
    >`
      SELECT p.id, i.quantity AS stock
      FROM "products" p
      INNER JOIN "product_inventories" i ON i."productId" = p.id
      WHERE p.id = ANY (${productIds})
        AND i.location = 'ONLINE_WAREHOUSE'::"InventoryLocation"
      FOR UPDATE OF p, i
    `;

    const stockMap = new Map(lockedProducts.map((product) => [product.id, product.stock]));
    const shortage = validItems.find(
      (item) => (stockMap.get(item.productId) ?? 0) < item.quantity,
    );

    if (shortage) {
      throw Object.assign(new Error("STOCK_SHORTAGE"), {
        statusCode: 409,
        detail: `Stok produk tidak cukup untuk pesanan ${order.orderNumber}`,
      });
    }

    const paidOrder = await transaction.order.updateMany({
      where: { id: order.id, status: "PENDING_PAYMENT" },
      data: {
        status: "PAID",
        midtransTransactionId: null,
        paidAt: new Date(),
      },
    });

    if (paidOrder.count === 0) return;

    for (const item of validItems) {
      await changeInventoryQuantity(
        transaction,
        item.productId,
        "ONLINE_WAREHOUSE",
        -item.quantity,
      );
      await transaction.product.update({
        where: { id: item.productId },
        data: { soldCount: { increment: item.quantity } },
      });
    }

    await transaction.inventoryMovement.createMany({
      data: validItems.map((item) => ({
        productId: item.productId,
        orderId: order.id,
        location: "ONLINE_WAREHOUSE" as const,
        type: "SALE" as const,
        quantityDelta: -item.quantity,
        reason: "Pembayaran pesanan terverifikasi admin",
        referenceId: transactionId,
      })),
    });

    await transaction.recommendationEvent.createMany({
      data: validItems.map((item) => ({
        userId: order.userId,
        productId: item.productId,
        type: "PURCHASE" as const,
      })),
    });

    await awardPointsInTransaction(transaction, {
      userId: order.userId,
      points: calculateEarnedPoints(order.total),
      reason: `Pembayaran pesanan: ${order.orderNumber}`,
      referenceType: "ORDER",
      referenceId: order.id,
      idempotencyKey: `order-paid:${order.id}`,
    });
  });
}
