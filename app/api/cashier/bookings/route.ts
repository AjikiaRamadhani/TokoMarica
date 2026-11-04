import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access-control";

export async function GET() {
  const session = await requireRole("ADMIN", "KASIR");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [events, playpasses, tableReservations] = await Promise.all([
      prisma.eventBooking.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          event: { select: { id: true, title: true, eventDate: true, startTime: true, endTime: true } },
          tickets: { select: { ticketCode: true, participantName: true, status: true, checkedInAt: true } },
        },
      }),
      prisma.playpassBooking.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          package: { select: { id: true, name: true } },
          tickets: { select: { ticketNumber: true, status: true, checkedInAt: true } },
        },
      }),
      prisma.tableReservation.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { package: { select: { id: true, name: true } } },
      }),
    ]);

    return NextResponse.json({ events, playpasses, tableReservations });
  } catch (error) {
    console.error("[GET /api/cashier/bookings]", error);
    return NextResponse.json({ error: "Gagal mengambil data booking" }, { status: 500 });
  }
}
