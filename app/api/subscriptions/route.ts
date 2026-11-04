import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addSubscriptionPeriod, subscriptionNumber } from "@/lib/subscription";
import { validateText, validatePhone, validatePostalCode, validateAddress } from "@/lib/request-validation";
import { buildManualPaymentWhatsAppUrl } from "@/lib/whatsapp-checkout";

type CreateBody = { planId?: string; childProfileId?: string; shippingName?: string; shippingPhone?: string; shippingAddress?: string; shippingCity?: string; shippingProvince?: string; shippingPostalCode?: string };

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await prisma.subscription.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, include: { plan: true, childProfile: true, cycles: { orderBy: { periodStart: "desc" }, include: { delivery: true } }, deliveries: { orderBy: { scheduledAt: "desc" } } } }));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  const userId = session.user.id;
  const email = session.user.email;
  try {
    const body = await request.json() as CreateBody;
    const fields = {
      planId: validateText(body.planId, "Paket subscription", 100),
      childProfileId: body.childProfileId === undefined ? { value: null } : validateText(body.childProfileId, "Profil anak", 100),
      shippingName: validateText(body.shippingName, "Nama penerima", 120),
      shippingPhone: validatePhone(body.shippingPhone, "Nomor WhatsApp"),
      shippingAddress: validateAddress(body.shippingAddress, "Alamat"),
      shippingCity: validateText(body.shippingCity, "Kota", 100),
      shippingProvince: validateText(body.shippingProvince, "Provinsi", 100),
      shippingPostalCode: validatePostalCode(body.shippingPostalCode, "Kode pos"),
    };
    const requiredFields = [fields.planId, fields.shippingName, fields.shippingPhone, fields.shippingAddress, fields.shippingCity, fields.shippingProvince, fields.shippingPostalCode];
    if (requiredFields.some((field) => field.error || typeof field.value !== "string") || ("error" in fields.childProfileId && fields.childProfileId.error)) return NextResponse.json({ error: "Data subscription belum lengkap atau tidak valid" }, { status: 400 });
    const plan = await prisma.subscriptionPlan.findFirst({ where: { id: fields.planId.value, isActive: true } });
    if (!plan) return NextResponse.json({ error: "Paket subscription tidak ditemukan" }, { status: 404 });
    const childProfile = fields.childProfileId.value
      ? await prisma.childProfile.findFirst({ where: { id: fields.childProfileId.value, userId, isActive: true } })
      : null;
    if (fields.childProfileId.value && !childProfile) return NextResponse.json({ error: "Profil anak tidak ditemukan atau tidak aktif" }, { status: 404 });
    const startDate = new Date();
    const periodEnd = addSubscriptionPeriod(startDate, plan.interval);
    const subscriptionNumberValue = subscriptionNumber();
    const cycleNumber = subscriptionNumber("SUBC");
    const deliveryNumber = subscriptionNumber("DEL");
    const { subscription, cycle } = await prisma.$transaction(async (tx) => {
      const createdSubscription = await tx.subscription.create({ data: { subscriptionNumber: subscriptionNumberValue, userId, planId: plan.id, childProfileId: fields.childProfileId.value, status: "PENDING_PAYMENT", startDate, nextBillingAt: periodEnd, nextDeliveryAt: startDate, shippingName: fields.shippingName.value as string, shippingPhone: fields.shippingPhone.value as string, shippingAddress: fields.shippingAddress.value as string, shippingCity: fields.shippingCity.value as string, shippingProvince: fields.shippingProvince.value as string, shippingPostalCode: fields.shippingPostalCode.value as string } });
      const createdCycle = await tx.subscriptionCycle.create({ data: { cycleNumber, subscriptionId: createdSubscription.id, periodStart: startDate, periodEnd, billingDueAt: startDate, amount: plan.price, status: "PENDING_PAYMENT" } });
      await tx.subscriptionDelivery.create({ data: { deliveryNumber, subscriptionId: createdSubscription.id, cycleId: createdCycle.id, scheduledAt: startDate, status: "SCHEDULED" } });
      return { subscription: createdSubscription, cycle: createdCycle };
    });
    const company = await prisma.companyProfile.findFirst({ select: { whatsapp: true } });
    const whatsappUrl = company?.whatsapp
      ? buildManualPaymentWhatsAppUrl(company.whatsapp, { reference: cycleNumber, customerName: fields.shippingName.value as string, total: plan.price, description: `Subscription ${plan.name}` })
      : null;
    if (!whatsappUrl) return NextResponse.json({ error: "Nomor WhatsApp pembayaran belum dikonfigurasi" }, { status: 503 });
    return NextResponse.json({ subscription, cycle, whatsappUrl, redirectUrl: whatsappUrl }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/subscriptions]", error);
    return NextResponse.json({ error: "Gagal membuat subscription" }, { status: 500 });
  }
}
