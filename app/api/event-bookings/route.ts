import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEventTicketEmailIfNeeded } from "@/lib/event-ticket-mailer";
import { expireStalePendingBookings } from "@/lib/event-booking";
import { auditAction } from "@/lib/audit";
import { validatePhone, validateInteger } from "@/lib/request-validation";
import { buildManualPaymentWhatsAppUrl } from "@/lib/whatsapp-checkout";

const MAX_PARTICIPANTS_PER_BOOKING = 10;
const PENDING_BOOKING_MINUTES = 30;

function generateBookingNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `EVT-${date}-${suffix}`;
}

function normalizeParticipantNames(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((name): name is string => typeof name === "string")
    .map((name) => name.trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      eventId?: string;
      eventSlug?: string;
      quantity?: number;
      participantNames?: unknown;
      customerPhone?: string;
    };

    const quantityCheck = validateInteger(body.quantity, "Jumlah tiket", 1);
    if (quantityCheck.error || typeof quantityCheck.value !== "number") {
      return NextResponse.json({ error: quantityCheck.error ?? "Jumlah tiket tidak valid" }, { status: 400 });
    }

    const quantity = quantityCheck.value;

    const eventId = body.eventId?.trim();
    const eventSlug = body.eventSlug?.trim();
    const participantNames = normalizeParticipantNames(body.participantNames);

    if ((!eventId && !eventSlug) || quantity > MAX_PARTICIPANTS_PER_BOOKING) {
      return NextResponse.json({ error: "Data booking tidak valid" }, { status: 400 });
    }

    if (participantNames.length !== quantity) {
      return NextResponse.json(
        { error: "Nama peserta harus sesuai dengan jumlah tiket" },
        { status: 400 }
      );
    }

    const customerPhoneCheck = body.customerPhone === undefined
      ? null
      : validatePhone(body.customerPhone, "Nomor telepon");
    if (customerPhoneCheck?.error) {
      return NextResponse.json({ error: customerPhoneCheck.error }, { status: 400 });
    }

    const event = await prisma.event.findFirst({
      where: eventId ? { id: eventId } : { slug: eventSlug },
    });
    if (!event || !event.isActive || event.eventDate < new Date()) {
      return NextResponse.json({ error: "Event tidak tersedia" }, { status: 404 });
    }

    const bookingNumber = generateBookingNumber();
    const totalPrice = event.price * quantity;
    const expiresAt = new Date(Date.now() + PENDING_BOOKING_MINUTES * 60 * 1000);
    const userEmail = String(session.user.email);
    const userName = String(session.user.name?.trim() || userEmail || "Pengguna");

    await expireStalePendingBookings();

    const bookingResult = await prisma.$transaction(async (tx) => {

      const activeBookings = await tx.eventBooking.aggregate({
        where: {
          eventId: event.id,
          OR: [
            { status: "PAID" },
            { status: "PENDING_PAYMENT", expiresAt: { gt: new Date() } },
          ],
        },
        _sum: { quantity: true },
      });

      const bookedQuantity = activeBookings._sum.quantity ?? 0;
      if (bookedQuantity + quantity > event.quota) {
        throw Object.assign(new Error("QUOTA_EXCEEDED"), { statusCode: 409 });
      }

      const booking = await tx.eventBooking.create({
        data: {
          bookingNumber,
          eventId: event.id,
          userId: session.user.id,
          customerName: userName,
          customerEmail: userEmail,
          customerPhone: body.customerPhone?.trim() || null,
          participantNames,
          quantity,
          totalPrice,
          expiresAt: event.price > 0 ? expiresAt : null,
          status: event.price > 0 ? "PENDING_PAYMENT" : "PAID",
          paidAt: event.price > 0 ? null : new Date(),
          tickets:
            event.price === 0
              ? {
                  create: participantNames.map((participantName, index) => ({
                    ticketCode: `${bookingNumber}-${index + 1}`,
                    qrToken: crypto.randomUUID(),
                    participantName,
                  })),
                }
              : undefined,
        },
        include: { tickets: true },
      });

      return { booking, isFree: event.price === 0 };
    });

    if (bookingResult.isFree) {
      await sendEventTicketEmailIfNeeded(bookingResult.booking.id);
      auditAction({
        action: "event_booking_created",
        status: "success",
        payload: { bookingNumber, eventId: event.id, quantity, userId: session.user.id },
      });
      return NextResponse.json({ booking: bookingResult.booking }, { status: 201 });
    }

    const company = await prisma.companyProfile.findFirst({ select: { whatsapp: true } });
    const whatsappUrl = company?.whatsapp
      ? buildManualPaymentWhatsAppUrl(company.whatsapp, { reference: bookingNumber, customerName: bookingResult.booking.customerName, total: totalPrice, description: `Event ${event.title}` })
      : null;
    if (!whatsappUrl) return NextResponse.json({ error: "Nomor WhatsApp pembayaran belum dikonfigurasi" }, { status: 503 });

    auditAction({
      action: "event_booking_created",
      status: "success",
      payload: { bookingNumber, eventId: event.id, quantity, userId: session.user.id },
    });

    return NextResponse.json(
      {
        booking: bookingResult.booking,
        whatsappUrl,
        redirectUrl: whatsappUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    const statusCode =
      typeof error === "object" && error && "statusCode" in error && typeof error.statusCode === "number"
        ? error.statusCode
        : 500;

    if (statusCode === 409) {
      return NextResponse.json({ error: "Kuota event tidak mencukupi" }, { status: 409 });
    }

    console.error("[POST /api/event-bookings]", error);
    return NextResponse.json({ error: "Gagal membuat booking event" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  }

  try {
    const bookings = await prisma.eventBooking.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        event: true,
        tickets: true,
      },
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error("[GET /api/event-bookings]", error);
    return NextResponse.json({ error: "Gagal mengambil riwayat booking" }, { status: 500 });
  }
}
