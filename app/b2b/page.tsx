"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Sparkles,
  Users,
} from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

const programs = [
  { icon: GraduationCap, title: "Kunjungan sekolah", description: "Pengalaman belajar interaktif untuk rombongan siswa, lengkap dengan aktivitas bermain dan eksplorasi." },
  { icon: Sparkles, title: "Workshop & pelatihan guru", description: "Sesi parenting, edugame, dan pelatihan yang dapat disesuaikan dengan kebutuhan sekolah." },
  { icon: Users, title: "Paket corporate & komunitas", description: "Aktivitas team bonding dan family gathering yang menyenangkan untuk berbagai usia." },
  { icon: Building2, title: "Sewa area & paket acara", description: "Kustomisasi paket perayaan, private event, atau penggunaan area Marica Experience Store." },
];

const steps = [
  "Ceritakan kebutuhan dan perkiraan jumlah peserta.",
  "Tim Marica menghubungi Anda untuk membahas detail paket.",
  "Terima penawaran dan lanjutkan ke jadwal kegiatan.",
];

type FormState = {
  organizationName: string;
  organizationType: string;
  contactName: string;
  email: string;
  whatsapp: string;
  requestType: string;
  participantCount: string;
  eventDate: string;
  budget: string;
  notes: string;
};

const initialForm: FormState = {
  organizationName: "",
  organizationType: "SCHOOL",
  contactName: "",
  email: "",
  whatsapp: "",
  requestType: "",
  participantCount: "",
  eventDate: "",
  budget: "",
  notes: "",
};

export default function B2BPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successNumber, setSuccessNumber] = useState("");

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessNumber("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/b2b/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          participantCount: form.participantCount ? Number(form.participantCount) : undefined,
          budget: form.budget ? Number(form.budget) : undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Pengajuan belum berhasil dikirim.");
      setSuccessNumber(data.inquiryNumber || "berhasil dibuat");
      setForm(initialForm);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Pengajuan belum berhasil dikirim.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-marica-cream">
      <Navbar />
      <section className="overflow-hidden bg-marica-sky-light/20 px-6 pb-20 pt-14 sm:px-10 lg:px-16 lg:pb-28 lg:pt-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="font-body text-sm font-bold uppercase tracking-[0.18em] text-marica-amber-dark">Program sekolah & corporate</p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight text-marica-ink sm:text-6xl">Bangun pengalaman belajar yang seru bersama Marica.</h1>
            <p className="mt-6 max-w-2xl font-body text-lg leading-relaxed text-marica-ink-soft">Kami membantu sekolah, perusahaan, dan komunitas membuat kegiatan edukatif yang hangat, aktif, dan mudah disesuaikan dengan kebutuhan peserta.</p>
            <Link href="#inquiry" className="mt-8 inline-flex items-center gap-2 rounded-full bg-marica-amber-dark px-6 py-3.5 font-body font-bold text-white shadow-lg shadow-marica-amber/20 transition hover:-translate-y-0.5">
              Ajukan kebutuhan <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-[2rem] bg-white p-6 shadow-[0_20px_70px_rgba(120,60,10,0.12)] sm:p-8">
            <div className="grid grid-cols-2 gap-4">
              {[["Kunjungan", "sekolah"], ["Workshop", "edukatif"], ["Family", "gathering"], ["Paket", "custom"]].map(([title, subtitle]) => (
                <div key={title} className="rounded-2xl bg-marica-cream p-5">
                  <p className="font-display text-xl font-bold text-marica-ink">{title}</p>
                  <p className="mt-1 font-body text-sm text-marica-ink-soft">{subtitle}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl bg-marica-sky-light/30 p-5">
              <p className="font-body text-sm font-bold text-marica-ink">Satu pintu untuk kebutuhan kegiatan Anda</p>
              <p className="mt-2 font-body text-sm leading-relaxed text-marica-ink-soft">Sampaikan gambaran acaranya. Tim Marica akan membantu merancang opsi yang paling sesuai.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl"><p className="font-body text-sm font-bold uppercase tracking-[0.18em] text-marica-amber-dark">Yang bisa kami bantu</p><h2 className="mt-3 font-display text-3xl font-bold text-marica-ink sm:text-4xl">Program fleksibel untuk sekolah dan organisasi</h2></div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {programs.map(({ icon: Icon, title, description }) => <article key={title} className="rounded-3xl border border-marica-ink/5 bg-white p-6 shadow-sm"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-marica-amber/20 text-marica-amber-dark"><Icon className="h-6 w-6" /></span><h3 className="mt-5 font-display text-xl font-bold text-marica-ink">{title}</h3><p className="mt-3 font-body text-sm leading-relaxed text-marica-ink-soft">{description}</p></article>)}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-16 sm:px-10 lg:px-16 lg:py-20">
        <div className="mx-auto max-w-5xl"><div className="text-center"><p className="font-body text-sm font-bold uppercase tracking-[0.18em] text-marica-amber-dark">Cara kerja</p><h2 className="mt-3 font-display text-3xl font-bold text-marica-ink">Mulai dari cerita singkat tentang kebutuhan Anda</h2></div><div className="mt-10 grid gap-5 md:grid-cols-3">{steps.map((step, index) => <div key={step} className="rounded-3xl bg-marica-cream p-6 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-marica-amber-dark font-display text-xl font-bold text-white">{index + 1}</span><p className="mt-4 font-body text-sm leading-relaxed text-marica-ink-soft">{step}</p></div>)}</div></div>
      </section>

      <section id="inquiry" className="px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div><p className="font-body text-sm font-bold uppercase tracking-[0.18em] text-marica-amber-dark">Mulai percakapan</p><h2 className="mt-3 font-display text-3xl font-bold text-marica-ink sm:text-4xl">Ceritakan rencana kegiatan Anda</h2><p className="mt-5 font-body leading-relaxed text-marica-ink-soft">Isi formulir ini dan tim kami akan menghubungi Anda untuk membahas kebutuhan, jadwal, dan pilihan paket.</p><div className="mt-7 space-y-3">{["Tanpa komitmen saat pengajuan", "Paket dapat disesuaikan", "Respons dari tim Marica"].map((item) => <p key={item} className="flex items-center gap-2 font-body text-sm font-semibold text-marica-ink"><CheckCircle2 className="h-5 w-5 text-marica-green" />{item}</p>)}</div></div>
          <form onSubmit={handleSubmit} className="rounded-[2rem] bg-white p-6 shadow-[0_20px_70px_rgba(120,60,10,0.12)] sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="field-label">Nama organisasi *</span><input required value={form.organizationName} onChange={(e) => updateField("organizationName", e.target.value)} className="field-input" placeholder="Contoh: SD Pelita Bangsa" /></label>
              <label><span className="field-label">Tipe organisasi *</span><select required value={form.organizationType} onChange={(e) => updateField("organizationType", e.target.value)} className="field-input"><option value="SCHOOL">Sekolah</option><option value="CORPORATE">Corporate</option><option value="COMMUNITY">Komunitas</option></select></label>
              <label><span className="field-label">Jenis kebutuhan *</span><select required value={form.requestType} onChange={(e) => updateField("requestType", e.target.value)} className="field-input"><option value="">Pilih kebutuhan</option><option value="SCHOOL_VISIT">Kunjungan sekolah</option><option value="TEACHER_TRAINING">Workshop / pelatihan guru</option><option value="CORPORATE_EVENT">Corporate / family gathering</option><option value="AREA_RENTAL">Sewa area</option><option value="CUSTOM">Kebutuhan lainnya</option></select></label>
              <label><span className="field-label">Nama PIC *</span><input required value={form.contactName} onChange={(e) => updateField("contactName", e.target.value)} className="field-input" placeholder="Nama lengkap" /></label>
              <label><span className="field-label">WhatsApp *</span><input required type="tel" inputMode="numeric" pattern="[0-9]{8,15}" maxLength={15} value={form.whatsapp} onChange={(e) => updateField("whatsapp", e.target.value.replace(/\D/g, ""))} className="field-input" placeholder="08xxxxxxxxxx" /></label>
              <label><span className="field-label">Email *</span><input required type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} className="field-input" placeholder="pic@organisasi.id" /></label>
              <label><span className="field-label">Perkiraan peserta</span><input type="number" min="1" value={form.participantCount} onChange={(e) => updateField("participantCount", e.target.value)} className="field-input" placeholder="Contoh: 40" /></label>
              <label><span className="field-label">Rencana tanggal</span><input type="date" value={form.eventDate} onChange={(e) => updateField("eventDate", e.target.value)} className="field-input" /></label>
              <label><span className="field-label">Estimasi budget</span><input type="number" min="0" value={form.budget} onChange={(e) => updateField("budget", e.target.value)} className="field-input" placeholder="Dalam rupiah" /></label>
              <label className="sm:col-span-2"><span className="field-label">Catatan kebutuhan</span><textarea rows={4} value={form.notes} onChange={(e) => updateField("notes", e.target.value)} className="field-input resize-y" placeholder="Ceritakan tujuan, preferensi aktivitas, atau informasi lain..." /></label>
            </div>
            {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 font-body text-sm text-red-700">{error}</p>}
            {successNumber && <div role="status" className="mt-5 rounded-xl bg-green-50 px-4 py-3 font-body text-sm text-green-700">Inquiry berhasil dikirim dengan nomor <strong>{successNumber}</strong>. Tim Marica akan segera menghubungi Anda.</div>}
            <button type="submit" disabled={isSubmitting} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-marica-amber-dark px-5 py-3.5 font-body font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Mengirim...</> : <>Kirim inquiry <ArrowRight className="h-4 w-4" /></>}</button>
          </form>
        </div>
      </section>
      <Footer />
      <style jsx>{`.field-label{display:block;margin-bottom:.5rem;font-family:var(--font-body);font-size:.875rem;font-weight:700;color:var(--color-marica-ink)}.field-input{width:100%;border-radius:.75rem;border:1px solid rgb(28 27 27 / .12);background:#fff;padding:.75rem 1rem;font-family:var(--font-body);font-size:.875rem;color:var(--color-marica-ink);outline:none}.field-input:focus{border-color:var(--color-marica-amber-dark);box-shadow:0 0 0 3px rgb(222 143 12 / .14)}`}</style>
    </main>
  );
}
