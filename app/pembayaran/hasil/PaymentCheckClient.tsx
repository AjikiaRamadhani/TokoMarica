"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

type PaymentState = { status?: string; href?: string; label?: string; message?: string };
const statusLabel: Record<string, string> = { PAID: "Pembayaran berhasil", SETTLEMENT: "Pembayaran berhasil", PENDING_PAYMENT: "Menunggu pembayaran", PENDING: "Menunggu pembayaran", EXPIRED: "Pembayaran kedaluwarsa", CANCELLED: "Pembayaran dibatalkan", FAILED: "Pembayaran gagal" };
const terminalStatuses = new Set(["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CHECKED_IN", "CANCELLED", "EXPIRED", "FAILED", "DENY"]);

export default function PaymentCheckClient({ orderId, initialStatus }: { orderId: string | null; initialStatus: string | null }) {
  const [state, setState] = useState<PaymentState>({ status: initialStatus ?? undefined });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!orderId) { setError("Nomor transaksi tidak ditemukan."); setLoading(false); return; }
    let cancelled = false;
    const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
    const load = async () => {
      for (let attempt = 0; attempt < 12 && !cancelled; attempt += 1) {
        try {
          let result: PaymentState;
          if (orderId.startsWith("ORD-")) {
            const listResponse = await fetch("/api/orders", { cache: "no-store" });
            const orders = await listResponse.json();
            const order = Array.isArray(orders) ? orders.find((item: { orderNumber?: string }) => item.orderNumber === orderId) : null;
            if (!order) throw new Error("Pesanan tidak ditemukan");
            const refreshedResponse = await fetch(`/api/orders/${encodeURIComponent(order.id)}`, { method: "POST", cache: "no-store" });
            const refreshed = refreshedResponse.ok ? await refreshedResponse.json() : order;
            result = { status: refreshed.status, href: `/belanja/pesanan-saya/${refreshed.id}`, label: "Lihat detail pesanan" };
          } else if (orderId.startsWith("TBL-")) {
            const response = await fetch(`/api/table-reservations/${encodeURIComponent(orderId)}`, { cache: "no-store" });
            const reservation = await response.json();
            if (!response.ok) throw new Error(reservation.error ?? "Reservasi tidak ditemukan");
            result = { status: reservation.status, href: `/reservasi/tiket/${encodeURIComponent(orderId)}`, label: "Lihat QR reservasi" };
          } else if (orderId.startsWith("PPB-")) {
            const response = await fetch(`/api/playpass-bookings/${encodeURIComponent(orderId)}`, { cache: "no-store" });
            const booking = await response.json();
            if (!response.ok) throw new Error(booking.error ?? "Booking Playpass tidak ditemukan");
            result = { status: booking.status, href: `/playpass/tiket/${encodeURIComponent(orderId)}`, label: "Lihat e-tiket Playpass" };
          } else if (orderId.startsWith("POR-")) {
            const response = await fetch(`/api/preorders/reservation/${encodeURIComponent(orderId)}`, { cache: "no-store" });
            const reservation = await response.json();
            if (!response.ok) throw new Error(reservation.error ?? "Pre-order tidak ditemukan");
            result = { status: reservation.status, href: `/preorder/hasil?reservation=${encodeURIComponent(orderId)}`, label: "Lihat detail pre-order" };
          } else if (orderId.startsWith("EVT-")) {
            const response = await fetch(`/api/event-bookings/${encodeURIComponent(orderId)}`, { cache: "no-store" });
            const booking = await response.json();
            if (!response.ok) throw new Error(booking.error ?? "Booking event tidak ditemukan");
            result = { status: booking.status, href: `/event/tiket/${encodeURIComponent(orderId)}`, label: "Lihat e-tiket event" };
          } else result = { status: initialStatus ?? "PENDING", message: "Status transaksi belum dapat dipetakan." };
          if (cancelled) return;
          setState(result); setLoading(false);
          const normalized = result.status?.toUpperCase() ?? "PENDING";
          if (terminalStatuses.has(normalized) || !["PENDING", "PENDING_PAYMENT"].includes(normalized)) return;
          setChecking(true);
          await wait(2500);
        } catch (loadError) {
          if (!cancelled) { setError(loadError instanceof Error ? loadError.message : "Status pembayaran gagal diperiksa"); setLoading(false); }
          return;
        }
      }
      if (!cancelled) setChecking(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [initialStatus, orderId]);

  const normalized = state.status?.toUpperCase() ?? "PENDING";
  const paid = ["PAID", "SETTLEMENT", "PROCESSING", "SHIPPED", "DELIVERED", "CHECKED_IN"].includes(normalized);
  const failed = ["EXPIRED", "CANCELLED", "FAILED", "DENY"].includes(normalized);
  return <div className="flex min-h-screen flex-col bg-[#fdf8f1] text-marica-ink"><Navbar /><main className="flex flex-1 items-center justify-center px-5 py-14"><section className="w-full max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm sm:p-10">{loading ? <Loader2 className="mx-auto h-9 w-9 animate-spin text-marica-amber-dark" /> : error ? <><XCircle className="mx-auto h-14 w-14 text-red-500" /><h1 className="mt-5 font-display text-2xl font-bold">Status pembayaran tidak ditemukan</h1><p className="mt-2 text-sm text-marica-ink-soft">{error}</p></> : <><span className="mx-auto flex h-16 w-16 items-center justify-center">{paid ? <CheckCircle2 className="h-14 w-14 text-marica-green" /> : failed ? <XCircle className="h-14 w-14 text-red-500" /> : <Clock3 className="h-14 w-14 text-marica-amber-dark" />}</span><p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-marica-amber-dark">Verifikasi pembayaran</p><h1 className="mt-2 font-display text-3xl font-bold">{statusLabel[normalized] ?? "Status pembayaran"}</h1><p className="mt-3 text-sm leading-relaxed text-marica-ink-soft">Nomor transaksi: <strong>{orderId ?? "-"}</strong></p><p className="mt-2 text-sm text-marica-ink-soft">{state.message ?? (paid ? "Transaksi sudah tercatat di sistem Marica." : checking ? "Menunggu konfirmasi pembayaran dari gateway..." : "Status akan diperbarui setelah pembayaran dikonfirmasi.")}</p>{checking && <p className="mt-3 text-xs text-marica-ink-soft">Status sedang diperiksa otomatis.</p>}{state.href && <Link href={state.href} className="mt-7 inline-flex rounded-full bg-marica-ink px-5 py-3 text-sm font-bold text-white">{state.label}</Link>}<div className="mt-4"><Link href="/" className="text-sm font-semibold text-marica-amber-dark">Kembali ke beranda</Link></div></>}</section></main><Footer /></div>;
}
