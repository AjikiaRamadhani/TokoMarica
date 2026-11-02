import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { snap } from "@/lib/midtrans";
import { calculatePointsDiscount, refundRedeemedPointsInTransaction } from "@/lib/points";
import {
  validateOptionalText,
  validateText,
  validateInteger,
  validatePhone,
  validatePostalCode,
  validateAddress,
} from "@/lib/request-validation";

function generateOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `ORD-${date}-${random}`;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      shippingName,
      shippingPhone,
      shippingAddress,
      shippingCity,
      shippingProvince,
      shippingPostalCode,
      shippingCourier,
      shippingService,
      shippingCost,
      checkoutProductId,
      redeemPoints,
      userVoucherId,
    } = body as {
      shippingName?: string;
      shippingPhone?: string;
      shippingAddress?: string;
      shippingCity?: string;
      shippingProvince?: string;
      shippingPostalCode?: string;
      shippingCourier?: string;
      shippingService?: string;
      shippingCost?: number;
      checkoutProductId?: string;
      redeemPoints?: number;
      userVoucherId?: string;
    };

    const shippingNameCheck = validateText(shippingName, "Nama pengirim", 120);
    const shippingPhoneCheck = validatePhone(shippingPhone, "Nomor telepon");
    const shippingAddressCheck = validateAddress(shippingAddress, "Alamat pengiriman");
    const shippingCityCheck = validateText(shippingCity, "Kota", 120);
    const shippingProvinceCheck = validateText(shippingProvince, "Provinsi", 120);
    const shippingPostalCodeCheck = validatePostalCode(shippingPostalCode, "Kode pos");
    const shippingCourierCheck = validateOptionalText(
      shippingCourier,
      "Kurir pengiriman",
      40,
    );
    const shippingServiceCheck = validateOptionalText(
      shippingService,
      "Layanan pengiriman",
      80,
    );
    const shippingCostCheck = validateInteger(shippingCost, "Biaya ongkir", 0);

    if (
      shippingNameCheck.error ||
      shippingPhoneCheck.error ||
      shippingAddressCheck.error ||
      shippingCityCheck.error ||
      shippingProvinceCheck.error ||
      shippingPostalCodeCheck.error ||
      shippingCourierCheck.error ||
      shippingServiceCheck.error ||
      shippingCostCheck.error ||
      typeof shippingNameCheck.value !== "string" ||
      typeof shippingPhoneCheck.value !== "string" ||
      typeof shippingAddressCheck.value !== "string" ||
      typeof shippingCityCheck.value !== "string" ||
      typeof shippingProvinceCheck.value !== "string" ||
      typeof shippingPostalCodeCheck.value !== "string" ||
      (shippingCourierCheck.value !== null &&
        typeof shippingCourierCheck.value !== "string") ||
      (shippingServiceCheck.value !== null &&
        typeof shippingServiceCheck.value !== "string") ||
      typeof shippingCostCheck.value !== "number"
    ) {
      const errorMessage =
        shippingNameCheck.error ??
        shippingPhoneCheck.error ??
        shippingAddressCheck.error ??
        shippingCityCheck.error ??
        shippingProvinceCheck.error ??
        shippingPostalCodeCheck.error ??
        shippingCourierCheck.error ??
        shippingServiceCheck.error ??
        shippingCostCheck.error ??
        "Data alamat pengiriman belum lengkap";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const shippingNameValue = shippingNameCheck.value;
    const shippingPhoneValue = shippingPhoneCheck.value;
    const shippingAddressValue = shippingAddressCheck.value;
    const shippingCityValue = shippingCityCheck.value;
    const shippingProvinceValue = shippingProvinceCheck.value;
    const shippingPostalCodeValue = shippingPostalCodeCheck.value;
    const shippingCourierValue = shippingCourierCheck.value;
    const shippingServiceValue = shippingServiceCheck.value;
    const shippingCostValue = shippingCostCheck.value;

    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: { product: { include: { images: { take: 1, orderBy: { order: "asc" } } } } },
        },
      },
    });

    const checkoutProductIdCheck = validateOptionalText(checkoutProductId, "Produk checkout", 100);
    if (checkoutProductIdCheck.error || (checkoutProductIdCheck.value !== null && typeof checkoutProductIdCheck.value !== "string")) {
      return NextResponse.json({ error: checkoutProductIdCheck.error ?? "Produk checkout tidak valid" }, { status: 400 });
    }

    const checkoutProductIdValue = checkoutProductIdCheck.value;
    const userVoucherCheck = validateOptionalText(userVoucherId, "Voucher", 100);
    if (userVoucherCheck.error || (userVoucherCheck.value !== null && typeof userVoucherCheck.value !== "string")) {
      return NextResponse.json({ error: userVoucherCheck.error ?? "Voucher tidak valid" }, { status: 400 });
    }
    const userVoucherIdValue = userVoucherCheck.value;
    const redeemPointsValue = redeemPoints === undefined ? 0 : redeemPoints;
    if (!Number.isInteger(redeemPointsValue) || redeemPointsValue < 0) {
      return NextResponse.json({ error: "Poin yang digunakan tidak valid" }, { status: 400 });
    }
    const checkoutItems = checkoutProductIdValue
      ? cart?.items.filter((item) => item.productId === checkoutProductIdValue) ?? []
      : cart?.items ?? [];

    if (!cart || checkoutItems.length === 0) {
      return NextResponse.json({ error: "Keranjang kosong" }, { status: 400 });
    }

    const orderNumber = generateOrderNumber();

    const checkoutResult = await prisma.$transaction(async (tx) => {
      const productIds = checkoutItems.map((item) => item.productId);
      const lockedProducts = await tx.$queryRaw<Array<{ id: string; name: string; stock: number; price: number }>>`
        SELECT id, name, stock
        , price
        FROM "products"
        WHERE id = ANY (${productIds})
        FOR UPDATE
      `;

      const stockMap = new Map(lockedProducts.map((product) => [product.id, product]));
      const shortage = checkoutItems.find((item) => {
        const product = stockMap.get(item.productId);
        return !product || product.stock < item.quantity;
      });

      if (shortage) {
        const product = stockMap.get(shortage.productId);
        const currentStock = product?.stock ?? 0;
        throw Object.assign(new Error("STOCK_SHORTAGE"), {
          statusCode: 400,
          detail: `Stok "${shortage.product.name}" tidak cukup, sisa ${currentStock}`,
        });
      }

      const subtotal = checkoutItems.reduce(
        (sum, item) => sum + (stockMap.get(item.productId)?.price ?? 0) * item.quantity,
        0,
      );
      const bundleIds = [...new Set(checkoutItems.map((item) => item.bundleId).filter((id): id is string => Boolean(id)))];
      const bundles = bundleIds.length
        ? await tx.productBundle.findMany({
            where: { id: { in: bundleIds }, isActive: true },
            include: { items: { select: { productId: true, product: { select: { price: true } } } } },
          })
        : [];
      let bundleDiscount = 0;
      const itemBundleDiscounts = new Map<string, number>();
      for (const bundle of bundles) {
        const bundleItems = checkoutItems.filter((item) => item.bundleId === bundle.id);
        const quantities = bundle.items.map(
          (bundleItem) => bundleItems.find((item) => item.productId === bundleItem.productId)?.quantity ?? 0,
        );
        const packageCount = quantities.length ? Math.min(...quantities) : 0;
        const regularBundlePrice = bundle.items.reduce((sum, item) => sum + item.product.price, 0);
        const discount = Math.max(0, regularBundlePrice - bundle.bundlePrice) * packageCount;
        bundleDiscount += discount;
        if (discount > 0 && bundle.items[0]) {
          const discountedItem = bundleItems.find((item) => item.productId === bundle.items[0].productId);
          if (discountedItem) itemBundleDiscounts.set(discountedItem.id, discount);
        }
      }
      const discountedSubtotal = subtotal - bundleDiscount;
      const totalBeforePoints = discountedSubtotal + shippingCostValue;
      let voucherDiscount = 0;
      if (userVoucherIdValue) {
        const userVoucher = await tx.userVoucher.findUnique({ where: { id: userVoucherIdValue }, include: { voucher: true } });
        if (!userVoucher || userVoucher.userId !== session.user.id || userVoucher.status !== "AVAILABLE" || !userVoucher.voucher.isActive || (userVoucher.voucher.expiresAt && userVoucher.voucher.expiresAt <= new Date())) {
          throw Object.assign(new Error("VOUCHER_UNAVAILABLE"), { statusCode: 400, detail: "Voucher tidak tersedia" });
        }
        voucherDiscount = Math.min(userVoucher.voucher.discountAmount, totalBeforePoints);
      }
      const requestedDiscount = calculatePointsDiscount(redeemPointsValue);
      const pointsDiscount = Math.min(requestedDiscount, totalBeforePoints - voucherDiscount);
      const pointsUsed = pointsDiscount;
      const total = totalBeforePoints - voucherDiscount - pointsDiscount;

      if (redeemPointsValue > pointsUsed) {
        throw Object.assign(new Error("INSUFFICIENT_POINTS"), {
          statusCode: 400,
          detail: "Saldo poin tidak cukup atau melebihi total pesanan",
        });
      }

      if (total <= 0) {
        throw Object.assign(new Error("INVALID_POINTS_TOTAL"), {
          statusCode: 400,
          detail: "Poin yang digunakan harus menyisakan minimal Rp1 untuk pembayaran",
        });
      }

      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: session.user.id,
          shippingName: shippingNameValue,
          shippingPhone: shippingPhoneValue,
          shippingAddress: shippingAddressValue,
          shippingCity: shippingCityValue,
          shippingProvince: shippingProvinceValue,
          shippingPostalCode: shippingPostalCodeValue,
          shippingCourier: shippingCourierValue,
          shippingService: shippingServiceValue,
          shippingCost: shippingCostValue,
          subtotal: discountedSubtotal,
          pointsUsed,
          pointsDiscount,
          userVoucherId: userVoucherIdValue,
          total,
          paymentMethod: "midtrans",
          midtransOrderId: orderNumber,
          items: {
            create: checkoutItems.map((item) => ({
              ...(stockMap.get(item.productId)
                ? {
                    productName: stockMap.get(item.productId)!.name,
                    price: stockMap.get(item.productId)!.price,
                  }
                : {
                    productName: item.product.name,
                    price: item.product.price,
                  }),
              productId: item.productId,
              productImageUrl: item.product.images[0]?.url,
              quantity: item.quantity,
              subtotal: Math.max(
                0,
                (stockMap.get(item.productId)?.price ?? item.product.price) * item.quantity -
                  (itemBundleDiscounts.get(item.id) ?? 0),
              ),
              bundleId: item.bundleId,
            })),
          },
        },
        include: { items: true },
      });

      if (pointsUsed > 0) {
        const account = await tx.pointAccount.upsert({
          where: { userId: session.user.id },
          update: {},
          create: { userId: session.user.id },
        });
        const changed = await tx.pointAccount.updateMany({
          where: { id: account.id, balance: { gte: pointsUsed } },
          data: { balance: { decrement: pointsUsed } },
        });
        if (changed.count !== 1) {
          throw Object.assign(new Error("INSUFFICIENT_POINTS"), {
            statusCode: 400,
            detail: "Saldo poin tidak cukup",
          });
        }
        await tx.pointTransaction.create({
          data: {
            accountId: account.id,
            userId: session.user.id,
            type: "REDEEM",
            pointsDelta: -pointsUsed,
            reason: `Redeem poin untuk pesanan ${orderNumber}`,
            referenceType: "ORDER",
            referenceId: order.id,
            idempotencyKey: `order-points-redeem:${order.id}`,
          },
        });
      }

      if (userVoucherIdValue) {
        const changedVoucher = await tx.userVoucher.updateMany({ where: { id: userVoucherIdValue, userId: session.user.id, status: "AVAILABLE" }, data: { status: "USED", usedAt: new Date() } });
        if (changedVoucher.count !== 1) throw Object.assign(new Error("VOUCHER_UNAVAILABLE"), { statusCode: 400, detail: "Voucher sudah digunakan" });
      }

      return { order, subtotal, total, pointsUsed, pointsDiscount, voucherDiscount };
    });

    const { order, total, pointsUsed, pointsDiscount, voucherDiscount } = checkoutResult;

    const itemDetailsBase = [
      ...order.items.map((item) => ({
        id: item.productId,
        // Use the effective line subtotal so Midtrans matches bundle discounts.
        price: item.subtotal,
        quantity: 1,
        name: `${item.productName} (${item.quantity}x)`.slice(0, 50),
      })),
      {
        id: "SHIPPING",
        price: shippingCostValue,
        quantity: 1,
        name: `Ongkir (${shippingCourier ?? "-"} ${shippingService ?? ""})`,
      },
    ];
    const itemDetailsBaseTotal = itemDetailsBase.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const bundleDiscount = Math.max(0, itemDetailsBaseTotal - total - pointsDiscount - voucherDiscount);
    const itemDetails = [
      ...itemDetailsBase,
      ...(bundleDiscount > 0
        ? [{ id: "BUNDLE_DISCOUNT", price: -bundleDiscount, quantity: 1, name: "Diskon Paket Hemat" }]
        : []),
      ...(pointsDiscount > 0
        ? [{ id: "POINTS_DISCOUNT", price: -pointsDiscount, quantity: 1, name: "Diskon Marica Points" }]
        : []),
      ...(voucherDiscount > 0
        ? [{ id: "VOUCHER_DISCOUNT", price: -voucherDiscount, quantity: 1, name: "Diskon Voucher Marica" }]
        : []),
    ];
    const itemDetailsTotal = itemDetails.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (itemDetailsTotal !== total) {
      console.error("[POST /api/checkout] Midtrans item total mismatch", {
        orderId: order.orderNumber,
        grossAmount: total,
        itemDetailsTotal,
      });
      throw Object.assign(new Error("MIDTRANS_ITEM_TOTAL_MISMATCH"), {
        statusCode: 400,
        detail: "Total item pesanan tidak sesuai dengan total pembayaran",
      });
    }

    // Minta Snap Token dari Midtrans
    let transaction;
    try {
      transaction = await snap.createTransaction({
        transaction_details: {
          order_id: orderNumber,
          gross_amount: total,
        },
        customer_details: {
          first_name: shippingNameValue,
          email: session.user.email ?? undefined,
          phone: shippingPhoneValue,
          shipping_address: {
            address: shippingAddressValue,
            city: shippingCityValue,
            postal_code: shippingPostalCodeValue,
          },
        },
        item_details: itemDetails,
      } as Parameters<typeof snap.createTransaction>[0]);

      await prisma.order.update({
        where: { id: order.id },
        // Kolom lama dipakai sebagai payment reference agar kompatibel dengan
        // order existing: token Midtrans atau URL Checkout Page/WhatsApp.
        data: { midtransSnapToken: transaction.token ?? transaction.redirect_url },
      });

      await prisma.notification.create({
        data: {
          userId: session.user.id,
          type: "ORDER_CREATED",
          title: "Pesanan berhasil dibuat",
          message: `Pesanan ${order.orderNumber} menunggu pembayaran.`,
          href: `/belanja/pesanan-saya/${order.id}`,
          relatedId: order.id,
        },
      });
    } catch (error) {
      await prisma.$transaction(async (tx) => {
        if (pointsUsed > 0) {
          await refundRedeemedPointsInTransaction(tx, {
            userId: session.user.id,
            points: pointsUsed,
            referenceId: order.id,
            idempotencyKey: `order-points-reversal:${order.id}`,
          });
        }
        if (userVoucherIdValue) {
          await tx.userVoucher.updateMany({
            where: { id: userVoucherIdValue, status: "USED" },
            data: { status: "AVAILABLE", usedAt: null },
          });
        }
        await tx.order.delete({ where: { id: order.id } });
      });
      throw error;
    }

    // Kosongin keranjang setelah order berhasil dibuat
    await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        ...(checkoutProductIdValue ? { productId: checkoutProductIdValue } : {}),
      },
    });

    return NextResponse.json(
      {
        order,
        snapToken: transaction.token,
        redirectUrl: transaction.redirect_url,
      },
      { status: 201 }
    );
  } catch (error) {
    const statusCode =
      typeof error === "object" && error && "statusCode" in error && typeof error.statusCode === "number"
        ? error.statusCode
        : 500;

    if (statusCode === 400) {
      const detail =
        typeof error === "object" && error && "detail" in error && typeof error.detail === "string"
          ? error.detail
          : "Stok produk tidak cukup";
      return NextResponse.json({ error: detail }, { status: 400 });
    }

    console.error("[POST /api/checkout]", error);
    const providerResponse = typeof error === "object" && error !== null && "ApiResponse" in error
      ? (error as { ApiResponse?: { status_code?: string; status_message?: string } }).ApiResponse
      : undefined;
    const errorCode = providerResponse?.status_code
      ? `PAYMENT_PROVIDER_${providerResponse.status_code}`
      : typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
        ? `PRISMA_${error.code}`
      : error instanceof Error && error.message === "MIDTRANS_ITEM_TOTAL_MISMATCH"
        ? "MIDTRANS_ITEM_TOTAL_MISMATCH"
        : error instanceof Error && error.message.includes("Invalid server key")
          ? "MIDTRANS_INVALID_SERVER_KEY"
          : "CHECKOUT_INTERNAL_ERROR";
    const detail = error instanceof Error ? error.message : "Kesalahan checkout tidak diketahui";
    const debugCheckout = process.env.CHECKOUT_DEBUG_ERRORS === "true";
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === "production"
          ? "Gagal memproses checkout"
          : `Gagal memproses checkout: ${detail}`,
        errorCode,
        ...(providerResponse?.status_message ? { providerMessage: providerResponse.status_message } : {}),
        ...(debugCheckout
          ? {
              debug: {
                name: error instanceof Error ? error.name : typeof error,
                message: detail.slice(0, 500),
              },
            }
          : {}),
      },
      { status: 500 },
    );
  }
}
