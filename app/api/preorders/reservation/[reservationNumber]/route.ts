import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reservationNumber: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  }

  const { reservationNumber } = await params;
  const reservation = await prisma.preOrderReservation.findFirst({
    where: { reservationNumber, userId: session.user.id },
    include: {
      campaign: {
        include: {
          product: { include: { images: { orderBy: { order: "asc" }, take: 1 } } },
        },
      },
    },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Pre-order tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json(reservation);
}

export async function POST(_request: Request, { params }: { params: Promise<{ reservationNumber: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  const { reservationNumber } = await params;
  const reservation = await prisma.preOrderReservation.findFirst({ where: { reservationNumber, userId: session.user.id } });
  if (!reservation) return NextResponse.json({ error: "Pre-order tidak ditemukan" }, { status: 404 });
  return NextResponse.json(reservation);
}
