import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ bookingNumber: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  const { bookingNumber } = await params;
  const booking = await prisma.playpassBooking.findFirst({ where: { bookingNumber, userId: session.user.id }, include: { package: true, tickets: true, fnbItems: { include: { fnbProduct: true } }, participants: true } });
  if (!booking) return NextResponse.json({ error: "Booking Playpass tidak ditemukan" }, { status: 404 });
  return NextResponse.json(booking);
}

export async function POST(_request: Request, { params }: { params: Promise<{ bookingNumber: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  const { bookingNumber } = await params;
  const booking = await prisma.playpassBooking.findFirst({ where: { bookingNumber, userId: session.user.id } });
  if (!booking) return NextResponse.json({ error: "Booking Playpass tidak ditemukan" }, { status: 404 });
  return NextResponse.json(booking);
}
