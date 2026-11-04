"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Edit3, Loader2, Plus, RefreshCw, Trash2, Users } from "lucide-react";

type Tab = "subscriptions" | "plans" | "activities";
type Subscription = { id: string; subscriptionNumber: string; status: string; nextBillingAt: string; nextDeliveryAt: string; user: { name: string | null; email: string | null }; plan: { name: string; price: number }; cycles: { id: string; cycleNumber: string; amount: number; status: string; delivery?: { status: string } | null }[] };
type Plan = { id: string; slug: string; name: string; description: string; price: number; interval: "MONTHLY" | "QUARTERLY"; isActive: boolean; _count?: { subscriptions: number } };
type Activity = { id: string; slug: string; title: string; description: string; contentType: string; videoUrl: string | null; guideUrl: string | null; thumbnailUrl: string | null; ageMin: number | null; ageMax: number | null; sortOrder: number; isPublished: boolean };
type PlanForm = { slug: string; name: string; description: string; price: string; interval: "MONTHLY" | "QUARTERLY"; isActive: boolean };
type ActivityForm = { slug: string; title: string; description: string; contentType: string; videoUrl: string; guideUrl: string; thumbnailUrl: string; ageMin: string; ageMax: string; sortOrder: string; isPublished: boolean };

const emptyPlan: PlanForm = { slug: "", name: "", description: "", price: "", interval: "MONTHLY", isActive: true };
const emptyActivity: ActivityForm = { slug: "", title: "", description: "", contentType: "GUIDE", videoUrl: "", guideUrl: "", thumbnailUrl: "", ageMin: "3", ageMax: "8", sortOrder: "1", isPublished: false };
const date = (value: string) => new Date(value).toLocaleDateString("id-ID");

export default function AdminSubscriptionsPage() {
  const [tab, setTab] = useState<Tab>("subscriptions");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [form, setForm] = useState<PlanForm>(emptyPlan);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [activityMessage, setActivityMessage] = useState("");
  const [activityForm, setActivityForm] = useState<ActivityForm>(emptyActivity);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [activitySaving, setActivitySaving] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  async function confirmPayment(cycle: Subscription["cycles"][number]) {
    setConfirming(cycle.id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/bookings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "SUBSCRIPTION", id: cycle.id, status: "PAID" }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Gagal mengonfirmasi pembayaran");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal mengonfirmasi pembayaran");
    } finally {
      setConfirming(null);
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const [subscriptionsResponse, plansResponse] = await Promise.all([
        fetch("/api/admin/subscriptions", { cache: "no-store" }),
        fetch("/api/admin/subscription-plans", { cache: "no-store" }),
      ]);
      const subscriptionsData = await subscriptionsResponse.json().catch(() => ({}));
      const plansData = await plansResponse.json().catch(() => ({}));
      if (!subscriptionsResponse.ok) throw new Error(subscriptionsData.error ?? "Gagal memuat subscription");
      if (!plansResponse.ok) throw new Error(plansData.error ?? "Gagal memuat paket");
      setSubscriptions(Array.isArray(subscriptionsData) ? subscriptionsData : []);
      setPlans(Array.isArray(plansData) ? plansData : []);

      const activitiesResponse = await fetch("/api/admin/subscription-activities", { cache: "no-store" });
      const activitiesContentType = activitiesResponse.headers.get("content-type") ?? "";
      if (activitiesResponse.ok && activitiesContentType.includes("application/json")) {
        const activitiesData = await activitiesResponse.json();
        setActivities(Array.isArray(activitiesData) ? activitiesData : []);
      } else {
        setActivities([]);
        setActivityMessage("API activity subscription belum tersedia.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat data subscription");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, []);

  function openPlanForm(plan?: Plan) {
    setEditing(plan ?? null);
    setForm(plan ? { slug: plan.slug, name: plan.name, description: plan.description, price: String(plan.price), interval: plan.interval, isActive: plan.isActive } : emptyPlan);
    setShowForm(true);
  }

  async function savePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const url = editing ? `/api/admin/subscription-plans/${editing.id}` : "/api/admin/subscription-plans";
    const response = await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, price: Number(form.price) }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(data.error ?? "Paket gagal disimpan");
    else { setShowForm(false); await loadData(); }
    setSaving(false);
  }

  async function deactivatePlan(id: string) {
    if (!window.confirm("Nonaktifkan paket ini?")) return;
    const response = await fetch(`/api/admin/subscription-plans/${id}`, { method: "DELETE" });
    if (!response.ok) setMessage("Paket gagal dinonaktifkan");
    await loadData();
  }

  function openActivityForm(activity?: Activity) {
    setEditingActivity(activity ?? null);
    setActivityForm(activity ? { slug: activity.slug, title: activity.title, description: activity.description, contentType: activity.contentType, videoUrl: activity.videoUrl ?? "", guideUrl: activity.guideUrl ?? "", thumbnailUrl: activity.thumbnailUrl ?? "", ageMin: activity.ageMin == null ? "" : String(activity.ageMin), ageMax: activity.ageMax == null ? "" : String(activity.ageMax), sortOrder: String(activity.sortOrder), isPublished: activity.isPublished } : emptyActivity);
  }

  async function saveActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActivitySaving(true);
    setActivityMessage("");
    const response = await fetch(editingActivity ? `/api/admin/subscription-activities/${editingActivity.id}` : "/api/admin/subscription-activities", { method: editingActivity ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...activityForm, ageMin: activityForm.ageMin ? Number(activityForm.ageMin) : null, ageMax: activityForm.ageMax ? Number(activityForm.ageMax) : null, sortOrder: Number(activityForm.sortOrder) }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setActivityMessage(data.error ?? "Activity gagal disimpan");
    else { setActivityMessage("Activity berhasil disimpan."); setEditingActivity(null); setActivityForm(emptyActivity); await loadData(); }
    setActivitySaving(false);
  }

  async function deleteActivity(id: string) {
    if (!window.confirm("Hapus activity ini?")) return;
    const response = await fetch(`/api/admin/subscription-activities/${id}`, { method: "DELETE" });
    if (!response.ok) setActivityMessage("Activity gagal dihapus");
    await loadData();
  }

  const tabs = [
    { id: "subscriptions" as const, label: "Pelanggan", icon: Users },
    { id: "plans" as const, label: "Paket", icon: ClipboardList },
    { id: "activities" as const, label: "Activity", icon: Edit3 },
  ];

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Subscription</h1>
          <p className="mt-2 text-sm text-marica-ink-soft">Kelola pelanggan, paket Edu-Kit, dan konten eksklusif dari satu halaman.</p>
        </div>
        <button type="button" onClick={() => void loadData()} className="inline-flex items-center gap-2 rounded-full border border-marica-ink/10 bg-white px-4 py-2 text-sm font-bold"><RefreshCw className="h-4 w-4" />Refresh</button>
      </div>
      {message && <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{message}</p>}
      <div className="mt-8 flex flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-sm">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${tab === id ? "bg-marica-amber-dark text-white" : "text-marica-ink-soft hover:bg-marica-cream/60"}`}><Icon className="h-4 w-4" />{label}</button>)}
      </div>
      {loading ? <Loader2 className="mt-10 h-6 w-6 animate-spin" /> : tab === "subscriptions" ? (
        <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-marica-cream/60 text-xs uppercase"><tr><th className="p-4">Pelanggan</th><th className="p-4">Paket</th><th className="p-4">Status</th><th className="p-4">Billing</th><th className="p-4">Pengiriman</th><th className="p-4">Cycle</th></tr></thead><tbody>{subscriptions.map((item) => { const cycle = item.cycles[0]; return <tr key={item.id} className="border-t border-black/5"><td className="p-4"><strong>{item.user.name ?? "-"}</strong><br /><span className="text-xs text-marica-ink-soft">{item.user.email}</span></td><td className="p-4">{item.plan.name}<br />Rp{item.plan.price.toLocaleString("id-ID")}</td><td className="p-4"><span className="rounded-full bg-marica-amber/20 px-2 py-1 text-xs font-bold">{item.status}</span></td><td className="p-4">{date(item.nextBillingAt)}</td><td className="p-4">{date(item.nextDeliveryAt)}</td><td className="p-4"><span>{cycle?.status ?? "-"}</span>{cycle?.status === "PENDING_PAYMENT" && <button type="button" onClick={() => void confirmPayment(cycle)} disabled={confirming !== null} className="mt-2 block rounded-lg bg-marica-amber-dark px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{confirming === cycle.id ? "Memproses..." : "Konfirmasi pembayaran"}</button>}</td></tr>; })}</tbody></table>{!subscriptions.length && <p className="p-10 text-center text-sm text-marica-ink-soft">Belum ada subscription.</p>}</div>
      ) : tab === "plans" ? (
        <div className="mt-6"><div className="flex justify-end"><button type="button" onClick={() => openPlanForm()} className="inline-flex items-center gap-2 rounded-full bg-marica-amber-dark px-4 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />Tambah Paket</button></div><div className="mt-4 grid gap-4 md:grid-cols-2">{plans.map((plan) => <article key={plan.id} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex justify-between gap-3"><div><h2 className="font-display text-xl font-bold">{plan.name}</h2><p className="mt-1 text-xs text-marica-ink-soft">{plan.slug} · {plan.interval}</p></div><span className={`h-fit rounded-full px-2 py-1 text-xs font-bold ${plan.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{plan.isActive ? "Aktif" : "Nonaktif"}</span></div><p className="mt-4 text-sm text-marica-ink-soft">{plan.description}</p><p className="mt-4 font-display text-2xl font-bold">Rp{plan.price.toLocaleString("id-ID")}</p><p className="text-xs text-marica-ink-soft">{plan._count?.subscriptions ?? 0} pelanggan</p><div className="mt-5 flex gap-2"><button type="button" onClick={() => openPlanForm(plan)} className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold"><Edit3 className="h-3.5 w-3.5" />Edit</button>{plan.isActive && <button type="button" onClick={() => void deactivatePlan(plan.id)} className="inline-flex items-center gap-2 rounded-full border border-red-200 px-3 py-2 text-xs font-bold text-red-600"><Trash2 className="h-3.5 w-3.5" />Nonaktifkan</button>}</div></article>)}</div></div>
      ) : (
        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-xl font-bold">Konten Activity Subscription</h2><p className="mt-1 text-sm text-marica-ink-soft">Kelola konten yang hanya dapat diakses pelanggan aktif.</p></div><button type="button" onClick={() => openActivityForm()} className="inline-flex items-center gap-2 rounded-full bg-marica-amber-dark px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" />Tambah Activity</button></div>{activityMessage && <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{activityMessage}</p>}<form onSubmit={saveActivity} className="mt-5 grid gap-3 rounded-2xl border border-black/5 bg-marica-cream/20 p-4 md:grid-cols-2"><h3 className="font-display text-lg font-bold md:col-span-2">{editingActivity ? "Edit activity" : "Activity baru"}</h3><input required value={activityForm.title} onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })} placeholder="Judul activity" className="rounded-xl border px-3 py-2.5 text-sm" /><input required value={activityForm.slug} onChange={(e) => setActivityForm({ ...activityForm, slug: e.target.value })} placeholder="Slug" className="rounded-xl border px-3 py-2.5 text-sm" /><select value={activityForm.contentType} onChange={(e) => setActivityForm({ ...activityForm, contentType: e.target.value })} className="rounded-xl border px-3 py-2.5 text-sm"><option value="GUIDE">Panduan</option><option value="VIDEO">Video</option><option value="ACTIVITY">Aktivitas</option></select><input type="number" min="0" value={activityForm.sortOrder} onChange={(e) => setActivityForm({ ...activityForm, sortOrder: e.target.value })} placeholder="Urutan" className="rounded-xl border px-3 py-2.5 text-sm" /><input type="number" min="0" value={activityForm.ageMin} onChange={(e) => setActivityForm({ ...activityForm, ageMin: e.target.value })} placeholder="Usia minimum" className="rounded-xl border px-3 py-2.5 text-sm" /><input type="number" min="0" value={activityForm.ageMax} onChange={(e) => setActivityForm({ ...activityForm, ageMax: e.target.value })} placeholder="Usia maksimum" className="rounded-xl border px-3 py-2.5 text-sm" /><input value={activityForm.videoUrl} onChange={(e) => setActivityForm({ ...activityForm, videoUrl: e.target.value })} placeholder="URL video (opsional)" className="rounded-xl border px-3 py-2.5 text-sm" /><input value={activityForm.guideUrl} onChange={(e) => setActivityForm({ ...activityForm, guideUrl: e.target.value })} placeholder="URL PDF/panduan (opsional)" className="rounded-xl border px-3 py-2.5 text-sm" /><input value={activityForm.thumbnailUrl} onChange={(e) => setActivityForm({ ...activityForm, thumbnailUrl: e.target.value })} placeholder="URL thumbnail (opsional)" className="rounded-xl border px-3 py-2.5 text-sm md:col-span-2" /><textarea required value={activityForm.description} onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })} placeholder="Deskripsi activity" rows={3} className="rounded-xl border px-3 py-2.5 text-sm md:col-span-2" /><label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={activityForm.isPublished} onChange={(e) => setActivityForm({ ...activityForm, isPublished: e.target.checked })} /> Publish untuk pelanggan aktif</label><div className="flex gap-2 md:col-span-2"><button disabled={activitySaving} className="rounded-xl bg-marica-amber-dark px-4 py-2.5 text-sm font-bold text-white">{activitySaving ? "Menyimpan..." : editingActivity ? "Simpan perubahan" : "Simpan activity"}</button>{editingActivity && <button type="button" onClick={() => { setEditingActivity(null); setActivityForm(emptyActivity); }} className="rounded-xl border px-4 py-2.5 text-sm font-bold">Batal</button>}</div></form>{activities.length ? <div className="mt-5 divide-y divide-black/5">{activities.map((activity) => <div key={activity.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><h3 className="font-bold">{activity.title}</h3><p className="mt-1 text-xs text-marica-ink-soft">{activity.description}</p><p className="mt-1 text-xs text-marica-ink-soft">{activity.contentType} · usia {activity.ageMin ?? "-"}–{activity.ageMax ?? "-"} · urutan {activity.sortOrder}</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-marica-cream px-3 py-1 text-xs font-bold">{activity.isPublished ? "Published" : "Draft"}</span><button type="button" onClick={() => openActivityForm(activity)} className="rounded-lg border px-3 py-1.5 text-xs font-bold">Edit</button><button type="button" onClick={() => void deleteActivity(activity.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600">Hapus</button></div></div>)}</div> : <p className="p-10 text-center text-sm text-marica-ink-soft">Belum ada activity. Tambahkan activity menggunakan form di atas.</p>}</div>
      )}
      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-5"><form onSubmit={savePlan} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl"><h2 className="font-display text-2xl font-bold">{editing ? "Edit Paket" : "Tambah Paket"}</h2><div className="mt-5 grid gap-3"><input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="Slug" className="rounded-xl border px-4 py-3 text-sm" /><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama paket" className="rounded-xl border px-4 py-3 text-sm" /><textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi" rows={3} className="rounded-xl border px-4 py-3 text-sm" /><input required type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Harga" className="rounded-xl border px-4 py-3 text-sm" /><select value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value as PlanForm["interval"] })} className="rounded-xl border px-4 py-3 text-sm"><option value="MONTHLY">Bulanan</option><option value="QUARTERLY">Triwulan</option></select><div className="flex gap-3"><button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-full border py-3 font-bold">Batal</button><button disabled={saving} className="flex-1 rounded-full bg-marica-amber-dark py-3 font-bold text-white">{saving ? "Menyimpan..." : "Simpan"}</button></div></div></form></div>}
    </section>
  );
}
