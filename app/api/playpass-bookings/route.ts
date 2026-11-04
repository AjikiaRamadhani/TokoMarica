import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditAction } from "@/lib/audit";
import { getPlaypassSlotAvailability, combineDateAndMinutes, dateKey, parseDateInput, parseTimeInput } from "@/lib/playpass-booking";
import { sendPlaypassTicketEmailIfNeeded } from "@/lib/playpass-ticket-mailer";
import { validateInteger, validatePhone, validateText } from "@/lib/request-validation";
import crypto from "crypto";
import { consumeFnbStock, normalizeParticipants, resolveFnbItems } from "@/lib/fnb";
import { buildManualPaymentWhatsAppUrl } from "@/lib/whatsapp-checkout";

function bookingNumber() {
  return `PPB-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  const bookings = await prisma.playpassBooking.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { package: true, tickets: true, fnbItems: { include: { fnbProduct: true } }, participants: true },
  });
  return NextResponse.json(bookings);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });

  try {
    const body = (await request.json()) as { packageId?: string; date?: string; startTime?: string; quantity?: number; customerPhone?: string; participants?: unknown; fnbItems?: Array<{ productId: string; quantity: number }> };
    const packageId = validateText(body.packageId, "Paket Playpass", 100);
    const date = validateText(body.date, "Tanggal kunjungan", 20);
    const startTime = validateText(body.startTime, "Jam kunjungan", 10);
    const quantity = validateInteger(body.quantity ?? 1, "Jumlah tiket", 1);
    const phone = body.customerPhone === undefined || body.customerPhone === "" ? { value: null as string | null } : validatePhone(body.customerPhone, "Nomor WhatsApp");
    if (packageId.error || date.error || startTime.error || quantity.error || ("error" in phone && phone.error) || typeof packageId.value !== "string" || typeof date.value !== "string" || typeof startTime.value !== "string" || typeof quantity.value !== "number") {
      return NextResponse.json({ error: "Data booking Playpass tidak valid" }, { status: 400 });
    }
    const participants = normalizeParticipants(body.participants);
    if (participants.length > quantity.value) return NextResponse.json({ error: "Jumlah peserta melebihi jumlah tiket" }, { status: 400 });
    const fnb = await resolveFnbItems(body.fnbItems);

    const dateObject = parseDateInput(date.value);
    const startMinutes = parseTimeInput(startTime.value);
    if (!dateObject || startMinutes === null || dateKey(dateObject) !== date.value || date.value < dateKey(new Date())) {
      return NextResponse.json({ error: "Tanggal atau jam kunjungan tidak valid" }, { status: 400 });
    }

    const availability = await getPlaypassSlotAvailability(packageId.value, date.value);
    const selectedSlot = availability?.slots.find((slot) => slot.value === startTime.value);
    if (!availability || !selectedSlot || !selectedSlot.available) return NextResponse.json({ error: "Slot Playpass sudah penuh atau tidak tersedia" }, { status: 409 });
    if (quantity.value > availability.package.maxParticipants || quantity.value > selectedSlot.remaining) return NextResponse.json({ error: "Jumlah tiket melebihi kapasitas slot" }, { status: 409 });

    const endMinutes = startMinutes + availability.package.durationMinutes;
    const start = combineDateAndMinutes(date.value, startMinutes);
    const end = combineDateAndMinutes(date.value, endMinutes);
    const number = bookingNumber();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const booking = await prisma.playpassBooking.create({
      data: {
        bookingNumber: number,
        userId: session.user.id,
        packageId: availability.package.id,
        customerName: session.user.name ?? "Pelanggan Marica",
        customerEmail: session.user.email,
        customerPhone: phone.value,
        visitDate: dateObject,
        startTime: start,
        endTime: end,
        quantity: quantity.value,
        totalPrice: availability.package.price * quantity.value + fnb.total,
        status: availability.package.price * quantity.value + fnb.total > 0 ? "PENDING_PAYMENT" : "PAID",
        expiresAt: availability.package.price * quantity.value + fnb.total > 0 ? expiresAt : null,
        fnbItems: { create: fnb.items },
        participants: { create: participants.map((participant) => ({ name: participant.name, age: participant.age, relationship: participant.relationship })) },
      },
    });

    if (booking.totalPrice === 0) {
      await prisma.$transaction(async (tx) => {
        await tx.playpassBooking.update({ where: { id: booking.id }, data: { paidAt: new Date() } });
        await consumeFnbStock(tx, fnb.items);
        await tx.playpassTicket.create({ data: { ticketNumber: `${booking.bookingNumber}-1`, packageId: booking.packageId, bookingId: booking.id, customerId: booking.userId, cashierId: null, quantity: booking.quantity, total: 0, paymentMethod: "FREE", paidAmount: 0, changeAmount: 0, validFrom: booking.startTime, expiresAt: booking.endTime } });
      });
      await sendPlaypassTicketEmailIfNeeded(booking.id);
      return NextResponse.json({ booking, redirectUrl: `/playpass/tiket/${booking.bookingNumber}` }, { status: 201 });
    }

    const company = await prisma.companyProfile.findFirst({ select: { whatsapp: true } });
    const whatsappUrl = company?.whatsapp
      ? buildManualPaymentWhatsAppUrl(company.whatsapp, { reference: number, customerName: booking.customerName, total: booking.totalPrice, description: `Playpass ${availability.package.name}` })
      : null;
    if (!whatsappUrl) return NextResponse.json({ error: "Nomor WhatsApp pembayaran belum dikonfigurasi" }, { status: 503 });
    auditAction({ action: "playpass_booking_created", status: "success", payload: { bookingNumber: number, packageId, userId: session.user.id } });
    return NextResponse.json({ booking, whatsappUrl, redirectUrl: whatsappUrl }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && ["FNB_PRODUCT_NOT_FOUND", "FNB_STOCK_SHORTAGE", "FNB_TOO_MANY_ITEMS", "PARTICIPANT_INVALID", "TOO_MANY_PARTICIPANTS"].includes(error.message)) {
      return NextResponse.json({ error: "Data peserta atau F&B tidak valid" }, { status: 400 });
    }
    console.error("[POST /api/playpass-bookings]", error);
    return NextResponse.json({ error: "Gagal membuat booking Playpass" }, { status: 500 });
  }
}
