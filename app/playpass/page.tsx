"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Info, Loader2, MapPin, Ticket, Users } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import FeedbackPopup from "@/app/components/FeedbackPopup";
import BookingExtras, { BookingParticipant, FnbSelection } from "@/app/components/BookingExtras";

type PackageItem = { id: string; name: string; durationMinutes: number; price: number; maxParticipants: number; slotCapacity: number | null };
type Slot = { value: string; label: string; remaining: number; available: boolean };
type Product = { id: string; name: string; price: number };
type Step = 1 | 2 | 3 | 4;

const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const dateKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const formatDate = (value: string) => new Date(`${value}T12:00:00+07:00`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
const field = "mt-2 w-full rounded-xl border border-black/10 bg-marica-sky-light/20 px-3.5 py-3 text-sm outline-none focus:border-marica-amber-dark focus:bg-white focus:ring-4 focus:ring-marica-amber/15";
const stepItems = ["Pilih Jadwal", "Tiket & Peserta", "Data Pengunjung", "Ringkasan"];

export default function PlaypassPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [packageId, setPackageId] = useState("");
  const [date, setDate] = useState("");
  const [month, setMonth] = useState(() => { const value = new Date(); return new Date(value.getFullYear(), value.getMonth(), 1); });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [startTime, setStartTime] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [phone, setPhone] = useState("");
  const [participants, setParticipants] = useState<BookingParticipant[]>([]);
  const [fnbItems, setFnbItems] = useState<FnbSelection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => dateKey(new Date()), []);
  const selectedPackage = packages.find((item) => item.id === packageId);
  const selectedSlot = slots.find((item) => item.value === startTime);
  const days = useMemo(() => {
    const offset = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => { const day = index - offset + 1; return day > 0 && day <= total ? new Date(month.getFullYear(), month.getMonth(), day) : null; });
  }, [month]);
  const fnbTotal = fnbItems.reduce((total, item) => total + (products.find((product) => product.id === item.productId)?.price ?? 0) * item.quantity, 0);
  const total = (selectedPackage?.price ?? 0) * quantity + fnbTotal;

  useEffect(() => {
    Promise.all([
      fetch("/api/playpass", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/fnb-products", { cache: "no-store" }).then((response) => response.json()),
    ]).then(([packageData, productData]) => {
      const available = Array.isArray(packageData) ? packageData : [];
      setPackages(available);
      if (available[0]) setPackageId(available[0].id);
      setProducts(Array.isArray(productData) ? productData : []);
    }).catch(() => setError("Paket Playpass gagal dimuat")).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!packageId || !date) return;
    const loadingTimer = setTimeout(() => setLoadingSlots(true), 0);
    fetch(`/api/playpass?packageId=${encodeURIComponent(packageId)}&date=${encodeURIComponent(date)}`, { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Slot gagal dimuat");
      return data;
    }).then((data) => setSlots(Array.isArray(data.slots) ? data.slots : [])).catch((loadError) => { setSlots([]); setError(loadError instanceof Error ? loadError.message : "Slot gagal dimuat"); }).finally(() => setLoadingSlots(false));
    return () => clearTimeout(loadingTimer);
  }, [packageId, date]);

  const chooseDate = (value: string) => { if (value < today) return; setDate(value); setStartTime(""); setSlots([]); setError(null); };
  const changeQuantity = (value: number) => { const next = Math.min(Math.max(1, value), selectedPackage?.maxParticipants ?? 1); setQuantity(next); setParticipants((current) => current.slice(0, next)); };
  const next = () => {
    setError(null);
    if (step === 1 && (!date || !startTime)) return setError("Pilih tanggal dan slot waktu terlebih dahulu.");
    setStep((current) => Math.min(4, current + 1) as Step);
  };
  const submit = async () => {
    if (!selectedPackage || !date || !startTime) return;
    setSubmitting(true); setError(null);
    try {
      const response = await fetch("/api/playpass-bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packageId, date, startTime, quantity, customerPhone: phone, participants, fnbItems }) });
      const result = await response.json();
      if (response.status === 401) return router.push(`/login?callbackUrl=${encodeURIComponent("/playpass")}`);
      if (!response.ok) throw new Error(result.error ?? "Booking Playpass gagal dibuat");
      if (result.redirectUrl?.startsWith("/")) router.push(result.redirectUrl); else if (result.redirectUrl) window.location.href = result.redirectUrl; else router.push(`/playpass/tiket/${result.booking.bookingNumber}`);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Booking Playpass gagal dibuat"); setSubmitting(false); }
  };

  if (loading) return <PageShell><Loading /></PageShell>;
  if (!selectedPackage) return <PageShell><div className="mx-auto max-w-6xl p-10 text-center text-sm text-marica-ink-soft">Belum ada paket Playpass yang tersedia.</div></PageShell>;

  return <PageShell>
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 lg:px-10">
      <div className="flex items-center justify-between text-sm text-marica-ink-soft"><span>Playpass <span className="mx-1">›</span> Pilih jadwal</span><Link href="/profil/playpass" className="font-semibold text-marica-amber-dark hover:text-marica-ink">Booking saya <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link></div>
      <section className="relative mt-5 overflow-hidden rounded-3xl bg-gradient-to-br from-marica-rose/40 via-marica-amber/20 to-marica-sky-light px-8 py-8 sm:px-12 sm:py-10"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-marica-amber-dark">Langkah {step} dari 4</p><h1 className="mt-3 font-display text-3xl font-bold text-marica-ink sm:text-4xl">Pilih Jadwal Playpass</h1><p className="mt-3 max-w-xl text-sm text-marica-ink-soft">Tentukan tanggal kunjungan dan slot waktu yang sesuai untuk keluarga Anda.</p></div><div className="flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 text-xs text-marica-ink-soft shadow-sm"><MapPin className="h-5 w-5 text-marica-rose-deep" /><span>Lokasi kunjungan<br /><b className="text-marica-ink">Marica Experience Store</b></span></div></div></section>
      <nav className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-marica-ink/10 bg-white p-3 shadow-sm sm:grid-cols-4">{stepItems.map((label, index) => { const number = index + 1; const active = step === number; const done = step > number; return <button key={label} type="button" disabled={number > step} onClick={() => setStep(number as Step)} className={`flex items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-semibold ${active ? "bg-marica-amber-dark text-white" : done ? "bg-marica-green/10 text-marica-green" : "text-marica-ink-soft"}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${done ? "bg-marica-green text-white" : active ? "bg-white/20" : "bg-black/5"}`}>{done ? <Check className="h-4 w-4" /> : number}</span>{label}</button>; })}</nav>
      <div className="mt-4 flex gap-3 rounded-xl bg-marica-sky-light/75 px-4 py-3 text-xs leading-5 text-marica-blue"><Info className="h-4 w-4 shrink-0" />Tiket dikenakan untuk anak. Pendamping gratis, tetapi seluruh peserta tetap wajib didaftarkan dan menggunakan kapasitas slot.</div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]"><section className="rounded-2xl border border-marica-ink/10 bg-white p-5 shadow-sm sm:p-6">
        {step === 1 && <CalendarStep month={month} setMonth={setMonth} days={days} today={today} date={date} chooseDate={chooseDate} />}
        {step === 2 && <TicketStep item={selectedPackage} quantity={quantity} changeQuantity={changeQuantity} />}
        {step === 3 && <div><Heading icon={<Users className="h-5 w-5" />} title="Data pemesan & peserta" text="Data ini membantu proses registrasi saat datang." /><label className="mt-6 block text-sm font-semibold">Nomor WhatsApp<input type="tel" inputMode="numeric" pattern="[0-9]{8,15}" maxLength={15} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))} placeholder="08xxxxxxxxxx" className={field} /><small className="mt-1 block font-normal text-marica-ink-soft">Digunakan untuk informasi booking.</small></label><BookingExtras maxParticipants={selectedPackage.maxParticipants} participants={participants} setParticipants={setParticipants} fnbItems={fnbItems} setFnbItems={setFnbItems} /></div>}
        {step === 4 && <div><Heading icon={<Check className="h-5 w-5" />} title="Ringkasan booking" text="Pastikan semua data sudah benar sebelum melanjutkan." /><div className="mt-6 divide-y divide-black/5 rounded-2xl bg-marica-sky-light/25 px-4"><Row label="Lokasi" value="Marica Experience Store" /><Row label="Tanggal" value={date ? formatDate(date) : "-"} /><Row label="Slot waktu" value={selectedSlot?.label ?? "-"} /><Row label="Paket" value={`${selectedPackage.name} x ${quantity}`} /><Row label="Peserta terdaftar" value={`${participants.length} orang`} />{fnbTotal > 0 && <Row label="F&B tambahan" value={money(fnbTotal)} />}<Row label="Total" value={money(total)} strong /></div><p className="mt-5 rounded-xl bg-marica-sky-light/60 p-4 text-xs leading-5 text-marica-ink-soft">Anda akan diarahkan ke halaman pembayaran Midtrans setelah melanjutkan.</p></div>}
        {error && <p className="mt-5 rounded-xl bg-marica-rose-deep/10 px-4 py-3 text-sm text-marica-rose-deep">{error}</p>}
        <div className="mt-6 flex flex-col-reverse justify-between gap-2 sm:flex-row"><button type="button" onClick={() => step === 1 ? router.push("/") : setStep((current) => Math.max(1, current - 1) as Step)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 px-5 py-3 text-sm font-semibold text-marica-ink-soft"><ArrowLeft className="h-4 w-4" />{step === 1 ? "Kembali" : "Sebelumnya"}</button>{step < 4 ? <button type="button" onClick={next} className="inline-flex items-center justify-center gap-2 rounded-xl bg-marica-amber-dark px-5 py-3 text-sm font-semibold text-white">Lanjut <ArrowRight className="h-4 w-4" /></button> : <button type="button" disabled={submitting} onClick={() => void submit()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-marica-amber-dark px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}Lanjut ke pembayaran <ArrowRight className="h-4 w-4" /></button>}</div>
      </section><aside className="space-y-5"><SlotPanel date={date} slots={slots} loading={loadingSlots} startTime={startTime} setStartTime={setStartTime} quantity={quantity} total={total} selectedSlot={selectedSlot} step={step} /><div className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-display text-lg font-semibold">Sebelum memilih jadwal</h2><div className="mt-4 space-y-2 text-xs text-marica-ink-soft"><Tip text="Anda dapat memilih jadwal tanpa login." /><Tip text="Tiket anak dikenakan biaya, pendamping gratis." /><Tip text="E-tiket QR tersedia setelah pembayaran berhasil." /></div></div></aside></div>
    </main><Footer />
  </PageShell>;
}

function PageShell({ children }: { children: React.ReactNode }) { return <div className="flex min-h-screen flex-col bg-white font-body text-marica-ink"><Navbar />{children}<FeedbackPopup message={null} onClose={() => undefined} /></div>; }
function Loading() { return <div className="flex flex-1 items-center justify-center text-sm text-marica-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Memuat jadwal Playpass...</div>; }
function Heading({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-marica-amber/15 text-marica-amber-dark">{icon}</span><div><h2 className="font-display text-xl font-semibold">{title}</h2><p className="mt-1 text-xs text-marica-ink-soft">{text}</p></div></div>; }
function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <div className="flex justify-between gap-4 py-3 text-sm"><span className="text-marica-ink-soft">{label}</span><span className={strong ? "font-semibold text-marica-amber-dark" : "text-right font-medium"}>{value}</span></div>; }
function Tip({ text }: { text: string }) { return <div className="rounded-lg bg-marica-sky-light/30 p-3">✓ {text}</div>; }
function TicketStep({ item, quantity, changeQuantity }: { item: PackageItem; quantity: number; changeQuantity: (value: number) => void }) { return <div><Heading icon={<Ticket className="h-5 w-5" />} title="Tiket & jumlah peserta" text="Pilih jumlah tiket anak yang akan hadir." /><div className="mt-6 rounded-2xl bg-marica-sky-light/25 p-5"><div className="flex items-center justify-between gap-4"><div><h3 className="font-display text-lg font-semibold">{item.name}</h3><p className="mt-1 text-sm text-marica-ink-soft">{item.durationMinutes} menit · {money(item.price)} per anak</p></div><div className="flex items-center gap-3 rounded-xl bg-white p-1"><button type="button" onClick={() => changeQuantity(quantity - 1)} className="h-9 w-9 rounded-lg">-</button><b>{quantity}</b><button type="button" onClick={() => changeQuantity(quantity + 1)} className="h-9 w-9 rounded-lg">+</button></div></div><p className="mt-4 text-xs text-marica-ink-soft">Maksimal {item.maxParticipants} peserta. Pendamping gratis dicatat pada langkah berikutnya.</p></div></div>; }
function CalendarStep({ month, setMonth, days, today, date, chooseDate }: { month: Date; setMonth: (value: Date) => void; days: (Date | null)[]; today: string; date: string; chooseDate: (value: string) => void }) { return <div><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-xl font-semibold">Pilih tanggal kunjungan</h2><p className="mt-1 text-xs text-marica-ink-soft">Tanggal dengan jadwal aktif dapat dipilih.</p></div><div className="flex items-center gap-1"><button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} title="Bulan sebelumnya" className="p-2"><ChevronLeft className="h-4 w-4" /></button><b className="min-w-32 text-center text-sm capitalize">{month.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</b><button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} title="Bulan berikutnya" className="p-2"><ChevronRight className="h-4 w-4" /></button></div></div><div className="mt-5 grid grid-cols-7 gap-1.5 text-center text-[11px] text-marica-ink-soft">{["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => <span key={day}>{day}</span>)}{days.map((item, index) => { const value = item ? dateKey(item) : ""; const disabled = !item || value < today; return <button key={`${value}-${index}`} type="button" disabled={disabled} onClick={() => chooseDate(value)} className={`min-h-14 rounded-xl p-1 text-left ${!item ? "" : value === date ? "border-2 border-marica-amber-dark bg-marica-amber/10" : disabled ? "bg-black/2.5 text-black/20" : "bg-marica-sky-light/25"}`}><span className="text-xs">{item?.getDate()}</span>{value === date && <small className="mt-2 block text-[9px] text-marica-amber-dark">Dipilih</small>}</button>; })}</div><p className="mt-5 rounded-xl bg-marica-sky-light/35 p-3 text-xs text-marica-ink-soft"><CalendarDays className="mr-2 inline h-4 w-4" />Pilih tanggal untuk melihat slot.</p></div>; }
function SlotPanel({ date, slots, loading, startTime, setStartTime, quantity, total, selectedSlot, step }: { date: string; slots: Slot[]; loading: boolean; startTime: string; setStartTime: (value: string) => void; quantity: number; total: number; selectedSlot?: Slot; step: Step }) { return <div className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-display text-lg font-semibold">{step === 1 ? "Slot waktu" : "Ringkasan pilihan"}</h2>{step === 1 ? !date ? <div className="mt-4 rounded-xl bg-marica-sky-light/25 p-8 text-center text-xs text-marica-ink-soft"><Clock3 className="mx-auto mb-3 h-7 w-7" />Pilih tanggal terlebih dahulu.</div> : loading ? <div className="p-8 text-center text-xs"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Memuat slot...</div> : <div className="mt-4 space-y-2">{slots.map((slot) => <button key={slot.value} type="button" disabled={!slot.available} onClick={() => setStartTime(slot.value)} className={`w-full rounded-xl border p-3 text-left ${startTime === slot.value ? "border-marica-amber-dark bg-marica-amber/10" : "border-black/10"}`}><div className="flex justify-between gap-2 text-sm font-semibold"><span>{slot.label}</span><small className={slot.available ? "text-marica-green" : "text-marica-rose-deep"}>{slot.available ? `${slot.remaining} tersisa` : "Penuh"}</small></div></button>)}</div> : <div className="mt-4 rounded-xl bg-marica-sky-light/25 px-4"><Row label="Tanggal" value={date ? formatDate(date) : "Belum dipilih"} /><Row label="Slot" value={selectedSlot?.label ?? "Belum dipilih"} /><Row label="Peserta" value={`${quantity} tiket`} /><Row label="Total" value={money(total)} strong /></div>}</div>; }
