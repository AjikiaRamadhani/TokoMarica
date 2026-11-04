import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookingNumber: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  }

  const { bookingNumber } = await params;
  const bookingRecord = await prisma.eventBooking.findFirst({
    where: { bookingNumber, userId: session.user.id },
    include: { event: true, tickets: true },
  });

  if (!bookingRecord) return NextResponse.json({ error: "Booking tidak ditemukan" }, { status: 404 });
  return NextResponse.json(bookingRecord);
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ bookingNumber: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  }

  const { bookingNumber } = await params;
  const cancelled = await prisma.eventBooking.updateMany({
    where: {
      bookingNumber,
      userId: session.user.id,
      status: "PENDING_PAYMENT",
    },
    data: { status: "CANCELLED" },
  });

  if (cancelled.count === 0) {
    return NextResponse.json(
      { error: "Booking tidak ditemukan atau sudah tidak bisa dibatalkan" },
      { status: 409 }
    );
  }

  return NextResponse.json({ message: "Booking dibatalkan" });
}
