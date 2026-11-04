"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, X } from "lucide-react";

type Campaign = {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  preorderOpenAt: string;
  preorderCloseAt: string | null;
  releaseAt: string;
  stockLimit: number | null;
  reservedQuantity: number;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "COMPLETED";
  product: { id: string; name: string; slug: string; price: number };
  _count?: { reservations: number };
  reservations?: Reservation[];
};

type Reservation = {
  id: string;
  reservationNumber: string;
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string | null;
  quantity: number;
  totalPrice: number;
  status: "PENDING_PAYMENT" | "PAID" | "CANCELLED" | "EXPIRED";
  paidAt: string | null;
  createdAt: string;
};

type Form = {
  productId: string;
  slug: string;
  title: string;
  description: string;
  price: string;
  preorderOpenAt: string;
  preorderCloseAt: string;
  releaseAt: string;
  stockLimit: string;
  status: Campaign["status"];
};

const emptyForm: Form = { productId: "", slug: "", title: "", description: "", price: "", preorderOpenAt: "", preorderCloseAt: "", releaseAt: "", stockLimit: "", status: "DRAFT" };

export default function AdminPreordersPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);

  async function confirmPayment(reservation: Reservation) {
    setConfirming(reservation.id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/bookings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "PREORDER", id: reservation.id, status: "PAID" }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Gagal mengonfirmasi pembayaran");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal mengonfirmasi pembayaran");
    } finally {
      setConfirming(null);
    }
  }

  async function load() {
    const response = await fetch("/api/admin/preorders", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Campaign gagal dimuat");
    setCampaigns(data);
  }

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((error) => setMessage(error instanceof Error ? error.message : "Campaign gagal dimuat")).finally(() => setLoading(false));
  }, []);

  function edit(campaign?: Campaign) {
    setEditing(campaign ?? null);
    setForm(campaign ? {
      productId: campaign.product.id,
      slug: campaign.slug,
      title: campaign.title,
      description: campaign.description,
      price: String(campaign.price),
      preorderOpenAt: campaign.preorderOpenAt.slice(0, 16),
      preorderCloseAt: campaign.preorderCloseAt?.slice(0, 16) ?? "",
      releaseAt: campaign.releaseAt.slice(0, 16),
      stockLimit: campaign.stockLimit === null ? "" : String(campaign.stockLimit),
      status: campaign.status,
    } : emptyForm);
    setOpen(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const payload = { ...form, price: Number(form.price), stockLimit: form.stockLimit ? Number(form.stockLimit) : null, preorderCloseAt: form.preorderCloseAt || null };
    const response = await fetch(editing ? `/api/admin/preorders/${editing.id}` : "/api/admin/preorders", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) setMessage(data.error ?? "Campaign gagal disimpan");
    else { setOpen(false); await load(); }
    setSaving(false);
  }

  return <section>
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-body text-xs font-semibold uppercase tracking-[0.16em] text-marica-amber-dark">Admin Portal / Produk</p><h1 className="mt-1 font-display text-3xl font-bold">Rilis Eksklusif</h1><p className="mt-2 text-sm text-marica-ink-soft">Kelola campaign pre-order dan kuota produk edugame eksklusif.</p></div><button type="button" onClick={() => edit()} className="inline-flex items-center gap-2 rounded-full bg-marica-amber-dark px-4 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />Campaign baru</button></div>
    {message && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{message}</p>}
    {loading ? <Loader2 className="mt-10 h-6 w-6 animate-spin" /> : <div className="mt-8 grid gap-4 lg:grid-cols-2">{campaigns.map((campaign) => <article key={campaign.id} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-marica-amber-dark">{campaign.product.name}</p><h2 className="mt-1 font-display text-xl font-bold">{campaign.title}</h2></div><span className="rounded-full bg-marica-sky-light px-2.5 py-1 text-xs font-bold">{campaign.status}</span></div><p className="mt-3 line-clamp-2 text-sm text-marica-ink-soft">{campaign.description}</p><div className="mt-4 grid grid-cols-2 gap-2 text-xs text-marica-ink-soft"><span>Harga: <strong>Rp{campaign.price.toLocaleString("id-ID")}</strong></span><span>Reservasi: <strong>{campaign._count?.reservations ?? 0}</strong></span><span>Kuota: <strong>{campaign.stockLimit ?? "Tanpa batas"}</strong></span><span>Terpakai: <strong>{campaign.reservedQuantity}</strong></span></div><details className="mt-5 rounded-xl border border-black/10"><summary className="cursor-pointer px-3 py-3 text-sm font-bold">Daftar pembeli ({campaign.reservations?.length ?? 0})</summary><div className="border-t border-black/5 px-3">{campaign.reservations?.length ? campaign.reservations.map((reservation) => <div key={reservation.reservationNumber} className="border-b border-black/5 py-3 last:border-0"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold">{reservation.customerName}</p><p className="text-xs text-marica-ink-soft">{reservation.customerEmail}{reservation.customerWhatsapp ? ` · ${reservation.customerWhatsapp}` : ""}</p></div><span className="rounded-full bg-marica-sky-light px-2 py-1 text-[10px] font-bold">{reservation.status}</span></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-marica-ink-soft"><span>{reservation.reservationNumber}</span><span>{reservation.quantity} unit</span><strong>Rp{reservation.totalPrice.toLocaleString("id-ID")}</strong></div>{reservation.status === "PENDING_PAYMENT" && <button type="button" onClick={() => void confirmPayment(reservation)} disabled={confirming !== null} className="mt-3 rounded-lg bg-marica-amber-dark px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{confirming === reservation.id ? "Memproses..." : "Konfirmasi pembayaran"}</button>}</div>) : <p className="py-4 text-sm text-marica-ink-soft">Belum ada pembeli untuk campaign ini.</p>}</div></details><button type="button" onClick={() => edit(campaign)} className="mt-5 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold"><Pencil className="h-3.5 w-3.5" />Edit campaign</button></article>)}</div>}
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/30 p-5"><form onSubmit={save} className="my-8 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl"><div className="flex items-center justify-between"><h2 className="font-display text-2xl font-bold">{editing ? "Edit campaign" : "Campaign baru"}</h2><button type="button" onClick={() => setOpen(false)} title="Tutup"><X /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><input required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} placeholder="Product ID (bukan nama/slug)" className="rounded-xl border px-4 py-3 text-sm sm:col-span-2" disabled={Boolean(editing)} /><p className="-mt-1 text-xs text-marica-ink-soft sm:col-span-2">Gunakan ID produk yang tersimpan di database. Jika memakai nama atau slug, campaign tidak dapat dibuat.</p><input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="Slug" className="rounded-xl border px-4 py-3 text-sm" disabled={Boolean(editing)} /><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Judul campaign" className="rounded-xl border px-4 py-3 text-sm" /><textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi" rows={4} className="rounded-xl border px-4 py-3 text-sm sm:col-span-2" /><input required type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Harga" className="rounded-xl border px-4 py-3 text-sm" /><input type="number" min="1" value={form.stockLimit} onChange={(e) => setForm({ ...form, stockLimit: e.target.value })} placeholder="Batas kuota (opsional)" className="rounded-xl border px-4 py-3 text-sm" /><label className="text-xs text-marica-ink-soft">Mulai<input required type="datetime-local" value={form.preorderOpenAt} onChange={(e) => setForm({ ...form, preorderOpenAt: e.target.value })} className="mt-1 w-full rounded-xl border px-4 py-3 text-sm text-marica-ink" /></label><label className="text-xs text-marica-ink-soft">Tutup<input type="datetime-local" value={form.preorderCloseAt} onChange={(e) => setForm({ ...form, preorderCloseAt: e.target.value })} className="mt-1 w-full rounded-xl border px-4 py-3 text-sm text-marica-ink" /></label><label className="text-xs text-marica-ink-soft">Tanggal rilis<input required type="datetime-local" value={form.releaseAt} onChange={(e) => setForm({ ...form, releaseAt: e.target.value })} className="mt-1 w-full rounded-xl border px-4 py-3 text-sm text-marica-ink" /></label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Form["status"] })} className="rounded-xl border px-4 py-3 text-sm"><option value="DRAFT">Draft</option><option value="PUBLISHED">Terbitkan</option><option value="CLOSED">Tutup</option><option value="COMPLETED">Selesai</option></select></div><button disabled={saving} className="mt-5 w-full rounded-full bg-marica-amber-dark py-3 font-bold text-white">{saving ? "Menyimpan..." : "Simpan campaign"}</button></form></div>}
  </section>;
}
