"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type ShiftHistory = {
  id: string;
  openingCash: number;
  openedAt: string;
  closedAt: string | null;
  status: "OPEN" | "CLOSED";
  cashier: { name: string | null; email: string | null; role: string };
  transactionCount: number;
  transactionTotal: number;
};
type ActiveShift = Pick<ShiftHistory, "openingCash" | "openedAt" | "cashier">;
const money = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

export default function CashierHistoryPage() {
  const [history, setHistory] = useState<ShiftHistory[]>([]);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetch(`/api/cashier/shifts?page=${page}&limit=10`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "Riwayat gagal dimuat.");
        setActiveShift(data.shift ?? null);
        setHistory(Array.isArray(data.history) ? data.history : []);
        setTotalPages(data.pagination?.totalPages ?? 1);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Riwayat gagal dimuat."))
      .finally(() => setIsLoading(false));
  }, [page]);

  return (
    <div className="mx-auto min-h-full max-w-375 pb-10 text-[#1c1b1b]">
      <header className="mb-6">
        <p className="font-body text-xs font-bold uppercase tracking-[0.18em] text-marica-amber-text">Marica Point of Sale</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-marica-ink">Riwayat penjaga</h1>
        <p className="mt-1 font-body text-sm text-marica-ink-soft">Rekap shift dan transaksi penjaga kasir.</p>
      </header>
      {activeShift && (
        <section className="mb-6 rounded-3xl border border-marica-amber/30 bg-marica-amber/10 p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-body text-xs font-bold uppercase tracking-[0.14em] text-marica-amber-text">Shift aktif</p>
              <p className="mt-1 font-body text-base font-bold text-marica-ink">{activeShift.cashier.name ?? activeShift.cashier.email ?? "Penjaga"}</p>
              <p className="font-body text-sm text-marica-ink-soft">Mulai {new Date(activeShift.openedAt).toLocaleString("id-ID")}</p>
            </div>
            <div className="text-left sm:text-right">
              <span className="inline-flex rounded-full bg-marica-amber-dark px-3 py-1 font-body text-xs font-bold text-white">{activeShift.cashier.role}</span>
              <p className="mt-2 font-body text-sm font-semibold text-marica-ink">Kas awal {money(activeShift.openingCash)}</p>
            </div>
          </div>
        </section>
      )}
      <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-6">
        {isLoading ? <p className="py-10 text-center font-body text-sm text-marica-ink-soft">Memuat riwayat...</p> : error ? <p className="rounded-2xl bg-marica-rose-deep/10 p-4 font-body text-sm text-marica-rose-deep">{error}</p> : history.length === 0 ? <p className="py-10 text-center font-body text-sm text-marica-ink-soft">Belum ada riwayat shift.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 text-left">
              <thead><tr className="border-b border-black/5 font-body text-xs uppercase tracking-wide text-marica-ink-soft/60"><th className="pb-3">Penjaga / role</th><th className="pb-3">Waktu shift</th><th className="pb-3">Transaksi</th><th className="pb-3">Omzet</th><th className="pb-3">Status</th></tr></thead>
              <tbody>{history.map((item) => <tr key={item.id} className="border-b border-black/5 last:border-0">
                <td className="py-4"><p className="font-body text-sm font-bold text-marica-ink">{item.cashier.name ?? item.cashier.email ?? "Penjaga"}</p><span className="mt-1 inline-flex rounded-full bg-marica-sky-light/70 px-2 py-0.5 font-body text-[10px] font-bold uppercase tracking-wide text-marica-ink-soft">{item.cashier.role}</span><p className="font-body text-xs text-marica-ink-soft">Kas awal {money(item.openingCash)}</p></td>
                <td className="py-4 font-body text-xs text-marica-ink-soft">{new Date(item.openedAt).toLocaleString("id-ID")}{item.closedAt && <span className="block">s/d {new Date(item.closedAt).toLocaleString("id-ID")}</span>}</td>
                <td className="py-4 font-body text-sm font-bold text-marica-ink">{item.transactionCount.toLocaleString("id-ID")}</td>
                <td className="py-4 font-body text-sm font-bold text-marica-ink">{money(item.transactionTotal)}</td>
                <td className="py-4"><span className={`rounded-full px-2.5 py-1 font-body text-xs font-bold ${item.status === "OPEN" ? "bg-marica-green/10 text-green-700" : "bg-marica-sky-light/60 text-marica-ink-soft"}`}>{item.status === "OPEN" ? "Aktif" : "Selesai"}</span></td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
        {!isLoading && !error && totalPages > 1 && <div className="mt-5 flex items-center justify-center gap-2">
          <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} aria-label="Riwayat sebelumnya" className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-marica-ink-soft disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => <button key={item} type="button" onClick={() => setPage(item)} aria-current={page === item ? "page" : undefined} className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-3 font-body text-sm font-bold ${page === item ? "bg-marica-amber-dark text-white" : "border border-black/10 text-marica-ink-soft"}`}>{item}</button>)}
          <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} aria-label="Riwayat berikutnya" className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-marica-ink-soft disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>}
      </section>
    </div>
  );
}
