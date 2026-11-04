"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle, Search, ShieldCheck } from "lucide-react";

type Role = "USER" | "ADMIN" | "KASIR";
type ManagedUser = { id: string; name: string | null; email: string | null; whatsapp: string | null; role: Role; createdAt: string };

const roleLabel: Record<Role, string> = { USER: "User", ADMIN: "Admin", KASIR: "Kasir" };

export default function AdminSettingsPage() {
  const [whatsapp, setWhatsapp] = useState("");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const response = await fetch(`/api/admin/users?limit=50&search=${encodeURIComponent(search.trim())}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal memuat user");
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal memuat user");
    } finally { setUsersLoading(false); }
  }, [search]);

  useEffect(() => {
    fetch("/api/admin/company", { cache: "no-store" }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Gagal memuat pengaturan"); setWhatsapp(data.whatsapp ?? ""); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Gagal memuat pengaturan")).finally(() => setIsLoading(false));
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void loadUsers(), 250); return () => window.clearTimeout(timer); }, [loadUsers]);

  const saveWhatsapp = async (event: FormEvent) => {
    event.preventDefault(); setIsSaving(true); setMessage(null); setError(null);
    try { const response = await fetch("/api/admin/company", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ whatsapp }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Gagal menyimpan pengaturan"); setWhatsapp(data.whatsapp ?? whatsapp); setMessage("Nomor WhatsApp checkout berhasil disimpan."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Gagal menyimpan pengaturan"); } finally { setIsSaving(false); }
  };

  const updateRole = async (user: ManagedUser, role: Role) => {
    if (role === user.role) return;
    setSaving(user.id); setError(null); setMessage(null);
    try { const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, role }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Gagal mengubah role user"); setUsers((current) => current.map((item) => item.id === user.id ? data : item)); setMessage(`Role ${data.name ?? data.email ?? "user"} berhasil diubah menjadi ${roleLabel[role]}.`); } catch (reason) { setError(reason instanceof Error ? reason.message : "Gagal mengubah role user"); } finally { setSaving(null); }
  };

  return <div className="mx-auto max-w-5xl"><div className="mb-8"><p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-marica-amber-text">Pengaturan toko</p><h1 className="mt-1 font-display text-3xl font-bold text-marica-ink">Pengaturan Admin</h1><p className="mt-2 font-body text-sm text-marica-ink-soft">Kelola kontak checkout dan akses role user dari satu halaman.</p></div>
    {error && <p className="mb-5 rounded-xl bg-marica-rose-deep/10 px-4 py-3 font-body text-sm text-marica-rose-deep">{error}</p>}{message && <p className="mb-5 flex items-center gap-2 rounded-xl bg-marica-green/10 px-4 py-3 font-body text-sm text-marica-green"><CheckCircle2 className="h-4 w-4" />{message}</p>}
    <form onSubmit={saveWhatsapp} className="rounded-3xl border border-marica-ink/8 bg-white p-6 shadow-sm sm:p-8"><div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-marica-green/15 text-marica-green"><MessageCircle className="h-6 w-6" /></span><div className="flex-1"><label htmlFor="whatsapp" className="font-body text-sm font-bold text-marica-ink">Nomor WhatsApp bisnis</label><input id="whatsapp" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="Contoh: 085870459329 atau 6285870459329" disabled={isLoading || isSaving} className="mt-2 w-full rounded-xl border border-marica-ink/10 px-4 py-3 font-body text-sm text-marica-ink outline-none focus:border-marica-amber disabled:bg-marica-cream/50" /><p className="mt-2 font-body text-xs text-marica-ink-soft">Nomor akan otomatis dinormalisasi ke format internasional (+62).</p></div></div><button type="submit" disabled={isLoading || isSaving} className="mt-6 inline-flex items-center gap-2 rounded-full bg-marica-amber-dark px-5 py-3 font-body text-sm font-semibold text-white disabled:opacity-50">{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}Simpan nomor WhatsApp</button></form>
    <section className="mt-6 rounded-3xl border border-marica-ink/8 bg-white p-6 shadow-sm sm:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-marica-amber/15 text-marica-amber-dark"><ShieldCheck className="h-6 w-6" /></span><div><h2 className="font-display text-xl font-bold text-marica-ink">Manajemen role user</h2><p className="mt-1 text-sm text-marica-ink-soft">Cari user berdasarkan nama, email, atau WhatsApp lalu atur aksesnya.</p></div></div><div className="relative sm:w-80"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-marica-ink-soft/60" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari user..." className="w-full rounded-full border border-black/10 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-marica-amber" /></div></div><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b border-black/5 text-xs uppercase tracking-wide text-marica-ink-soft/70"><tr><th className="px-3 py-3">User</th><th className="px-3 py-3">Kontak</th><th className="px-3 py-3">Role</th><th className="px-3 py-3 text-right">Akses</th></tr></thead><tbody>{usersLoading ? <tr><td colSpan={4} className="px-3 py-10 text-center text-sm text-marica-ink-soft"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr> : users.length === 0 ? <tr><td colSpan={4} className="px-3 py-10 text-center text-sm text-marica-ink-soft">User tidak ditemukan.</td></tr> : users.map((user) => <tr key={user.id} className="border-b border-black/5 last:border-0"><td className="px-3 py-4"><p className="font-semibold text-marica-ink">{user.name ?? "Tanpa nama"}</p><p className="text-xs text-marica-ink-soft">{user.email ?? "Email belum diisi"}</p></td><td className="px-3 py-4 text-xs text-marica-ink-soft">{user.whatsapp ?? "-"}</td><td className="px-3 py-4"><span className="rounded-full bg-marica-sky-light px-2.5 py-1 text-xs font-bold">{roleLabel[user.role]}</span></td><td className="px-3 py-4 text-right"><select value={user.role} disabled={saving === user.id} onChange={(event) => void updateRole(user, event.target.value as Role)} className="rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-marica-amber disabled:opacity-50"><option value="USER">User</option><option value="KASIR">Kasir</option><option value="ADMIN">Admin</option></select></td></tr>)}</tbody></table></div></section>
  </div>;
}
