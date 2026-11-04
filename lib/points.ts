import { prisma } from "@/lib/prisma";

// Rp50.000 spending earns 1 Marica Point. Partial amounts are rounded down.
export const POINTS_PER_RUPIAH = 50_000;
export const RUPIAH_PER_POINT = 1;

type PointsTransactionClient = Pick<typeof prisma, "pointAccount" | "pointTransaction">;

export function calculateEarnedPoints(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;

  return Math.floor(amount / POINTS_PER_RUPIAH);
}

export function calculatePointsDiscount(points: number) {
  if (!Number.isInteger(points) || points <= 0) return 0;

  return points * RUPIAH_PER_POINT;
}

export async function refundRedeemedPointsInTransaction(
  transaction: PointsTransactionClient,
  input: {
    userId: string;
    points: number;
    referenceId: string;
    idempotencyKey: string;
  },
) {
  if (!Number.isInteger(input.points) || input.points <= 0) return null;

  const existingTransaction = await transaction.pointTransaction.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });

  if (existingTransaction) return existingTransaction;

  const account = await transaction.pointAccount.upsert({
    where: { userId: input.userId },
    update: {},
    create: { userId: input.userId },
  });

  await transaction.pointAccount.update({
    where: { id: account.id },
    data: { balance: { increment: input.points } },
  });

  return transaction.pointTransaction.create({
    data: {
      accountId: account.id,
      userId: input.userId,
      type: "REVERSAL",
      pointsDelta: input.points,
      reason: "Pengembalian poin karena pembayaran dibatalkan",
      referenceType: "ORDER",
      referenceId: input.referenceId,
      idempotencyKey: input.idempotencyKey,
    },
  });
}

export async function awardPointsInTransaction(
  transaction: PointsTransactionClient,
  input: {
    userId: string;
    points: number;
    reason: string;
    referenceType: string;
    referenceId: string;
    idempotencyKey: string;
  },
) {
  if (!Number.isInteger(input.points) || input.points <= 0) return null;

  const existingTransaction = await transaction.pointTransaction.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });

  if (existingTransaction) return existingTransaction;

  const account = await transaction.pointAccount.upsert({
    where: { userId: input.userId },
    update: {},
    create: { userId: input.userId },
  });

  await transaction.pointAccount.update({
    where: { id: account.id },
    data: { balance: { increment: input.points } },
  });

  return transaction.pointTransaction.create({
    data: {
      accountId: account.id,
      userId: input.userId,
      type: "EARN",
      pointsDelta: input.points,
      reason: input.reason,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      idempotencyKey: input.idempotencyKey,
    },
  });
}
