import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculatePointsDiscount } from "@/lib/points";
import {
  buildCheckoutWhatsAppUrl,
  normalizeWhatsAppNumber,
} from "@/lib/whatsapp-checkout";
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
    const company = await prisma.companyProfile.findFirst({
      select: { whatsapp: true },
    });
    if (!company?.whatsapp) {
      return NextResponse.json(
        { error: "Nomor WhatsApp checkout belum dikonfigurasi oleh admin" },
        { status: 503 },
      );
    }
    const checkoutWhatsAppNumber = normalizeWhatsAppNumber(company.whatsapp);
    if (!checkoutWhatsAppNumber) {
      return NextResponse.json(
        { error: "Nomor WhatsApp checkout belum valid" },
        { status: 503 },
      );
    }

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

    const { order } = await prisma.$transaction(async (tx) => {
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
          paymentMethod: "whatsapp",
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

    // Kosongin keranjang setelah order berhasil dibuat
    await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        ...(checkoutProductIdValue ? { productId: checkoutProductIdValue } : {}),
      },
    });

    const whatsappUrl = buildCheckoutWhatsAppUrl(checkoutWhatsAppNumber, order);
    if (!whatsappUrl) {
      throw Object.assign(new Error("WHATSAPP_NUMBER_INVALID"), {
        statusCode: 503,
        detail: "Nomor WhatsApp checkout tidak valid",
      });
    }

    return NextResponse.json({ order, whatsappUrl }, { status: 201 });
  } catch (error) {
    const statusCode =
      typeof error === "object" && error && "statusCode" in error && typeof error.statusCode === "number"
        ? error.statusCode
        : 500;

    if (statusCode === 400 || statusCode === 503) {
      const detail =
        typeof error === "object" && error && "detail" in error && typeof error.detail === "string"
          ? error.detail
          : "Stok produk tidak cukup";
      return NextResponse.json({ error: detail }, { status: statusCode });
    }

    console.error("[POST /api/checkout]", error);
    return NextResponse.json({ error: "Gagal memproses checkout" }, { status: 500 });
  }
}
