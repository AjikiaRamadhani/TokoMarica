"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarClock, CheckCircle2, Loader2, Package, Sparkles, Ticket, Users } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

type Campaign = { id: string; slug: string; title: string; description: string; price: number; preorderOpenAt: string; preorderCloseAt: string | null; releaseAt: string; stockLimit: number | null; reservedQuantity: number; remaining: number | null; product: { name: string; images: { url: string }[] } };
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const date = (value: string) => new Date(value).toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" });

export default function PreorderPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetch("/api/preorders", { cache: "no-store" }).then((response) => response.json()).then((data) => setCampaigns(Array.isArray(data) ? data : [])).catch(() => setError("Campaign belum dapat dimuat.")).finally(() => setLoading(false)); }, []);
  const selectedRemaining = selected?.remaining ?? Infinity;
  const releaseText = useMemo(() => selected ? date(selected.releaseAt) : "-", [selected]);

  async function submit() {
    if (!selected) return;
    setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/preorders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: selected.id, quantity, whatsapp }) });
      const data = await response.json();
      if (response.status === 401) return router.push(`/login?callbackUrl=${encodeURIComponent("/preorder")}`);
      if (!response.ok) throw new Error(data.error ?? "Pre-order gagal dibuat");
      if (data.reservation?.reservationNumber) {
        router.push(`/preorder/hasil?reservation=${encodeURIComponent(data.reservation.reservationNumber)}`);
      }
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Pre-order gagal dibuat"); setSubmitting(false); }
  }

  return <div className="flex min-h-screen flex-col bg-[#fdf8f1] font-body text-marica-ink"><Navbar /><main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 sm:px-10 lg:px-16 lg:py-16">
    <section className="rounded-[2rem] bg-marica-sky-light/25 px-6 py-12 sm:px-10"><p className="font-body text-sm font-bold uppercase tracking-[0.18em] text-marica-amber-dark">Exclusive release</p><h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight sm:text-6xl">Produk edugame baru, hadir lebih dulu untuk kamu.</h1><p className="mt-5 max-w-2xl text-base leading-relaxed text-marica-ink-soft">Amankan produk self-published Marica sebelum rilis resmi. Jumlah batch perdana terbatas.</p><div className="mt-7 flex flex-wrap gap-3 text-sm font-semibold text-marica-ink-soft"><span className="rounded-full bg-white px-4 py-2"><Sparkles className="mr-2 inline h-4 w-4 text-marica-amber-dark" />Rilis eksklusif</span><span className="rounded-full bg-white px-4 py-2"><Package className="mr-2 inline h-4 w-4 text-marica-amber-dark" />Batch terbatas</span></div></section>
    <div className="mt-12 flex items-end justify-between gap-4"><div><h2 className="font-display text-3xl font-bold">Campaign yang sedang dibuka</h2><p className="mt-2 text-sm text-marica-ink-soft">Pilih produk yang ingin kamu amankan.</p></div><a href="#cara-kerja" className="hidden text-sm font-semibold text-marica-amber-dark sm:block">Cara kerja</a></div>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    {loading ? <div className="flex justify-center py-20 text-sm text-marica-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Memuat campaign...</div> : campaigns.length === 0 ? <div className="mt-8 rounded-2xl bg-white p-10 text-center text-sm text-marica-ink-soft">Belum ada campaign pre-order yang dibuka.</div> : <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{campaigns.map((campaign) => <article key={campaign.id} className="overflow-hidden rounded-3xl bg-white shadow-sm"><div className="flex h-48 items-center justify-center bg-marica-cream p-6">{campaign.product.images[0]?.url ? <img src={campaign.product.images[0].url} alt={campaign.product.name} className="h-full w-full object-contain" /> : <Package className="h-16 w-16 text-marica-amber-dark/50" />}</div><div className="p-6"><p className="text-xs font-bold uppercase tracking-wide text-marica-amber-dark">{campaign.product.name}</p><h3 className="mt-2 font-display text-xl font-bold">{campaign.title}</h3><p className="mt-3 line-clamp-3 text-sm leading-relaxed text-marica-ink-soft">{campaign.description}</p><div className="mt-5 flex items-center justify-between text-sm"><span className="font-bold text-marica-amber-dark">{money(campaign.price)}</span><span className="text-marica-ink-soft">{campaign.remaining === null ? "Tanpa batas" : `${campaign.remaining} tersisa`}</span></div><button type="button" onClick={() => { setSelected(campaign); setQuantity(1); setError(""); }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-marica-amber-dark px-4 py-3 text-sm font-bold text-white">Lihat detail <ArrowRight className="h-4 w-4" /></button></div></article>)}</div>}
    <section id="cara-kerja" className="mt-16 grid gap-4 md:grid-cols-3"><InfoCard icon={<Ticket />} title="Pilih campaign" text="Lihat produk dan kuota batch perdana yang tersedia." /><InfoCard icon={<Users />} title="Isi jumlah pesanan" text="Login dan lanjutkan pembayaran melalui Midtrans." /><InfoCard icon={<CalendarClock />} title="Tunggu tanggal rilis" text="Produk dikirim atau diproses sesuai informasi campaign." /></section>
  </main><Footer />
  {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-marica-ink/40 px-4 py-6" onClick={() => setSelected(null)}><div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-marica-amber-dark">Detail exclusive release</p><h2 className="mt-2 font-display text-2xl font-bold">{selected.title}</h2></div><button type="button" onClick={() => setSelected(null)} aria-label="Tutup" className="text-2xl text-marica-ink-soft">×</button></div><p className="mt-5 text-sm leading-relaxed text-marica-ink-soft">{selected.description}</p><div className="mt-5 divide-y divide-black/5 rounded-2xl bg-marica-sky-light/25 px-4"><Summary label="Harga" value={money(selected.price)} /><Summary label="Pre-order ditutup" value={selected.preorderCloseAt ? date(selected.preorderCloseAt) : "Sampai kuota habis"} /><Summary label="Tanggal rilis" value={releaseText} /><Summary label="Sisa kuota" value={selected.remaining === null ? "Tidak terbatas" : `${selected.remaining} unit`} /></div><label className="mt-6 block text-sm font-semibold">Jumlah<input type="number" min={1} max={selectedRemaining === Infinity ? undefined : selectedRemaining} value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(Number(event.target.value) || 1, selectedRemaining)))} className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-marica-amber-dark" /></label>  <label className="mt-4 block text-sm font-semibold">WhatsApp (opsional)<input type="tel" inputMode="numeric" pattern="[0-9]{8,15}" maxLength={15} value={whatsapp} onChange={(event) => setWhatsapp(event.target.value.replace(/\D/g, ""))} placeholder="08xxxxxxxxxx" className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-marica-amber-dark" /></label>{error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<button type="button" disabled={submitting || selectedRemaining === 0} onClick={() => void submit()} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-marica-amber-dark px-4 py-3.5 font-bold text-white disabled:opacity-50">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}{submitting ? "Menyiapkan pembayaran..." : "Pre-order sekarang"}</button></div></div>}
  </div>;
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4 py-3 text-sm"><span className="text-marica-ink-soft">{label}</span><strong className="text-right">{value}</strong></div>; }
function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="rounded-2xl bg-white p-5 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-marica-amber/15 text-marica-amber-dark">{icon}</span><h3 className="mt-4 font-display text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-marica-ink-soft">{text}</p><CheckCircle2 className="mt-4 h-4 w-4 text-marica-green" /></div>; }
