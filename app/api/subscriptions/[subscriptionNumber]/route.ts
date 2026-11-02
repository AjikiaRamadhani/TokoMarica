import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { coreApi } from "@/lib/midtrans";

type MidtransStatus = {
  transaction_status?: string;
  transaction_id?: string;
  gross_amount?: string;
  fraud_status?: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subscriptionNumber: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { subscriptionNumber } = await params;
  const subscriptionRecord = await prisma.subscription.findFirst({
    where: { subscriptionNumber, userId: session.user.id },
    include: { plan: true, childProfile: true, cycles: { orderBy: { periodStart: "desc" }, include: { delivery: true } } },
  });
  if (!subscriptionRecord) return NextResponse.json({ error: "Subscription tidak ditemukan" }, { status: 404 });
  let subscription = subscriptionRecord;

  const cycle = subscription.cycles.find((item) =>
    item.status === "PENDING_PAYMENT" &&
    item.midtransOrderId &&
    item.midtransSnapToken &&
    !item.midtransSnapToken.startsWith("http"),
  );
  if (cycle) {
    try {
      const transactionApi = (coreApi as unknown as {
        transaction: { status: (transactionId: string) => Promise<unknown> };
      }).transaction;
      const payment = (await transactionApi.status(cycle.midtransOrderId as string)) as MidtransStatus;
      const isPaid =
        payment.transaction_status === "settlement" ||
        (payment.transaction_status === "capture" && payment.fraud_status !== "deny");
      if (isPaid && (!payment.gross_amount || Number(payment.gross_amount) === cycle.amount)) {
        await prisma.$transaction(async (transaction) => {
          const changed = await transaction.subscriptionCycle.updateMany({
            where: { id: cycle.id, status: "PENDING_PAYMENT" },
            data: { status: "PAID", midtransTransactionId: payment.transaction_id ?? cycle.midtransOrderId, paidAt: new Date() },
          });
          if (!changed.count) return;
          await transaction.subscription.update({
            where: { id: subscription.id },
            data: { status: "ACTIVE", nextBillingAt: cycle.periodEnd, nextDeliveryAt: cycle.periodStart },
          });
          await transaction.subscriptionDelivery.updateMany({
            where: { cycleId: cycle.id, status: "SCHEDULED" },
            data: { status: "PREPARING" },
          });
        });
        const refreshedSubscription = await prisma.subscription.findUnique({
          where: { id: subscription.id },
          include: { plan: true, childProfile: true, cycles: { orderBy: { periodStart: "desc" }, include: { delivery: true } } },
        });
        if (refreshedSubscription) subscription = refreshedSubscription;
      }
    } catch (error) {
      console.error("[GET /api/subscriptions/[subscriptionNumber] payment sync]", error);
    }
  }
  return NextResponse.json(subscription);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ subscriptionNumber: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { subscriptionNumber } = await params;
  const body = await request.json() as { action?: "PAUSE" | "RESUME" | "CANCEL" | "SKIP" };
  const subscription = await prisma.subscription.findFirst({ where: { subscriptionNumber, userId: session.user.id } });
  if (!subscription) return NextResponse.json({ error: "Subscription tidak ditemukan" }, { status: 404 });
  if (body.action === "PAUSE") {
    if (!["ACTIVE", "PAST_DUE"].includes(subscription.status)) return NextResponse.json({ error: "Subscription tidak dapat dipause" }, { status: 409 });
    return NextResponse.json(await prisma.subscription.update({ where: { id: subscription.id }, data: { status: "PAUSED" } }));
  }
  if (body.action === "RESUME") {
    if (subscription.status !== "PAUSED") return NextResponse.json({ error: "Subscription tidak sedang dipause" }, { status: 409 });
    return NextResponse.json(await prisma.subscription.update({ where: { id: subscription.id }, data: { status: "ACTIVE", pausedUntil: null } }));
  }
  if (body.action === "CANCEL") return NextResponse.json(await prisma.subscription.update({ where: { id: subscription.id }, data: { status: "CANCELLED", cancelledAt: new Date() } }));
  if (body.action === "SKIP") {
    if (subscription.status !== "ACTIVE") return NextResponse.json({ error: "Hanya subscription aktif yang dapat melewati cycle" }, { status: 409 });
    const cycle = await prisma.subscriptionCycle.findFirst({ where: { subscriptionId: subscription.id, status: "PENDING_PAYMENT" }, orderBy: { periodStart: "asc" }, include: { delivery: true } });
    if (!cycle) return NextResponse.json({ error: "Tidak ada cycle mendatang yang dapat dilewati" }, { status: 409 });
    const result = await prisma.$transaction(async (tx) => {
      await tx.subscriptionCycle.update({ where: { id: cycle.id }, data: { status: "SKIPPED" } });
      if (cycle.delivery) await tx.subscriptionDelivery.update({ where: { id: cycle.delivery.id }, data: { status: "SKIPPED" } });
      return tx.subscription.update({ where: { id: subscription.id }, data: { nextBillingAt: cycle.periodEnd, nextDeliveryAt: cycle.periodEnd } });
    });
    return NextResponse.json(result);
  }
  return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });
}
