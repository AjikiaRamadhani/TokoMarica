"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import {
  Camera,
  CalendarDays,
  ChevronRight,
  Coins,
  Eye,
  EyeOff,
  Gift,
  KeyRound,
  Loader2,
  LogOut,
  PackageCheck,
  Pencil,
  Settings,
  ShoppingBag,
  TicketPercent,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import ProfileHeader from "../components/Profileheader";
import Footer from "@/app/components/Footer";
import { buildManualPaymentWhatsAppUrl } from "@/lib/whatsapp-checkout";
import ChildProfiles from "@/app/components/profile/ChildProfiles";

type Voucher = { id: string; code: string; title: string; pointsCost: number; discountAmount: number; isActive?: boolean; expiresAt?: string | null };
type OwnedVoucher = { id: string; status: string; voucher: Voucher };
type AccountOrder = { id: string; orderNumber: string; status: string; total: number; createdAt: string; items: { productName: string; quantity: number; productAvailable?: boolean }[] };
type EventBooking = { id: string; bookingNumber: string; status: string; quantity: number; totalPrice: number; event: { title: string; eventDate: string; locationName: string } };
type ProfileData = { balance: number; catalog: Voucher[]; owned: OwnedVoucher[]; orderCount: number; orders: AccountOrder[]; bookings: EventBooking[] };
type Subscription = { id: string; subscriptionNumber: string; status: string; startDate: string; nextBillingAt: string; nextDeliveryAt: string; plan: { name: string; price: number; interval: string }; cycles: { cycleNumber: string; amount: number; status: string; delivery?: { status: string } | null }[] };
type ActivePanel = "profile" | "orders" | "subscriptions" | "tickets" | "points" | "vouchers" | "settings";

type ProfileUser = {
  id: string;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  image: string | null;
  role?: string;
  createdAt?: string;
  stats: { pointBalance: number; activeVouchers: number; totalOrders: number };
};

const money = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

function Stat({ icon: Icon, label, value, color }: { icon: typeof Coins; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-marica-cream/65 px-3 py-3">
      <span className="flex items-center gap-2 font-body text-xs text-marica-ink-soft">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${color}`}>
          <Icon className="h-4 w-4" />
        </span>
        {label}
      </span>
      <strong className="font-display text-lg text-marica-ink">{value}</strong>
    </div>
  );
}

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const [data, setData] = useState<ProfileData>({ balance: 0, catalog: [], owned: [], orderCount: 0, orders: [], bookings: [] });
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>("profile");
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subscriptionAction, setSubscriptionAction] = useState<string | null>(null);

  // --- Edit profil (nama & nomor HP) ---
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // --- Foto profil ---
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);

  // --- Ganti kata sandi ---
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  async function loadProfile() {
    const [profileResponse, pointsResponse, vouchersResponse, ordersResponse, subscriptionsResponse] = await Promise.all([
      fetch("/api/user/profile", { cache: "no-store" }),
      fetch("/api/points", { cache: "no-store" }),
      fetch("/api/vouchers", { cache: "no-store" }),
      fetch("/api/orders", { cache: "no-store" }),
      fetch("/api/subscriptions", { cache: "no-store" }),
    ]);
    const profile = profileResponse.ok ? await profileResponse.json().catch(() => null) : null;
    const points = await pointsResponse.json().catch(() => ({}));
    const vouchers = await vouchersResponse.json().catch(() => ({}));
    const orders = ordersResponse.ok ? await ordersResponse.json().catch(() => []) : [];
    const subscriptions = subscriptionsResponse.ok ? await subscriptionsResponse.json().catch(() => []) : [];
    const bookingsResponse = await fetch("/api/event-bookings", { cache: "no-store" });
    const bookings = bookingsResponse.ok ? await bookingsResponse.json().catch(() => []) : [];
    if (!pointsResponse.ok || !vouchersResponse.ok) throw new Error(points.error ?? vouchers.error ?? "Gagal memuat data akun");

    if (profile) {
      setProfileUser(profile);
      setEditName(profile.name ?? "");
      setEditWhatsapp(profile.whatsapp ?? "");
    }
    setData({ balance: points.balance ?? 0, catalog: vouchers.catalog ?? [], owned: vouchers.owned ?? [], orderCount: Array.isArray(orders) ? orders.length : 0, orders: Array.isArray(orders) ? orders : [], bookings: Array.isArray(bookings) ? bookings : [] });
    setSubscriptions(Array.isArray(subscriptions) ? subscriptions : []);
  }

  async function cancelSubscription(subscriptionNumber: string) {
    if (!window.confirm("Batalkan subscription ini? Pembayaran dan pengiriman berikutnya akan dihentikan.")) return;
    setSubscriptionAction(subscriptionNumber);
    setError(null);
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionNumber}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "CANCEL" }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Subscription gagal dibatalkan");
      setNotice("Subscription berhasil dibatalkan.");
      await loadProfile();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Subscription gagal dibatalkan");
    } finally {
      setSubscriptionAction(null);
    }
  }

  async function continueSubscriptionPayment(cycle: { cycleNumber: string; amount: number }) {
    setError(null);
    try {
      const response = await fetch("/api/company", { cache: "no-store" });
      const company = await response.json();
      const whatsappUrl = response.ok && company.whatsapp
        ? buildManualPaymentWhatsAppUrl(company.whatsapp, { reference: cycle.cycleNumber, customerName: profileUser?.name ?? "Pelanggan Marica", total: cycle.amount, description: "Pembayaran subscription" })
        : null;
      if (!whatsappUrl) throw new Error("Nomor WhatsApp pembayaran belum dikonfigurasi");
      window.location.href = whatsappUrl;
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "Gagal membuka pembayaran");
    }
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    // Data profil disinkronkan dari endpoint akun setelah sesi tersedia.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfile().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Gagal memuat profil")).finally(() => setLoading(false));
  }, [status]);

  async function redeem(voucherId: string) {
    setRedeeming(voucherId); setNotice(null); setError(null);
    try {
      const response = await fetch("/api/vouchers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ voucherId }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Voucher gagal ditukar.");
      setNotice("Voucher berhasil ditukar dan masuk ke akun Anda.");
      await loadProfile();
    } catch (redeemError) { setError(redeemError instanceof Error ? redeemError.message : "Voucher gagal ditukar."); }
    finally { setRedeeming(null); }
  }

  async function saveProfile() {
    setSavingProfile(true); setError(null); setNotice(null);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, whatsapp: editWhatsapp }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Gagal memperbarui profil.");
      setProfileUser((prev) => (prev ? { ...prev, name: result.name, whatsapp: result.whatsapp } : prev));
      await updateSession({ name: result.name, image: result.image });
      setNotice("Profil berhasil diperbarui.");
      setIsEditingProfile(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal memperbarui profil.");
    } finally {
      setSavingProfile(false);
    }
  }

  function cancelEditProfile() {
    setEditName(profileUser?.name ?? "");
    setEditWhatsapp(profileUser?.whatsapp ?? "");
    setIsEditingProfile(false);
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true); setError(null); setNotice(null);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const response = await fetch("/api/user/profile/avatar", { method: "POST", body: formData });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Gagal mengupload foto.");
      setProfileUser((prev) => (prev ? { ...prev, image: result.image } : prev));
      await updateSession({ image: result.image });
      setNotice("Foto profil berhasil diperbarui.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Gagal mengupload foto.");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function removeAvatar() {
    setRemovingAvatar(true); setError(null); setNotice(null);
    try {
      const response = await fetch("/api/user/profile/avatar", { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Gagal menghapus foto.");
      setProfileUser((prev) => (prev ? { ...prev, image: null } : prev));
      await updateSession({ image: null });
      setNotice("Foto profil berhasil dihapus.");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Gagal menghapus foto.");
    } finally {
      setRemovingAvatar(false);
    }
  }

  async function submitPasswordChange() {
    setPasswordError(null); setPasswordNotice(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Semua field wajib diisi"); return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password baru tidak cocok"); return;
    }
    setChangingPassword(true);
    try {
      const response = await fetch("/api/user/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Gagal memperbarui kata sandi.");
      setPasswordNotice("Kata sandi berhasil diperbarui.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setShowPasswordForm(false);
    } catch (passwordChangeError) {
      setPasswordError(passwordChangeError instanceof Error ? passwordChangeError.message : "Gagal memperbarui kata sandi.");
    } finally {
      setChangingPassword(false);
    }
  }

  const available = useMemo(() => data.owned.filter((item) => item.status === "AVAILABLE" && item.voucher.isActive !== false), [data.owned]);

  if (status === "loading" || (status === "authenticated" && loading)) return <><ProfileHeader /><main className="flex min-h-[60vh] items-center justify-center bg-[#f8f4ee]"><Loader2 className="h-6 w-6 animate-spin text-marica-amber-dark" /></main></>;
  if (!session?.user) return <><ProfileHeader /><main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-[#f8f4ee] px-5 text-center"><h1 className="font-display text-2xl text-marica-ink">Masuk untuk melihat profil</h1><Link href="/login?callbackUrl=/profil" className="rounded-full bg-marica-amber-dark px-5 py-2.5 font-body text-sm font-semibold text-white">Masuk ke akun</Link></main><Footer /></>;

  const name = profileUser?.name ?? session.user.name ?? "Member Marica";
  const email = profileUser?.email ?? session.user.email ?? "Email belum diatur";
  const whatsapp = profileUser?.whatsapp ?? "Belum diatur";
  const avatarUrl = profileUser?.image ?? null;
  const pointBalance = profileUser?.stats.pointBalance ?? data.balance;
  const activeVoucherCount = profileUser?.stats.activeVouchers ?? available.length;
  const orderCount = profileUser?.stats.totalOrders ?? data.orderCount;

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f4ee]">
      <ProfileHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-5 sm:px-6 sm:pb-16 sm:pt-7 lg:px-10">
          <header className="mb-5 flex flex-wrap items-start justify-between gap-4 sm:mb-6 sm:items-end">
            <div>
              <nav aria-label="Breadcrumb" className="flex items-center gap-1 font-body text-xs text-marica-ink-soft">
                <Link href="/" className="font-semibold text-marica-amber-text transition-colors hover:text-marica-amber-dark">Beranda</Link>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Akun Saya</span>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Profil &amp; Keluarga</span>
              </nav>
              <h1 className="mt-2 font-display text-[2rem] font-semibold leading-tight text-marica-ink sm:text-4xl">Profil &amp; Keluarga</h1>
            </div>
          </header>
          {notice && <p className="mb-4 rounded-xl bg-marica-green/10 px-4 py-3 font-body text-sm text-marica-green">{notice}</p>}
          {error && <p className="mb-4 rounded-xl bg-marica-rose-deep/10 px-4 py-3 font-body text-sm text-marica-rose-deep">{error}</p>}

          <div className="grid min-w-0 gap-4 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-5">
            <aside className="min-w-0 rounded-2xl bg-[#fffdfa] p-2 shadow-sm sm:p-3">
              <nav aria-label="Menu profil" className="grid min-w-0 grid-cols-2 gap-2 lg:block lg:space-y-1">
                <button type="button" onClick={() => setActivePanel("profile")} className={`flex min-h-11 min-w-0 items-center gap-1.5 rounded-xl px-2 py-2.5 text-center font-body text-[11px] transition-colors sm:gap-3 sm:px-3 sm:text-xs lg:w-full lg:text-left ${activePanel === "profile" ? "bg-marica-amber-dark font-semibold text-white shadow-sm" : "bg-marica-cream/35 text-marica-ink-soft hover:bg-marica-cream"}`}><UserRound className="h-4 w-4 shrink-0" /> <span className="min-w-0 break-words">Profil &amp; Keluarga</span></button>
                <button type="button" onClick={() => setActivePanel("orders")} className={`flex min-h-11 min-w-0 items-center gap-1.5 rounded-xl px-2 py-2.5 text-center font-body text-[11px] transition-colors sm:gap-3 sm:px-3 sm:text-xs lg:w-full lg:text-left ${activePanel === "orders" ? "bg-marica-amber-dark font-semibold text-white shadow-sm" : "bg-marica-cream/35 text-marica-ink-soft hover:bg-marica-cream"}`}><PackageCheck className="h-4 w-4 shrink-0" /> <span className="min-w-0 break-words">Pesanan Saya</span></button>
                <button type="button" onClick={() => setActivePanel("subscriptions")} className={`flex min-h-11 min-w-0 items-center gap-1.5 rounded-xl px-2 py-2.5 text-center font-body text-[11px] transition-colors sm:gap-3 sm:px-3 sm:text-xs lg:w-full lg:text-left ${activePanel === "subscriptions" ? "bg-marica-amber-dark font-semibold text-white shadow-sm" : "bg-marica-cream/35 text-marica-ink-soft hover:bg-marica-cream"}`}><PackageCheck className="h-4 w-4 shrink-0" /> <span className="min-w-0 break-words">Subscription</span></button>
                <button type="button" onClick={() => setActivePanel("tickets")} className={`flex min-h-11 min-w-0 items-center gap-1.5 rounded-xl px-2 py-2.5 text-center font-body text-[11px] transition-colors sm:gap-3 sm:px-3 sm:text-xs lg:w-full lg:text-left ${activePanel === "tickets" ? "bg-marica-amber-dark font-semibold text-white" : "bg-marica-cream/35 text-marica-ink-soft hover:bg-marica-cream"}`}><CalendarDays className="h-4 w-4 shrink-0" /> <span className="min-w-0 break-words">E-Tiket</span></button>
                <button type="button" onClick={() => setActivePanel("points")} className={`flex min-h-11 min-w-0 items-center gap-1.5 rounded-xl px-2 py-2.5 text-center font-body text-[11px] transition-colors sm:gap-3 sm:px-3 sm:text-xs lg:w-full lg:text-left ${activePanel === "points" ? "bg-marica-amber-dark font-semibold text-white" : "bg-marica-cream/35 text-marica-ink-soft hover:bg-marica-cream"}`}><Coins className="h-4 w-4 shrink-0" /> <span className="min-w-0 break-words">Marica Points</span></button>
                <button type="button" onClick={() => setActivePanel("vouchers")} className={`flex min-h-11 min-w-0 items-center gap-1.5 rounded-xl px-2 py-2.5 text-center font-body text-[11px] transition-colors sm:gap-3 sm:px-3 sm:text-xs lg:w-full lg:text-left ${activePanel === "vouchers" ? "bg-marica-amber-dark font-semibold text-white" : "bg-marica-cream/35 text-marica-ink-soft hover:bg-marica-cream"}`}><TicketPercent className="h-4 w-4 shrink-0" /> <span className="min-w-0 break-words">Voucher Saya</span></button>
                <button type="button" onClick={() => setActivePanel("settings")} className={`flex min-h-11 min-w-0 items-center gap-1.5 rounded-xl px-2 py-2.5 text-center font-body text-[11px] transition-colors sm:gap-3 sm:px-3 sm:text-xs lg:w-full lg:text-left ${activePanel === "settings" ? "bg-marica-amber-dark font-semibold text-white" : "bg-marica-cream/35 text-marica-ink-soft hover:bg-marica-cream"}`}><Settings className="h-4 w-4 shrink-0" /> <span className="min-w-0 break-words">Pengaturan</span></button>
              </nav>
              <button type="button" onClick={() => void signOut({ callbackUrl: "/" })} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-marica-amber-dark/40 px-3 py-2 font-body text-xs font-semibold text-marica-amber-text transition-colors hover:bg-marica-cream lg:mt-5"><LogOut className="h-3.5 w-3.5" /> Keluar</button>
            </aside>

            {activePanel !== "profile" ? (
              <section className="rounded-xl bg-[#fffdfa] p-4 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-marica-ink/10 pb-4">
                  <div>
                    <p className="font-body text-[10px] font-bold uppercase tracking-[0.15em] text-marica-ink-soft">Akun Saya</p>
                    <h2 className="mt-1 font-display text-xl text-marica-ink">{activePanel === "orders" ? "Pesanan Saya" : activePanel === "subscriptions" ? "Subscription Saya" : activePanel === "tickets" ? "E-Tiket Saya" : activePanel === "points" ? "Marica Points" : activePanel === "vouchers" ? "Voucher Saya" : "Pengaturan"}</h2>
                  </div>
                </div>
                {activePanel === "orders" && (data.orders.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-marica-ink/15 bg-marica-cream/35 p-8 text-center"><ShoppingBag className="mx-auto h-9 w-9 text-marica-amber-dark" /><p className="mt-3 font-display text-lg font-semibold text-marica-ink">Belum ada pesanan</p><p className="mt-1 font-body text-sm text-marica-ink-soft">Pesanan belanja kamu akan muncul di sini.</p><Link href="/belanja" className="mt-4 inline-flex rounded-full bg-marica-amber-dark px-4 py-2 font-body text-xs font-semibold text-white">Mulai Belanja</Link></div> : <div className="mt-5 space-y-3">{data.orders.map((order) => <Link key={order.id} href={`/belanja/pesanan-saya/${order.id}`} className="group block rounded-2xl border border-marica-ink/10 bg-white p-4 transition hover:-translate-y-0.5 hover:border-marica-amber/50 hover:shadow-[0_8px_22px_rgba(120,60,10,0.08)] focus:outline-none focus:ring-2 focus:ring-marica-amber-dark sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-body text-sm font-bold text-marica-ink">{order.orderNumber}</p><p className="mt-1 font-body text-xs text-marica-ink-soft">{new Date(order.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</p></div><span className="shrink-0 rounded-full bg-marica-amber/15 px-3 py-1 font-body text-[10px] font-bold uppercase tracking-wide text-marica-amber-text">{order.status}</span></div><div className="mt-4 flex items-end justify-between gap-3 border-t border-marica-ink/10 pt-3"><div className="min-w-0"><p className="truncate font-body text-xs text-marica-ink-soft">{order.items.map((item) => `${item.productName} (${item.quantity}x)`).join(", ")}</p>{order.items.some((item) => item.productAvailable === false) && <p className="mt-1 font-body text-[11px] font-semibold text-marica-rose-deep">Ada produk yang sudah tidak tersedia.</p>}<p className="mt-2 font-display text-lg font-bold text-marica-amber-text">{money(order.total)}</p></div><span className="inline-flex shrink-0 items-center gap-1 font-body text-xs font-semibold text-marica-amber-dark">Detail <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span></div></Link>)}</div>)}
                {activePanel === "orders" && subscriptions.length > 0 && <div className="mt-6 rounded-xl border border-marica-amber/30 bg-marica-amber/5 p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-display text-lg font-semibold text-marica-ink">Subscription Edu-Kit</h3><Link href="/profil/subscription" className="text-xs font-semibold text-marica-amber-text">Lihat semua</Link></div><div className="mt-3 space-y-3">{subscriptions.map((subscription) => { const pendingCycle = subscription.cycles.find((cycle) => cycle.status === "PENDING_PAYMENT"); return <div key={subscription.id} className="rounded-lg bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><Link href={`/profil/subscription#${subscription.subscriptionNumber}`} className="font-semibold text-marica-ink">{subscription.plan.name}</Link><span className="text-[10px] font-semibold text-marica-amber-text">{subscription.status}</span></div><div className="mt-2 flex flex-wrap gap-2">{pendingCycle && <button type="button" onClick={() => void continueSubscriptionPayment(pendingCycle)} className="rounded-md bg-marica-amber-dark px-2.5 py-1.5 text-[10px] font-semibold text-white">Bayar via WhatsApp</button>}{subscription.status !== "CANCELLED" && <button type="button" disabled={subscriptionAction === subscription.subscriptionNumber} onClick={() => void cancelSubscription(subscription.subscriptionNumber)} className="rounded-md border border-red-200 px-2.5 py-1.5 text-[10px] font-semibold text-red-600">Batalkan</button>}</div></div>; })}</div></div>}
                {activePanel === "subscriptions" && <div className="mt-5 space-y-4">{subscriptions.length === 0 ? <div className="rounded-lg bg-marica-cream/60 p-5 text-sm text-marica-ink-soft">Belum ada subscription. <Link href="/subscription" className="font-semibold text-marica-amber-text">Lihat paket Edu-Kit</Link></div> : subscriptions.map((subscription) => { const pendingCycle = subscription.cycles.find((cycle) => cycle.status === "PENDING_PAYMENT"); return <article key={subscription.id} className="rounded-xl border border-marica-ink/10 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-marica-amber-text">{subscription.subscriptionNumber}</p><h3 className="mt-1 font-display text-lg font-semibold">{subscription.plan.name}</h3><p className="mt-1 text-xs text-marica-ink-soft">{money(subscription.plan.price)} / {subscription.plan.interval === "MONTHLY" ? "bulan" : "3 bulan"}</p></div><span className="rounded-full bg-marica-amber/15 px-2.5 py-1 text-[10px] font-semibold text-marica-amber-text">{subscription.status}</span></div><div className="mt-4 grid gap-2 text-xs text-marica-ink-soft sm:grid-cols-2"><p>Tagihan berikutnya: <strong>{new Date(subscription.nextBillingAt).toLocaleDateString("id-ID")}</strong></p><p>Pengiriman berikutnya: <strong>{new Date(subscription.nextDeliveryAt).toLocaleDateString("id-ID")}</strong></p></div><div className="mt-4 flex flex-wrap gap-2"><Link href={`/profil/subscription#${subscription.subscriptionNumber}`} className="rounded-lg border border-marica-ink/15 px-3 py-2 text-xs font-semibold">Lihat Detail</Link>{pendingCycle && <button type="button" onClick={() => void continueSubscriptionPayment(pendingCycle)} className="rounded-lg bg-marica-amber-dark px-3 py-2 text-xs font-semibold text-white">Bayar via WhatsApp</button>}{subscription.status !== "CANCELLED" && <button type="button" disabled={subscriptionAction === subscription.subscriptionNumber} onClick={() => void cancelSubscription(subscription.subscriptionNumber)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600">{subscriptionAction === subscription.subscriptionNumber ? "Membatalkan..." : "Batalkan"}</button>}</div></article>; })}</div>}
                {activePanel === "tickets" && (data.bookings.length === 0 ? <p className="mt-5 rounded-lg bg-marica-cream/60 p-5 font-body text-sm text-marica-ink-soft">Belum ada e-tiket.</p> : <div className="mt-5 space-y-3">{data.bookings.map((booking) => <div key={booking.id} className="rounded-xl border border-marica-ink/10 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-body text-sm font-semibold text-marica-ink">{booking.event.title}</p><p className="mt-1 font-body text-xs text-marica-ink-soft">{booking.bookingNumber} · {booking.event.locationName}</p><p className="mt-3 font-body text-xs text-marica-ink-soft">{booking.status} · {booking.quantity} tiket</p></div><Link href={`/event/tiket/${booking.bookingNumber}`} className="w-full rounded-lg bg-marica-amber-dark px-3 py-2 text-center font-body text-[10px] font-semibold text-white sm:w-auto">Lihat &amp; Unduh QR</Link></div></div>)}</div>)}
                {activePanel === "points" && <div className="mt-5 rounded-xl bg-marica-cream/60 p-5"><p className="font-body text-sm text-marica-ink-soft">Saldo poin Anda</p><p className="mt-2 font-display text-3xl font-semibold text-marica-amber-text">{pointBalance.toLocaleString("id-ID")} poin</p><p className="mt-2 font-body text-xs text-marica-ink-soft">Poin dapat ditukar menjadi voucher belanja.</p></div>}
                {activePanel === "vouchers" && <div className="mt-5 space-y-3">{available.length === 0 ? <p className="rounded-lg bg-marica-cream/60 p-5 font-body text-sm text-marica-ink-soft">Belum ada voucher aktif.</p> : available.map((item) => <div key={item.id} className="rounded-xl border border-marica-amber/20 bg-marica-cream/35 p-4"><p className="font-body text-sm font-semibold text-marica-ink">{item.voucher.title}</p><p className="mt-1 font-body text-xs text-marica-ink-soft">{item.voucher.code} · {money(item.voucher.discountAmount)}</p></div>)}</div>}
                {activePanel === "settings" && (
                  <div className="mt-5 rounded-xl bg-marica-cream/60 p-5">
                    <p className="font-body text-sm font-semibold text-marica-ink">Keamanan akun</p>
                    <p className="mt-2 font-body text-xs text-marica-green">Akun Anda terlindungi.</p>

                    {!showPasswordForm ? (
                      <button type="button" onClick={() => { setShowPasswordForm(true); setPasswordError(null); setPasswordNotice(null); }} className="mt-4 inline-block font-body text-xs font-semibold text-marica-amber-text">
                        Ubah kata sandi
                      </button>
                    ) : (
                      <div className="mt-4 space-y-3 rounded-lg border border-marica-ink/10 bg-[#fffdfa] p-4">
                        {passwordError && <p className="rounded-lg bg-marica-rose-deep/10 px-3 py-2 font-body text-xs text-marica-rose-deep">{passwordError}</p>}
                        {passwordNotice && <p className="rounded-lg bg-marica-green/10 px-3 py-2 font-body text-xs text-marica-green">{passwordNotice}</p>}
                        <PasswordField label="Password saat ini" value={currentPassword} onChange={setCurrentPassword} visible={showPasswordFields} onToggleVisible={() => setShowPasswordFields((v) => !v)} />
                        <PasswordField label="Password baru" value={newPassword} onChange={setNewPassword} visible={showPasswordFields} onToggleVisible={() => setShowPasswordFields((v) => !v)} />
                        <PasswordField label="Konfirmasi password baru" value={confirmPassword} onChange={setConfirmPassword} visible={showPasswordFields} onToggleVisible={() => setShowPasswordFields((v) => !v)} />
                        <p className="font-body text-[10px] text-marica-ink-soft">Minimal 8 karakter, mengandung huruf, angka, dan simbol.</p>
                        <div className="flex gap-2 pt-1">
                          <button type="button" disabled={changingPassword} onClick={() => void submitPasswordChange()} className="inline-flex items-center gap-2 rounded-lg bg-marica-amber-dark px-4 py-2 font-body text-xs font-semibold text-white disabled:opacity-50">
                            {changingPassword && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Simpan Kata Sandi
                          </button>
                          <button type="button" onClick={() => { setShowPasswordForm(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordError(null); }} className="rounded-lg border border-marica-ink/15 px-4 py-2 font-body text-xs font-semibold text-marica-ink-soft">
                            Batal
                          </button>
                        </div>
                        <Link href="/lupa-password" className="inline-block font-body text-[10px] text-marica-ink-soft underline">Lupa password saat ini?</Link>
                      </div>
                    )}
                  </div>
                )}
              </section>
            ) : (
            <div className="grid min-w-0 gap-4 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-5">
              <div className="space-y-5">
                <section className="rounded-xl bg-[#fffdfa] p-4 text-center shadow-sm sm:p-5">
                  <div className="relative mx-auto h-16 w-16">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt={name} className="h-16 w-16 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-marica-rose/30 font-display text-2xl text-marica-rose-deep">{name.charAt(0).toUpperCase()}</div>
                    )}
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-marica-amber-dark text-white shadow disabled:opacity-60"
                      aria-label="Ganti foto profil"
                    >
                      {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                    </button>
                    <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void handleAvatarChange(e)} />
                  </div>
                  <h2 className="mt-3 font-display text-base font-semibold text-marica-ink">{name}</h2>
                  <span className="mt-1 inline-flex rounded-full bg-marica-rose/30 px-2 py-0.5 font-body text-[10px] font-semibold text-marica-rose-deep">Member Marica</span>
                  <p className="mt-3 font-body text-[11px] text-marica-ink-soft">Akun utama keluarga</p>
                  {avatarUrl && (
                    <button type="button" disabled={removingAvatar} onClick={() => void removeAvatar()} className="mx-auto mt-3 flex items-center gap-1 font-body text-[10px] font-semibold text-marica-rose-deep disabled:opacity-50">
                      {removingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Hapus foto
                    </button>
                  )}
                </section>
                <section id="points" className="rounded-xl bg-[#fffdfa] p-4 shadow-sm">
                  <p className="mb-3 font-body text-[10px] font-bold uppercase tracking-[0.15em] text-marica-ink-soft">Statistik akun</p>
                  <div className="space-y-2">
                    <Stat icon={Coins} label="Saldo Poin" value={pointBalance.toLocaleString("id-ID")} color="bg-marica-amber/25 text-marica-amber-text" />
                    <Stat icon={TicketPercent} label="Voucher Aktif" value={String(activeVoucherCount)} color="bg-marica-rose/25 text-marica-rose-deep" />
                    <Stat icon={ShoppingBag} label="Pesanan" value={String(orderCount)} color="bg-marica-sky-light text-marica-blue" />
                  </div>
                </section>
              </div>
              <div className="space-y-5">
                <ChildProfiles />
                <section className="rounded-xl bg-[#fffdfa] p-4 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between border-b border-marica-ink/10 pb-4">
                    <h2 className="font-display text-xl text-marica-ink">Informasi pribadi</h2>
                    {!isEditingProfile && (
                      <button type="button" onClick={() => setIsEditingProfile(true)} aria-label="Edit informasi pribadi">
                        <Pencil className="h-3.5 w-3.5 text-marica-amber-text" />
                      </button>
                    )}
                  </div>

                  {isEditingProfile ? (
                    <div className="grid gap-4 pt-5 sm:grid-cols-2">
                      <label className="block">
                        <span className="font-body text-[10px] text-marica-ink-soft">Nama lengkap</span>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-marica-ink/15 bg-[#fffdfa] px-3 py-2 font-body text-sm text-marica-ink outline-none focus:border-marica-amber-dark"
                        />
                      </label>
                      <label className="block">
                        <span className="font-body text-[10px] text-marica-ink-soft">Nomor HP</span>
                        <input
                          type="tel"
                          value={editWhatsapp}
                          inputMode="numeric"
                          pattern="[0-9]{8,15}"
                          onChange={(e) => setEditWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 15))}
                          placeholder="08123456789"
                          className="mt-1 w-full rounded-lg border border-marica-ink/15 bg-[#fffdfa] px-3 py-2 font-body text-sm text-marica-ink outline-none focus:border-marica-amber-dark"
                        />
                      </label>
                      <div className="sm:col-span-2 flex gap-2 pt-1">
                        <button type="button" disabled={savingProfile} onClick={() => void saveProfile()} className="inline-flex items-center gap-2 rounded-lg bg-marica-amber-dark px-4 py-2 font-body text-xs font-semibold text-white disabled:opacity-50">
                          {savingProfile && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Simpan Perubahan
                        </button>
                        <button type="button" onClick={cancelEditProfile} className="inline-flex items-center gap-2 rounded-lg border border-marica-ink/15 px-4 py-2 font-body text-xs font-semibold text-marica-ink-soft">
                          <X className="h-3.5 w-3.5" /> Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-5 pt-5 sm:grid-cols-2">
                      {[["Nama lengkap", name], ["Email", email], ["Nomor HP", whatsapp], ["Bahasa", "Bahasa Indonesia"], ["Negara", "Indonesia"]].map(([label, value]) => (
                        <div key={label}>
                          <p className="font-body text-[10px] text-marica-ink-soft">{label}</p>
                          <p className="mt-1 font-body text-sm text-marica-ink">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section id="settings" className="rounded-xl bg-[#fffdfa] p-4 shadow-sm sm:p-6">
                  <h2 className="font-display text-xl text-marica-ink">Keamanan akun</h2>
                  <div className="mt-4 flex flex-col items-start gap-3 rounded-xl bg-marica-cream/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <KeyRound className="h-4 w-4 text-marica-ink-soft" />
                      <div>
                        <p className="font-body text-xs font-semibold text-marica-ink">Kata sandi</p>
                        <p className="font-body text-[10px] text-marica-green">Terlindungi</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => { setActivePanel("settings"); setShowPasswordForm(true); }} className="font-body text-[10px] font-semibold text-marica-amber-text">
                      Ubah Kata Sandi
                    </button>
                  </div>
                </section>

              </div>
            </div>
            )}
          </div>

          {activePanel === "points" && <>
            <style>{`#vouchers > div:nth-child(2) { grid-template-columns: minmax(0, 1fr); } #vouchers > div:nth-child(2) > div:first-child { display: none; }`}</style>
          {activePanel === "points" && <section id="vouchers" className="mt-5 rounded-xl bg-[#fffdfa] p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3 border-b border-marica-ink/10 pb-4"><div><p className="font-body text-[10px] font-bold uppercase tracking-[0.15em] text-marica-ink-soft">Marica Points</p><h2 className="mt-1 font-display text-xl text-marica-ink">Voucher Saya &amp; Tukar Poin</h2></div><span className="font-body text-xs text-marica-ink-soft">Saldo: <strong className="text-marica-amber-text">{pointBalance.toLocaleString("id-ID")} poin</strong></span></div><div className="grid gap-5 pt-5 lg:grid-cols-2"><div><h3 className="font-body text-sm font-semibold text-marica-ink">Voucher aktif ({available.length})</h3>{available.length === 0 ? <p className="mt-4 rounded-lg bg-marica-cream/60 p-4 font-body text-xs text-marica-ink-soft">Belum ada voucher aktif.</p> : <div className="mt-3 space-y-2">{available.map((item) => <div key={item.id} className="rounded-lg border border-marica-amber/20 bg-marica-cream/35 p-3"><p className="font-body text-xs font-semibold text-marica-ink">{item.voucher.title}</p><p className="font-body text-[10px] text-marica-ink-soft">{item.voucher.code} · {money(item.voucher.discountAmount)}</p></div>)}</div>}</div><div><h3 className="font-body text-sm font-semibold text-marica-ink">Tukar poin menjadi voucher</h3>{data.catalog.length === 0 ? <p className="mt-4 rounded-lg bg-marica-cream/60 p-4 font-body text-xs text-marica-ink-soft">Belum ada voucher tersedia.</p> : <div className="mt-3 grid gap-2">{data.catalog.map((voucher) => <div key={voucher.id} className="flex items-center justify-between rounded-lg border border-marica-ink/10 p-3"><div><p className="font-body text-xs font-semibold text-marica-ink">{voucher.title}</p><p className="font-body text-[10px] text-marica-ink-soft">Diskon {money(voucher.discountAmount)} · {voucher.pointsCost.toLocaleString("id-ID")} poin</p></div><button type="button" disabled={redeeming === voucher.id || data.balance < voucher.pointsCost} onClick={() => void redeem(voucher.id)} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-marica-amber-dark px-3 py-2 font-body text-[10px] font-semibold text-white disabled:opacity-40">{redeeming === voucher.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Gift className="h-3 w-3" />}{redeeming === voucher.id ? "Menukar" : "Tukar"}</button></div>)}</div>}</div></div></section>}
          </>}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function PasswordField({ label, value, onChange, visible, onToggleVisible }: { label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggleVisible: () => void }) {
  return (
    <label className="block">
      <span className="font-body text-[10px] text-marica-ink-soft">{label}</span>
      <div className="relative mt-1">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-marica-ink/15 bg-[#fffdfa] px-3 py-2 pr-9 font-body text-sm text-marica-ink outline-none focus:border-marica-amber-dark"
        />
        <button type="button" onClick={onToggleVisible} className="absolute right-2 top-1/2 -translate-y-1/2 text-marica-ink-soft" aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}
