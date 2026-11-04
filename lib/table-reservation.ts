import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { awardPointsInTransaction, calculateEarnedPoints } from "@/lib/points";
import { consumeFnbStock } from "@/lib/fnb";
import {
  PLAYPASS_CLOSE_MINUTES,
  PLAYPASS_OPEN_MINUTES,
  combineDateAndMinutes,
  dateKey,
  formatTime,
  overlaps,
  parseDateInput,
  parseTimeInput,
} from "@/lib/playpass-booking";

export { combineDateAndMinutes, dateKey, formatTime, parseDateInput, parseTimeInput };

export async function getTableReservationAvailability(packageId: string, dateInput: string) {
  const date = parseDateInput(dateInput);
  if (!date) return null;
  const packageData = await prisma.tableFeePackage.findFirst({ where: { id: packageId, isActive: true } });
  if (!packageData) return null;

  const reservations = await prisma.tableReservation.findMany({
    where: {
      packageId,
      visitDate: date,
      OR: [
        { status: { in: ["PAID", "CHECKED_IN"] } },
        { status: "PENDING_PAYMENT", expiresAt: { gt: new Date() } },
      ],
    },
    select: { startTime: true, endTime: true },
  });

  const capacity = packageData.slotCapacity ?? 1;
  const slots = [];
  for (let minutes = PLAYPASS_OPEN_MINUTES; minutes < PLAYPASS_CLOSE_MINUTES; minutes += 30) {
    const endMinutes = minutes + packageData.durationMinutes;
    if (endMinutes > PLAYPASS_CLOSE_MINUTES) continue;
    const start = combineDateAndMinutes(dateInput, minutes);
    const end = combineDateAndMinutes(dateInput, endMinutes);
    const reserved = reservations.filter((reservation) => overlaps(start, end, reservation.startTime, reservation.endTime)).length;
    slots.push({
      value: `${Math.floor(minutes / 60).toString().padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}`,
      label: `${formatTime(start)} - ${formatTime(end)}`,
      remaining: Math.max(0, capacity - reserved),
      available: reserved < capacity,
    });
  }
  return { package: packageData, slots };
}

export async function settleTableReservation(reservationId: string, transactionId: string) {
  return prisma.$transaction(async (transaction) => {
    const reservation = await transaction.tableReservation.findUnique({ where: { id: reservationId }, include: { package: true, fnbItems: { select: { fnbProductId: true, quantity: true } } } });
    if (!reservation) return null;
    const changed = await transaction.tableReservation.updateMany({
      where: { id: reservation.id, status: "PENDING_PAYMENT" },
      data: { status: "PAID", midtransTransactionId: null, paidAt: new Date() },
    });
    if (changed.count === 0) return reservation;
    await consumeFnbStock(transaction, reservation.fnbItems);
    await awardPointsInTransaction(transaction, {
      userId: reservation.userId,
      points: calculateEarnedPoints(reservation.totalPrice),
      reason: `Pembayaran reservasi meja: ${reservation.reservationNumber}`,
      referenceType: "TABLE_RESERVATION",
      referenceId: reservation.id,
      idempotencyKey: `table-reservation-paid:${reservation.id}`,
    });
    return reservation;
  });
}

export function reservationNumber() {
  return `TBL-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}
