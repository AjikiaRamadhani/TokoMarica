import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isRateLimited } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { createB2BInquiryNumber, parseOptionalDate } from "@/lib/b2b";
import { validatePhone } from "@/lib/request-validation";

const text = (value: unknown, max: number) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null;

export async function POST(request: Request) {
  if (isRateLimited(request, "b2b-inquiry", 10)) return NextResponse.json({ error: "Terlalu banyak pengajuan, coba lagi nanti" }, { status: 429 });
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const organizationName = text(body.organizationName, 160);
    const organizationType = text(body.organizationType, 60);
    const contactName = text(body.contactName, 120);
    const email = text(body.email, 160)?.toLowerCase() ?? null;
    const whatsappCheck = validatePhone(body.whatsapp, "Nomor WhatsApp");
    const whatsapp = whatsappCheck.value ?? null;
    const requestType = text(body.requestType, 80);
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 5000) : null;
    const participantCount = body.participantCount === undefined || body.participantCount === null || body.participantCount === "" ? null : Number(body.participantCount);
    const budget = body.budget === undefined || body.budget === null || body.budget === "" ? null : Number(body.budget);
    if (!organizationName || !organizationType || !contactName || !email || !whatsapp || whatsappCheck.error || !requestType || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || (participantCount !== null && (!Number.isInteger(participantCount) || participantCount < 1)) || (budget !== null && (!Number.isInteger(budget) || budget < 0))) {
      return NextResponse.json({ error: "Data inquiry B2B belum lengkap atau tidak valid" }, { status: 400 });
    }
    const eventDate = parseOptionalDate(body.eventDate);
    const session = await auth();
    const inquiry = await prisma.b2BInquiry.create({
      data: { inquiryNumber: createB2BInquiryNumber(), userId: session?.user?.id ?? null, organizationName, organizationType, contactName, email, whatsapp, requestType, participantCount, eventDate, budget, notes },
    });
    return NextResponse.json(inquiry, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_DATE") return NextResponse.json({ error: "Tanggal acara tidak valid" }, { status: 400 });
    console.error("[POST /api/b2b/inquiries]", error);
    return NextResponse.json({ error: "Gagal menyimpan inquiry B2B" }, { status: 500 });
  }
}
