import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addSubscriptionPeriod, subscriptionNumber } from "@/lib/subscription";
import { buildManualPaymentWhatsAppUrl } from "@/lib/whatsapp-checkout";

export const dynamic = "force-dynamic";

async function runScheduler(request: Request) {
  const expectedSecret = process.env.SUBSCRIPTION_CRON_SECRET ?? process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  const providedSecret = request.headers.get("x-cron-secret") ?? authorization?.replace(/^Bearer\s+/i, "");
  if (!expectedSecret || providedSecret !== expectedSecret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const dueSubscriptions = await prisma.subscription.findMany({
    where: { status: "ACTIVE", nextBillingAt: { lte: now } },
    include: { plan: true, user: { select: { email: true, name: true, whatsapp: true } } },
    take: 100,
  });
  const results: { subscriptionNumber: string; cycleNumber?: string; status: string; whatsappUrl?: string | null }[] = [];

  for (const subscription of dueSubscriptions) {
    const periodStart = subscription.nextBillingAt;
    const periodEnd = addSubscriptionPeriod(periodStart, subscription.plan.interval);
    const cycleNumber = subscriptionNumber("SUBC");
    const deliveryNumber = subscriptionNumber("DEL");
    try {
      const cycle = await prisma.$transaction(async (transaction) => {
        const existing = await transaction.subscriptionCycle.findFirst({ where: { subscriptionId: subscription.id, periodStart, status: "PENDING_PAYMENT" } });
        if (existing) return existing;
        const created = await transaction.subscriptionCycle.create({ data: { cycleNumber, subscriptionId: subscription.id, periodStart, periodEnd, billingDueAt: periodStart, amount: subscription.plan.price, status: "PENDING_PAYMENT" } });
        await transaction.subscriptionDelivery.create({ data: { deliveryNumber, subscriptionId: subscription.id, cycleId: created.id, scheduledAt: periodStart, status: "SCHEDULED" } });
        await transaction.subscription.update({ where: { id: subscription.id }, data: { nextBillingAt: periodEnd, nextDeliveryAt: periodStart } });
        return created;
      });
      if (cycle.cycleNumber !== cycleNumber) {
        results.push({ subscriptionNumber: subscription.subscriptionNumber, cycleNumber: cycle.cycleNumber, status: "already_created" });
        continue;
      }
      const company = await prisma.companyProfile.findFirst({ select: { whatsapp: true } });
      const whatsappUrl = company?.whatsapp
        ? buildManualPaymentWhatsAppUrl(company.whatsapp, { reference: cycle.cycleNumber, customerName: subscription.user.name ?? subscription.shippingName, total: subscription.plan.price, description: `Tagihan subscription ${subscription.plan.name}` })
        : null;
      results.push({ subscriptionNumber: subscription.subscriptionNumber, cycleNumber: cycle.cycleNumber, status: "created", whatsappUrl });
    } catch (error) {
      console.error("[POST /api/cron/subscriptions]", subscription.subscriptionNumber, error);
      results.push({ subscriptionNumber: subscription.subscriptionNumber, status: "failed" });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}

export async function GET(request: Request) {
  return runScheduler(request);
}

export async function POST(request: Request) {
  return runScheduler(request);
}
