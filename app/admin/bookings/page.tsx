"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ClipboardList, RefreshCw, Search, Ticket, UsersRound } from "lucide-react";

type BookingTab = "ALL" | "EVENT" | "PLAYPASS" | "TABLE";
type EventBooking = {
  id: string;
  bookingNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  createdAt: string;
  event: { title: string; eventDate: string; startTime: string; endTime: string };
  tickets: { ticketCode: string; participantName: string; status: string; checkedInAt: string | null }[];
};
type PlaypassBooking = {
  id: string;
  bookingNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  visitDate: string;
  startTime: string;
  endTime: string;
  quantity: number;
  totalPrice: number;
  status: string;
  createdAt: string;
  package: { name: string };
  tickets: { ticketNumber: string; status: string; checkedInAt: string | null }[];
};
type TableReservation = {
  id: string;
  reservationNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  visitDate: string;
  startTime: string;
  endTime: string;
  partySize: number;
  totalPrice: number;
  status: string;
  createdAt: string;
  package: { name: string };
};
type BookingData = {
  events: EventBooking[];
  playpasses: PlaypassBooking[];
  tableReservations: TableReservation[];
};
type BookingRow = {
  type: Exclude<BookingTab, "ALL">;
  id: string;
  number: string;
  customerName: string;
  customerEmail: string;
  title: string;
  schedule: string;
  detail: string;
  status: string;
  createdAt: string;
};

const money = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;
const dateTime = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const dateOnly = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value));
const timeOnly = (value: string) => new Intl.DateTimeFormat("id-ID", { timeStyle: "short" }).format(new Date(value));

const tabLabels: Record<BookingTab, string> = {
  ALL: "Semua Booking",
  EVENT: "Event",
  PLAYPASS: "Playpass",
  TABLE: "Reservasi Meja",
};

const typeLabels: Record<BookingRow["type"], string> = {
  EVENT: "Event",
  PLAYPASS: "Playpass",
  TABLE: "Reservasi Meja",
};

function statusLabel(status: string) {
  return {
    PAID: "Lunas",
    PENDING_PAYMENT: "Menunggu pembayaran",
    CHECKED_IN: "Sudah check-in",
    CANCELLED: "Dibatalkan",
    EXPIRED: "Kedaluwarsa",
  }[status] ?? status;
}

function statusClass(status: string) {
  if (status === "PAID" || status === "CHECKED_IN") return "bg-marica-green/10 text-green-700";
  if (status === "CANCELLED" || status === "EXPIRED") return "bg-marica-rose-deep/10 text-marica-rose-deep";
  return "bg-marica-amber/15 text-marica-amber-text";
}

export default function AdminBookingsPage() {
  const [data, setData] = useState<BookingData>({ events: [], playpasses: [], tableReservations: [] });
  const [tab, setTab] = useState<BookingTab>("ALL");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  async function confirmPayment(row: BookingRow) {
    setConfirming(`${row.type}-${row.id}`);
    setError(null);
    try {
      const response = await fetch("/api/admin/bookings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: row.type, id: row.id, status: "PAID" }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Gagal mengonfirmasi pembayaran");
      await loadBookings();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Gagal mengonfirmasi pembayaran");
    } finally {
      setConfirming(null);
    }
  }

  async function loadBookings() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/bookings", { cache: "no-store" });
      const result = (await response.json()) as BookingData & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Gagal memuat booking");
      setData({
        events: Array.isArray(result.events) ? result.events : [],
        playpasses: Array.isArray(result.playpasses) ? result.playpasses : [],
        tableReservations: Array.isArray(result.tableReservations) ? result.tableReservations : [],
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat booking");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // Data loading updates state asynchronously after the component is mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadBookings();
  }, []);

  const rows = useMemo<BookingRow[]>(() => {
    const eventRows: BookingRow[] = data.events.map((booking) => {
      const checkedIn = booking.tickets.filter((ticket) => ticket.status === "CHECKED_IN").length;
      return {
        type: "EVENT",
        id: booking.id,
        number: booking.bookingNumber,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        title: booking.event.title,
        schedule: `${dateOnly(booking.event.eventDate)} · ${booking.event.startTime}–${booking.event.endTime}`,
        detail: `${booking.tickets.length} peserta · ${checkedIn} sudah check-in`,
        status: booking.status,
        createdAt: booking.createdAt,
      };
    });
    const playpassRows: BookingRow[] = data.playpasses.map((booking) => ({
      type: "PLAYPASS",
      id: booking.id,
      number: booking.bookingNumber,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      title: booking.package.name,
      schedule: `${dateOnly(booking.visitDate)} · ${timeOnly(booking.startTime)}–${timeOnly(booking.endTime)}`,
      detail: `${booking.quantity} tiket · ${money(booking.totalPrice)}`,
      status: booking.status,
      createdAt: booking.createdAt,
    }));
    const tableRows: BookingRow[] = data.tableReservations.map((booking) => ({
      type: "TABLE",
      id: booking.id,
      number: booking.reservationNumber,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      title: booking.package.name,
      schedule: `${dateOnly(booking.visitDate)} · ${timeOnly(booking.startTime)}–${timeOnly(booking.endTime)}`,
      detail: `${booking.partySize} pemain · ${money(booking.totalPrice)}`,
      status: booking.status,
      createdAt: booking.createdAt,
    }));
    return [...eventRows, ...playpassRows, ...tableRows]
      .filter((row) => tab === "ALL" || row.type === tab)
      .filter((row) => {
        const needle = query.trim().toLowerCase();
        if (!needle) return true;
        return [row.number, row.customerName, row.customerEmail, row.title].some((value) => value.toLowerCase().includes(needle));
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data, query, tab]);

  const stats = [
    { label: "Event", value: data.events.length, icon: CalendarDays, color: "bg-marica-rose/20 text-marica-rose-deep" },
    { label: "Playpass", value: data.playpasses.length, icon: Ticket, color: "bg-marica-violet/20 text-marica-violet-deep" },
    { label: "Reservasi meja", value: data.tableReservations.length, icon: ClipboardList, color: "bg-marica-sky-light text-marica-blue" },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-marica-amber-dark">Operasional</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-marica-ink">Booking</h1>
          <p className="mt-1 text-sm text-marica-ink-soft">Pantau booking event, Playpass, dan reservasi meja dari satu halaman.</p>
        </div>
        <button type="button" onClick={() => void loadBookings()} disabled={isLoading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-marica-ink shadow-sm transition hover:bg-marica-sky-light/40 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Muat ulang
        </button>
      </header>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5" /></span>
            <div><p className="text-xs uppercase tracking-wide text-marica-ink-soft">{label}</p><p className="mt-1 font-display text-2xl font-semibold text-marica-ink">{value}</p></div>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-marica-ink-soft/60" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nomor, nama, email, atau paket..." className="w-full rounded-xl border border-black/10 bg-marica-sky-light/20 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-marica-amber-dark focus:ring-4 focus:ring-marica-amber/15" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(Object.keys(tabLabels) as BookingTab[]).map((value) => (
              <button key={value} type="button" onClick={() => setTab(value)} className={`shrink-0 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${tab === value ? "bg-marica-amber-dark text-white" : "bg-marica-sky-light/50 text-marica-ink-soft hover:bg-marica-sky-light"}`}>
                {tabLabels[value]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="mt-6 space-y-3">
        {isLoading ? (
          <div className="rounded-2xl border border-black/5 bg-white py-16 text-center text-sm text-marica-ink-soft">Memuat data booking...</div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white py-16 text-center text-sm text-marica-ink-soft">Belum ada booking yang cocok.</div>
        ) : rows.map((row) => (
          <article key={`${row.type}-${row.number}`} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-marica-amber/15 px-2.5 py-1 text-[11px] font-semibold text-marica-amber-text">{typeLabels[row.type]}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(row.status)}`}>{statusLabel(row.status)}</span>
                </div>
                <h2 className="mt-3 truncate font-display text-lg font-semibold text-marica-ink">{row.title}</h2>
                <p className="mt-1 text-sm text-marica-ink-soft">{row.schedule}</p>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm lg:min-w-[360px] lg:grid-cols-3">
                <div><p className="text-xs text-marica-ink-soft">Pemesan</p><p className="mt-0.5 truncate font-semibold text-marica-ink">{row.customerName}</p></div>
                <div><p className="text-xs text-marica-ink-soft">Rincian</p><p className="mt-0.5 font-semibold text-marica-ink">{row.detail}</p></div>
                <div><p className="text-xs text-marica-ink-soft">Dibuat</p><p className="mt-0.5 font-semibold text-marica-ink">{dateTime(row.createdAt)}</p></div>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-black/5 pt-3 text-xs text-marica-ink-soft sm:flex-row sm:items-center sm:justify-between">
              <span className="truncate">{row.number} · {row.customerEmail}</span>
              <div className="flex flex-wrap justify-end gap-2">
                {row.status === "PENDING_PAYMENT" && <button type="button" onClick={() => void confirmPayment(row)} disabled={confirming !== null} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-marica-amber-dark px-3 py-2 font-semibold text-white transition hover:bg-marica-amber disabled:opacity-50">{confirming === `${row.type}-${row.id}` ? "Memproses..." : "Konfirmasi pembayaran"}</button>}
                <Link href="/kasir" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-marica-amber-dark px-3 py-2 font-semibold text-marica-amber-text transition hover:bg-marica-amber/10">Buka kasir untuk check-in</Link>
              </div>
            </div>
          </article>
        ))}
      </section>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-marica-blue/20 bg-marica-sky-light/50 p-4 text-sm text-marica-blue">
        <UsersRound className="mt-0.5 h-5 w-5 shrink-0" />
        <p>Gunakan menu Kasir untuk memindai QR atau memasukkan nomor tiket saat pelanggan datang.</p>
      </div>
    </div>
  );
}
