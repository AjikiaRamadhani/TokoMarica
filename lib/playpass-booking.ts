import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { awardPointsInTransaction, calculateEarnedPoints } from "@/lib/points";
import { consumeFnbStock } from "@/lib/fnb";

export const PLAYPASS_OPEN_MINUTES = 9 * 60;
export const PLAYPASS_CLOSE_MINUTES = 20 * 60;

export function parseDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseTimeInput(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function combineDateAndMinutes(dateInput: string, minutes: number) {
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return new Date(`${dateInput}T${hours}:${mins}:00+07:00`);
}

export function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB;
}

export async function getPlaypassSlotAvailability(packageId: string, dateInput: string) {
  const date = parseDateInput(dateInput);
  if (!date) return null;

  const packageData = await prisma.playpassPackage.findFirst({
    where: { id: packageId, isActive: true },
  });
  if (!packageData) return null;

  const now = new Date();
  const bookings = await prisma.playpassBooking.findMany({
    where: {
      packageId,
      visitDate: date,
      OR: [
        { status: "PAID" },
        { status: "PENDING_PAYMENT", expiresAt: { gt: now } },
      ],
    },
    select: { startTime: true, endTime: true, quantity: true },
  });

  const capacity = packageData.slotCapacity ?? 1;
  const slots = [];
  for (let minutes = PLAYPASS_OPEN_MINUTES; minutes < PLAYPASS_CLOSE_MINUTES; minutes += 30) {
    const endMinutes = minutes + packageData.durationMinutes;
    if (endMinutes > PLAYPASS_CLOSE_MINUTES) continue;
    const start = combineDateAndMinutes(dateInput, minutes);
    const end = combineDateAndMinutes(dateInput, endMinutes);
    const reserved = bookings
      .filter((booking) => overlaps(start, end, booking.startTime, booking.endTime))
      .reduce((sum, booking) => sum + booking.quantity, 0);
    slots.push({
      value: `${Math.floor(minutes / 60).toString().padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}`,
      label: `${formatTime(start)} - ${formatTime(end)}`,
      remaining: Math.max(0, capacity - reserved),
      available: reserved < capacity,
    });
  }

  return { package: packageData, slots };
}

export async function settlePlaypassBooking(bookingId: string, transactionId: string) {
  return prisma.$transaction(async (transaction) => {
    const booking = await transaction.playpassBooking.findUnique({
      where: { id: bookingId },
      include: { package: true, fnbItems: { select: { fnbProductId: true, quantity: true } } },
    });
    if (!booking) return null;

    const changed = await transaction.playpassBooking.updateMany({
      where: { id: booking.id, status: "PENDING_PAYMENT" },
      data: {
        status: "PAID",
        midtransTransactionId: null,
        paidAt: new Date(),
      },
    });
    if (changed.count === 0) return booking;

    await consumeFnbStock(transaction, booking.fnbItems);

    const existingTicket = await transaction.playpassTicket.findFirst({
      where: { bookingId: booking.id },
    });
    if (!existingTicket) {
      await transaction.playpassTicket.create({
        data: {
          ticketNumber: `${booking.bookingNumber}-1`,
          qrToken: crypto.randomUUID(),
          packageId: booking.packageId,
          bookingId: booking.id,
          customerId: booking.userId,
          cashierId: null,
          quantity: booking.quantity,
          total: booking.totalPrice,
          paymentMethod: "WHATSAPP",
          paidAmount: booking.totalPrice,
          changeAmount: 0,
          validFrom: booking.startTime,
          expiresAt: booking.endTime,
        },
      });
    }

    await awardPointsInTransaction(transaction, {
      userId: booking.userId,
      points: calculateEarnedPoints(booking.totalPrice),
      reason: `Pembayaran Playpass: ${booking.bookingNumber}`,
      referenceType: "PLAYPASS_BOOKING",
      referenceId: booking.id,
      idempotencyKey: `playpass-booking-paid:${booking.id}`,
    });

    return booking;
  });
}
