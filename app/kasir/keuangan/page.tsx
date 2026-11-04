"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  QrCode,
  ReceiptText,
  TrendingUp,
  WalletCards,
} from "lucide-react";

type Summary = {
  completedTransactions: number;
  completedRevenue: number;
  cashRevenue: number;
  qrisRevenue: number;
  averageTransaction: number;
  currentShiftTransactions: number;
  currentShiftCashRevenue: number;
};

type Shift = {
  openingCash: number;
  openedAt: string;
};

const money = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

const initialSummary: Summary = {
  completedTransactions: 0,
  completedRevenue: 0,
  cashRevenue: 0,
  qrisRevenue: 0,
  averageTransaction: 0,
  currentShiftTransactions: 0,
  currentShiftCashRevenue: 0,
};

export default function CashierFinancePage() {
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [shift, setShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<"day" | "month" | "year">("day");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    setIsLoading(true);
    setError("");
    Promise.all([
      fetch(`/api/cashier/sales?limit=1&period=${period}&date=${date}`, { cache: "no-store" }).then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "Ringkasan keuangan gagal dimuat.");
        return data;
      }),
      fetch("/api/cashier/shifts", { cache: "no-store" }).then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "Data shift gagal dimuat.");
        return data;
      }),
    ])
      .then(([salesData, shiftData]) => {
        setSummary({
          ...initialSummary,
          ...salesData.summary,
        });
        setShift(shiftData.shift ?? null);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Ringkasan keuangan gagal dimuat.");
      })
      .finally(() => setIsLoading(false));
  }, [period, date]);

  const cashPosition = (shift?.openingCash ?? 0) + summary.currentShiftCashRevenue;
  const cashShare = summary.completedRevenue > 0
    ? Math.round((summary.cashRevenue / summary.completedRevenue) * 100)
    : 0;
  const qrisShare = summary.completedRevenue > 0
    ? Math.round((summary.qrisRevenue / summary.completedRevenue) * 100)
    : 0;
  const selectedDateLabel = useMemo(
    () => new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    [date],
  );

  return (
    <div className="mx-auto min-h-full max-w-375 pb-10 text-[#1c1b1b]">
      <header className="relative mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#4c2b17] via-[#8a4c1b] to-[#dc921d] p-6 text-white shadow-[0_20px_50px_rgba(120,60,10,0.2)] sm:p-8">
        <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-body text-xs font-bold uppercase tracking-[0.2em] text-white/70">
              Marica Point of Sale
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
              Keuangan kasir
            </h1>
            <p className="mt-2 max-w-xl font-body text-sm leading-relaxed text-white/75">
              Pantau omzet, metode pembayaran, dan posisi kas shift dalam satu dashboard.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
            <CalendarDays className="h-5 w-5 text-white/80" />
            <div>
              <p className="font-body text-[10px] font-bold uppercase tracking-wider text-white/60">Periode aktif</p>
              <p className="font-body text-sm font-bold">{selectedDateLabel}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mb-6 flex flex-col gap-3 rounded-3xl border border-black/5 bg-white p-4 shadow-[0_10px_28px_rgba(120,60,10,0.06)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="font-body text-sm font-bold text-marica-ink">Filter laporan</p>
          <p className="mt-1 font-body text-xs text-marica-ink-soft">Pilih rentang waktu yang ingin ditinjau.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            ["day", "Hari ini"],
            ["month", "Bulan ini"],
            ["year", "Tahun ini"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              className={`rounded-full px-4 py-2 font-body text-xs font-bold transition ${
                period === value
                  ? "bg-marica-amber-dark text-white shadow-sm"
                  : "bg-marica-sky-light/60 text-marica-ink-soft hover:bg-marica-amber/15"
              }`}
            >
              {label}
            </button>
          ))}
          <input
            type="date"
            aria-label="Tanggal laporan"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-full border border-black/10 px-3 py-2 font-body text-xs font-semibold text-marica-ink outline-none focus:border-marica-amber-dark"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-3xl bg-white/70" />)}
        </div>
      ) : error ? (
        <div className="rounded-3xl bg-marica-rose-deep/10 p-5 font-body text-sm text-marica-rose-deep">{error}</div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={CircleDollarSign} label="Total omzet" value={money(summary.completedRevenue)} detail={`${summary.completedTransactions.toLocaleString("id-ID")} transaksi selesai`} tone="amber" />
            <MetricCard icon={TrendingUp} label="Rata-rata transaksi" value={money(summary.averageTransaction)} detail="Nilai rata-rata per transaksi" tone="blue" />
            <MetricCard icon={Banknote} label="Pembayaran tunai" value={money(summary.cashRevenue)} detail={`${cashShare}% dari total omzet`} tone="green" />
            <MetricCard icon={QrCode} label="Pembayaran QRIS" value={money(summary.qrisRevenue)} detail={`${qrisShare}% dari total omzet`} tone="violet" />
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_10px_28px_rgba(120,60,10,0.06)] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-body text-xs font-bold uppercase tracking-[0.14em] text-marica-amber-text">Komposisi omzet</p>
                  <h2 className="mt-1 font-display text-xl font-semibold text-marica-ink">Metode pembayaran</h2>
                </div>
                <WalletCards className="h-6 w-6 text-marica-amber-dark" />
              </div>
              <div className="mt-6 h-4 overflow-hidden rounded-full bg-marica-sky-light/70">
                <div className="flex h-full">
                  <div className="bg-marica-green transition-all" style={{ width: `${cashShare}%` }} />
                  <div className="bg-marica-violet transition-all" style={{ width: `${qrisShare}%` }} />
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <PaymentBreakdown icon={Banknote} label="Tunai" value={summary.cashRevenue} share={cashShare} color="green" />
                <PaymentBreakdown icon={QrCode} label="QRIS" value={summary.qrisRevenue} share={qrisShare} color="violet" />
              </div>
            </div>

            <div className="rounded-3xl bg-[#193b45] p-5 text-white shadow-[0_14px_35px_rgba(25,59,69,0.18)] sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-body text-xs font-bold uppercase tracking-[0.14em] text-white/55">Shift berjalan</p>
                  <h2 className="mt-1 font-display text-xl font-semibold">Posisi kas</h2>
                </div>
                <div className="rounded-2xl bg-white/10 p-2.5"><WalletCards className="h-5 w-5 text-[#ffd27b]" /></div>
              </div>
              {shift ? (
                <>
                  <p className="mt-7 font-display text-3xl font-semibold text-[#ffd27b]">{money(cashPosition)}</p>
                  <div className="mt-5 space-y-3 font-body text-sm">
                    <InfoRow label="Kas awal" value={money(shift.openingCash)} />
                    <InfoRow label="Penjualan tunai shift" value={money(summary.currentShiftCashRevenue)} />
                    <InfoRow label="Transaksi shift" value={`${summary.currentShiftTransactions.toLocaleString("id-ID")} transaksi`} />
                  </div>
                  <div className="mt-5 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs text-white/75">
                    <Clock3 className="h-4 w-4" />
                    Dibuka {new Date(shift.openedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </>
              ) : (
                <div className="mt-8 rounded-2xl bg-white/10 p-4 font-body text-sm leading-relaxed text-white/75">
                  Belum ada shift aktif. Buka shift dari halaman kasir untuk melihat posisi kas berjalan.
                </div>
              )}
            </div>
          </section>

          <section className="mt-5 rounded-3xl border border-marica-amber/20 bg-marica-amber/10 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-white p-3 text-marica-amber-dark shadow-sm"><ReceiptText className="h-5 w-5" /></div>
              <div>
                <h2 className="font-display text-lg font-semibold text-marica-ink">Ringkasan cepat</h2>
                <p className="mt-1 font-body text-sm leading-relaxed text-marica-ink-soft">
                  Omzet yang tampil hanya menghitung transaksi berstatus selesai pada periode terpilih. Pembayaran QRIS tidak masuk ke perkiraan uang fisik di laci.
                </p>
              </div>
              <ArrowUpRight className="ml-auto hidden h-5 w-5 text-marica-amber-text sm:block" />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof CircleDollarSign;
  label: string;
  value: string;
  detail: string;
  tone: "amber" | "blue" | "green" | "violet";
}) {
  const styles = {
    amber: "border-marica-amber/25 bg-gradient-to-br from-marica-amber/20 to-white text-marica-amber-text",
    blue: "border-marica-sky/30 bg-gradient-to-br from-marica-sky-light/80 to-white text-marica-blue",
    green: "border-marica-green/25 bg-gradient-to-br from-marica-green/15 to-white text-green-700",
    violet: "border-marica-violet/25 bg-gradient-to-br from-marica-violet/15 to-white text-marica-violet-deep",
  };
  return (
    <div className={`rounded-3xl border p-5 shadow-[0_10px_28px_rgba(120,60,10,0.05)] ${styles[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-body text-xs font-bold uppercase tracking-[0.12em]">{label}</p>
        <Icon className="h-5 w-5 opacity-80" />
      </div>
      <p className="mt-5 font-display text-2xl font-semibold text-marica-ink">{value}</p>
      <p className="mt-1 font-body text-xs text-marica-ink-soft">{detail}</p>
    </div>
  );
}

function PaymentBreakdown({
  icon: Icon,
  label,
  value,
  share,
  color,
}: {
  icon: typeof Banknote;
  label: string;
  value: number;
  share: number;
  color: "green" | "violet";
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-marica-cream/50 p-3">
      <div className={`rounded-xl p-2 ${color === "green" ? "bg-marica-green/15 text-green-700" : "bg-marica-violet/15 text-marica-violet-deep"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-2 font-body text-xs">
          <span className="font-bold text-marica-ink">{label}</span>
          <span className="text-marica-ink-soft">{share}%</span>
        </div>
        <p className="mt-1 font-body text-sm font-bold text-marica-ink">{money(value)}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2 last:border-0 last:pb-0">
      <span className="text-white/60">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
