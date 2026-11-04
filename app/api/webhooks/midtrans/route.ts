import { NextResponse } from "next/server";

// Legacy endpoint: all payments are now handled manually through WhatsApp.
export async function GET() {
  return NextResponse.json(
    { status: "disabled", message: "Pembayaran Midtrans sudah dinonaktifkan. Gunakan WhatsApp." },
    { status: 410 },
  );
}

export async function POST() {
  return NextResponse.json(
    { status: "disabled", message: "Pembayaran Midtrans sudah dinonaktifkan. Gunakan WhatsApp." },
    { status: 410 },
  );
}
