import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendPrintableDownloadEmail } from "@/lib/printable-mailer";
import {
  buildPrintableWhatsAppUrl,
  normalizeWhatsAppPhone,
  sendPrintableDownloadWhatsApp,
  WhatsAppCloudConfigurationError,
} from "@/lib/whatsapp-cloud";

const DOWNLOAD_URL_TTL_SECONDS = 10 * 60;
const PRINTABLE_BUCKET = "printables";

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (isRateLimited(request, "printable-download", 10)) {
    return NextResponse.json({ error: "Terlalu banyak permintaan, coba lagi nanti" }, { status: 429 });
  }

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Silakan login untuk mengunduh printable" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      whatsapp?: string;
      childAge?: number;
    };

    const name = normalizeOptionalText(body.name) ?? normalizeOptionalText(session?.user?.name);
    const email = (normalizeOptionalText(body.email) ?? normalizeOptionalText(session?.user?.email))?.toLowerCase();
    const whatsapp = normalizeOptionalText(body.whatsapp);
    const childAge = body.childAge === undefined ? null : Number(body.childAge);

    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !whatsapp) {
      return NextResponse.json(
        { error: "Nama, email, dan nomor WhatsApp wajib diisi dengan benar" },
        { status: 400 },
      );
    }

    let whatsappPhone: string;
    try {
      whatsappPhone = normalizeWhatsAppPhone(whatsapp);
    } catch {
      return NextResponse.json(
        { error: "Nomor WhatsApp tidak valid" },
        { status: 400 },
      );
    }

    if (childAge !== null && (!Number.isInteger(childAge) || childAge < 0 || childAge > 18)) {
      return NextResponse.json({ error: "Usia anak tidak valid" }, { status: 400 });
    }

    const printable = await prisma.printable.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!printable || !printable.isActive) {
      return NextResponse.json({ error: "Printable tidak ditemukan" }, { status: 404 });
    }

    if (printable.price > 0) {
      return NextResponse.json({ error: "Printable berbayar belum tersedia" }, { status: 501 });
    }

    const lead = await prisma.printableLead.create({
      data: {
        printableId: printable.id,
        userId: session.user.id,
        name,
        email,
        whatsapp,
        childAge,
      },
    });

    const { data, error } = await supabaseAdmin.storage
      .from(PRINTABLE_BUCKET)
      .createSignedUrl(printable.fileUrl, DOWNLOAD_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      console.error("[Printable signed URL error]", error);
      await prisma.printableLead.delete({ where: { id: lead.id } }).catch(() => undefined);
      return NextResponse.json({ error: "File printable belum tersedia" }, { status: 503 });
    }

    // Printable is a lead magnet and never awards Marica Points.
    await prisma.printable.update({
      where: { id: printable.id },
      data: { downloadCount: { increment: 1 } },
    });

    let emailDelivery: "sent" | "failed" = "sent";
    try {
      await sendPrintableDownloadEmail({
        email,
        name,
        printableTitle: printable.title,
        downloadUrl: data.signedUrl,
        expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS,
      });
    } catch (emailError) {
      console.error("[Printable email delivery]", emailError);
      emailDelivery = "failed";
    }

    let whatsappDelivery: "accepted" | "failed" | "not_configured" = "accepted";
    const whatsappUrl = buildPrintableWhatsAppUrl({
      phone: whatsappPhone,
      name,
      printableTitle: printable.title,
      downloadUrl: data.signedUrl,
    });
    try {
      await sendPrintableDownloadWhatsApp({
        phone: whatsappPhone,
        name,
        printableTitle: printable.title,
        downloadUrl: data.signedUrl,
      });
    } catch (whatsappError) {
      console.error("[Printable WhatsApp delivery]", whatsappError);
      whatsappDelivery =
        whatsappError instanceof WhatsAppCloudConfigurationError
          ? "not_configured"
          : "failed";
    }

    return NextResponse.json({
      message: "Download siap",
      downloadUrl: data.signedUrl,
      expiresIn: DOWNLOAD_URL_TTL_SECONDS,
      delivery: {
        email: emailDelivery,
        whatsapp: whatsappDelivery,
      },
      whatsappUrl,
    });
  } catch (error) {
    console.error("[POST /api/printables/[id]/download]", error);
    return NextResponse.json({ error: "Gagal menyiapkan download" }, { status: 500 });
  }
}
