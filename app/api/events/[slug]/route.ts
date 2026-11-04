import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { expireStalePendingBookings } from "@/lib/event-booking";

type EventRecord = {
  slug: string;
  category: string;
  title: string;
  eventDate: Date;
  startTime: string;
  endTime: string;
  locationName: string;
  quota: number;
  price: number;
  description: string;
  benefits: string[];
  bookings: { quantity: number }[];
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await expireStalePendingBookings();
    const event = await prisma.event.findFirst({
      where: { slug, isActive: true },
      include: {
        bookings: {
          where: {
            OR: [
              { status: "PAID" },
              { status: "PENDING_PAYMENT", expiresAt: { gt: new Date() } },
            ],
          },
          select: { quantity: true },
        },
      },
    });

    if (!event) return NextResponse.json({ error: "Event tidak ditemukan" }, { status: 404 });

    return NextResponse.json(toEventItem(event));
  } catch (error) {
    console.error("[GET /api/events/[slug]]", error);
    return NextResponse.json({ error: "Gagal mengambil detail event" }, { status: 500 });
  }
}

function toEventItem({ bookings, ...event }: EventRecord) {
  const description = event.description;
  const category = event.category.toLowerCase() === "parenting" ? "parenting" : "workshop";

  return {
    slug: event.slug,
    category,
    title: event.title,
    date: event.eventDate.toISOString().slice(0, 10),
    timeStart: event.startTime,
    timeEnd: event.endTime,
    location: event.locationName,
    quota: event.quota,
    quotaLeft: Math.max(0, event.quota - bookings.reduce((sum: number, booking: { quantity: number }) => sum + booking.quantity, 0)),
    price: event.price === 0 ? "Gratis" : `Rp${event.price.toLocaleString("id-ID")} / anak`,
    shortDescription: description,
    description: [description],
    agenda: event.benefits.map((benefit: string) => ({ time: "", item: benefit })),
    facilitator: { name: "Tim Marica", role: "Fasilitator Marica" },
  };
}
