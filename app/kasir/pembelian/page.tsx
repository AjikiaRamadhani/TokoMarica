"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ReceiptText, Search, UserRound } from "lucide-react";

type Sale = {
  id: string; transactionNumber: string; status: string; total: number; paymentMethod: string; createdAt: string;
  customer: { name: string | null; email: string | null; whatsapp: string | null } | null;
  items: { itemName: string; quantity: number }[];
};
const money = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

export default function PurchaseHistoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isVoiding, setIsVoiding] = useState<string | null>(null);
  useEffect(() => {
    // Data loading updates state asynchronously after the component is mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    fetch(`/api/cashier/sales?page=${page}&limit=10`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "Riwayat gagal dimuat.");
        setSales(Array.isArray(data.sales) ? data.sales : []);
        setTotalPages(Math.max(1, data.pagination?.totalPages ?? 1));
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Riwayat gagal dimuat."))
      .finally(() => setIsLoading(false));
  }, [page]);
  const visibleSales = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sales.filter((sale) => !needle || [sale.transactionNumber, sale.customer?.name, sale.customer?.email].filter(Boolean).some((value) => value!.toLowerCase().includes(needle)));
  }, [query, sales]);
  async function printReceipt(id: string) {
    const response = await fetch(`/api/cashier/sales/${id}/receipt`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setError(data.error ?? "Struk gagal dimuat."); return; }
    const popup = window.open("", "_blank", "width=420,height=720");
    if (!popup) { setError("Izinkan pop-up browser untuk mencetak struk."); return; }
    popup.document.write(`<html><head><title>Struk ${data.transactionNumber}</title></head><body><h2>Marica.id</h2><p>${data.transactionNumber}</p><p>${data.customerName}</p>${data.items.map((item: { name: string; quantity: number; subtotal: number }) => `<p>${item.name} x${item.quantity} - ${money(item.subtotal)}</p>`).join("")}<h3>Total: ${money(data.total)}</h3></body></html>`);
    popup.document.close(); popup.focus(); popup.print();
  }
  async function voidSale(sale: Sale) {
    if (!window.confirm(`Void transaksi ${sale.transactionNumber}?`)) return;
    setIsVoiding(sale.id);
    const response = await fetch(`/api/cashier/sales/${sale.id}/void`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setIsVoiding(null);
    if (!response.ok) { setError(data.error ?? "Transaksi gagal di-void."); return; }
    setSales((current) => current.map((item) => item.id === sale.id ? { ...item, status: "VOIDED" } : item));
  }
  return (
    <div className="mx-auto max-w-375 pb-10">
      <header className="mb-6"><p className="font-body text-xs font-bold uppercase tracking-[0.18em] text-marica-amber-text">Marica Point of Sale</p><h1 className="mt-1 font-display text-3xl font-semibold text-marica-ink">Riwayat pembelian</h1><p className="mt-1 font-body text-sm text-marica-ink-soft">Daftar pembelian dan akun member.</p></header>
      <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-6">
        <div className="relative max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-marica-ink-soft/60" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Cari kode transaksi atau member..." className="w-full rounded-xl border border-black/10 bg-marica-sky-light/20 py-2.5 pl-9 pr-3 font-body text-sm outline-none focus:border-marica-amber-dark focus:ring-4 focus:ring-marica-amber/15" /></div>
        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 font-body text-sm text-red-700">{error}</p>}
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-240 text-left"><thead><tr className="border-b border-black/5 font-body text-xs uppercase tracking-wide text-marica-ink-soft/60"><th className="pb-3">Transaksi</th><th className="pb-3">Yang dibeli</th><th className="pb-3">Member</th><th className="pb-3">Pembayaran</th><th className="pb-3">Total</th><th className="pb-3">Status</th><th className="pb-3 text-right">Aksi</th></tr></thead>
          <tbody>{isLoading ? <tr><td colSpan={7} className="py-10 text-center font-body text-sm text-marica-ink-soft">Memuat riwayat...</td></tr> : visibleSales.length === 0 ? <tr><td colSpan={7} className="py-10 text-center font-body text-sm text-marica-ink-soft">Belum ada pembelian yang cocok.</td></tr> : visibleSales.map((sale) => <tr key={sale.id} className="border-b border-black/5 last:border-0">
            <td className="py-4"><p className="font-body text-sm font-bold text-marica-ink">{sale.transactionNumber}</p><p className="font-body text-xs text-marica-ink-soft">{new Date(sale.createdAt).toLocaleString("id-ID")}</p></td>
            <td className="max-w-80 py-3"><div className="space-y-1.5">{sale.items.map((item, index) => <div key={`${item.itemName}-${index}`} className="flex items-center justify-between gap-4 rounded-lg bg-marica-sky-light/40 px-2.5 py-1.5 font-body text-xs"><span className="min-w-0 truncate font-semibold text-marica-ink">{item.itemName}</span><span className="shrink-0 text-marica-ink-soft">x{item.quantity}</span></div>)}</div></td>
            <td className="min-w-52 py-3">{sale.customer ? <div className="flex items-start gap-2"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-marica-amber/20 text-marica-amber-text"><UserRound className="h-3.5 w-3.5" /></span><div className="min-w-0 font-body text-xs"><p className="truncate font-bold text-marica-ink">{sale.customer.name ?? "Member Marica"}</p><p className="truncate text-marica-ink-soft">{sale.customer.email ?? sale.customer.whatsapp ?? "Akun member"}</p></div></div> : <span className="font-body text-xs text-marica-ink-soft">Non-member</span>}</td>
            <td className="py-4 font-body text-sm text-marica-ink-soft">{sale.paymentMethod}</td><td className="py-4 font-body text-sm font-bold text-marica-ink">{money(sale.total)}</td><td className="py-4"><span className={`rounded-full px-2.5 py-1 font-body text-xs font-bold ${sale.status === "VOIDED" ? "bg-marica-rose-deep/10 text-marica-rose-deep" : "bg-marica-green/10 text-green-700"}`}>{sale.status === "VOIDED" ? "Void" : "Selesai"}</span></td>
            <td className="py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => void printReceipt(sale.id)} title="Cetak struk" className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 text-marica-ink-soft hover:bg-marica-sky-light/50"><ReceiptText className="h-4 w-4" /></button>{sale.status === "COMPLETED" && <button type="button" disabled={isVoiding === sale.id} onClick={() => void voidSale(sale)} className="rounded-lg border border-marica-rose-deep/30 px-2.5 py-1.5 font-body text-xs font-bold text-marica-rose-deep hover:bg-marica-rose-deep/10 disabled:opacity-50">{isVoiding === sale.id ? "..." : "Void"}</button>}</div></td>
          </tr>)}</tbody></table></div>
        {!isLoading && totalPages > 1 && <div className="mt-4 flex items-center justify-center gap-2"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-marica-ink-soft disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span className="font-body text-xs text-marica-ink-soft">Halaman {page} / {totalPages}</span><button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-marica-ink-soft disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div>}
      </section>
    </div>
  );
}
