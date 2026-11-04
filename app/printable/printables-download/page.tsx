"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Star, Download, CheckCircle2, Loader2 } from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { CATEGORY_STYLES, getPrintableById } from "../activities-data";

const AGE_OPTIONS = ["2-3 Tahun", "3-5 Tahun", "4-6 Tahun", "5-7 Tahun", "7-9 Tahun"];

export default function PrintablesDownloadPage() {
  return (
    <Suspense fallback={null}>
      <PrintablesDownloadContent />
    </Suspense>
  );
}

function PrintablesDownloadContent() {
  const searchParams = useSearchParams();
  const [printable, setPrintable] = useState(() => getPrintableById(searchParams.get("item")));
  const printableKey = searchParams.get("item");

  useEffect(() => {
    if (!printableKey) return;

    fetch(`/api/printables/${encodeURIComponent(printableKey)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Printable tidak ditemukan"))))
      .then((data: { id: string; slug: string; title: string; description: string; subject: string; thumbnailUrl: string | null }) => {
        setPrintable((current) => ({
          ...current,
          id: data.slug,
          title: data.title,
          description: data.description,
          longDescription: data.description,
          categoryLabel: data.subject,
          thumbnailUrl: data.thumbnailUrl,
        }));
      })
      .catch((error) => console.error("[PrintablesDownloadPage]", error));
  }, [printableKey]);
  const style = CATEGORY_STYLES[printable.category];
  const Icon = style.icon;
  const reduceMotion = useReducedMotion();

  return (
    <>
      <Navbar />
      <main className="hero-gradient-bg-v2 min-h-screen">
        <motion.section
          initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto grid max-w-7xl grid-cols-1 gap-7 px-4 pb-16 pt-6 sm:gap-10 sm:px-6 sm:pt-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14 lg:px-10 lg:pb-28 lg:pt-10"
        >
          {/* Preview */}
          <div>
            <div
              className="overflow-hidden rounded-2xl border-2 p-1.5 sm:rounded-3xl sm:p-2"
              style={{ borderColor: style.iconColor + "55" }}
            >
              <div
                className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl sm:aspect-[5/4] sm:rounded-2xl lg:aspect-[4/3]"
                style={{ backgroundImage: `linear-gradient(135deg, ${style.from}, ${style.to})` }}
              >
                <div className="absolute left-4 top-4 flex gap-1.5 opacity-50" aria-hidden>
                  <span className="h-2.5 w-2.5 rounded-full bg-marica-ink/40" />
                  <span className="h-2.5 w-2.5 rounded-full bg-marica-ink/40" />
                  <span className="h-2.5 w-2.5 rounded-full bg-marica-ink/40" />
                </div>
                {printable.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={printable.thumbnailUrl}
                    alt={printable.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/70 shadow-inner sm:h-24 sm:w-24">
                    <Icon className="h-9 w-9 sm:h-11 sm:w-11" style={{ color: style.iconColor }} />
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 font-body text-xs text-marica-ink-soft">
              <span>Format: {printable.format}</span>
              <span>Size: {printable.fileSizeMb} MB</span>
            </div>
          </div>

          {/* Details + form */}
          <div>
            <div
              className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ backgroundColor: style.badgeBg, color: style.badgeText }}
            >
              <Star className="h-3.5 w-3.5 fill-current" /> GRATIS UNTUK MEMBER
            </div>

            <h1 className="mt-3 font-display text-2xl font-semibold leading-tight text-marica-ink sm:mt-4 sm:text-3xl">{printable.title}</h1>
            <p className="mt-3 text-sm leading-6 text-marica-ink-soft sm:text-base">{printable.longDescription}</p>

            <div className="mt-5 rounded-2xl bg-white p-4 shadow-[0_14px_35px_rgba(120,60,10,0.08)] sm:mt-6 sm:p-7">
              <DownloadForm
                printableId={printable.id}
                printableTitle={printable.title}
                reduceMotion={!!reduceMotion}
              />
            </div>

            <p className="mt-4 text-xs leading-5 text-marica-ink-soft sm:text-sm">
              Dengan mengunduh materi ini, Anda menyetujui{" "}
              <Link href="/syarat-ketentuan" className="font-semibold text-marica-amber-text underline underline-offset-2">
                Syarat & Ketentuan
              </Link>{" "}
              serta{" "}
              <Link href="/kebijakan-privasi" className="font-semibold text-marica-amber-text underline underline-offset-2">
                Kebijakan Privasi
              </Link>{" "}
              kami. Tautan unduhan akan dikirim langsung ke email Anda.
            </p>
          </div>
        </motion.section>
      </main>
      <Footer />
    </>
  );
}

function DownloadForm({
  printableId,
  printableTitle,
  reduceMotion,
}: {
  printableId: string;
  printableTitle: string;
  reduceMotion: boolean;
}) {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<{
    email: "sent" | "failed";
    whatsapp: "accepted" | "failed" | "not_configured";
  } | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", whatsapp: "", age: "" });

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;

    let cancelled = false;
    const fallback = {
      name: session?.user?.name ?? "",
      email: session?.user?.email ?? "",
    };

    fetch("/api/user/profile", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "Profil tidak dapat dimuat");
        return data as { name?: string | null; email?: string | null; whatsapp?: string | null };
      })
      .then((profile) => {
        if (cancelled) return;
        setForm((current) => ({
          ...current,
          name: current.name || profile.name || fallback.name,
          email: current.email || profile.email || fallback.email,
          whatsapp: current.whatsapp || normalizeWhatsapp(profile.whatsapp),
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setForm((current) => ({
          ...current,
          name: current.name || fallback.name,
          email: current.email || fallback.email,
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [sessionStatus, session?.user?.email, session?.user?.name]);

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: field === "whatsapp" ? e.target.value.replace(/\D/g, "") : e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (sessionStatus !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    setStatus("submitting");
    setError(null);

    try {
      const response = await fetch(`/api/printables/${encodeURIComponent(printableId)}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          whatsapp: form.whatsapp,
          childAge: Number.parseInt(form.age, 10),
        }),
      });
      const result = (await response.json()) as {
        downloadUrl?: string;
        error?: string;
        delivery?: {
          email: "sent" | "failed";
          whatsapp: "accepted" | "failed" | "not_configured";
        };
        whatsappUrl?: string;
      };

      if (response.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }

      if (!response.ok || !result.downloadUrl) {
        throw new Error(result.error ?? "Download belum bisa disiapkan");
      }

      setDownloadUrl(result.downloadUrl);
      setDelivery(result.delivery ?? null);
      setWhatsappUrl(result.whatsappUrl ?? null);
      setStatus("success");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Terjadi kesalahan");
      setStatus("idle");
    }
  };

  return (
    <AnimatePresence mode="wait">
      {sessionStatus === "loading" ? (
        <motion.div
          key="session-loading"
          initial={reduceMotion ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 py-6 text-sm text-marica-ink-soft"
        >
          <Loader2 className="h-4 w-4 animate-spin" /> Memeriksa sesi login...
        </motion.div>
      ) : sessionStatus !== "authenticated" ? (
        <motion.div
          key="login-required"
          initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center py-6 text-center"
        >
          <h3 className="font-display text-lg font-semibold text-marica-ink">Login untuk mengunduh</h3>
          <p className="mt-2 max-w-sm font-body text-sm leading-5 text-marica-ink-soft">
            Silakan login terlebih dahulu agar data download dan MARICA Points dapat tercatat di akunmu.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-marica-amber-dark px-5 py-3 font-body text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
          >
            Login untuk Download
          </button>
        </motion.div>
      ) : status === "success" ? (
        <motion.div
          key="success"
          initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center py-6 text-center"
        >
          <CheckCircle2 className="h-12 w-12 text-marica-green" />
          <h3 className="mt-4 font-display text-lg font-semibold text-marica-ink">Printable siap diunduh!</h3>
          <p className="mt-1 font-body text-sm text-marica-ink-soft">
            Download &ldquo;{printableTitle}&rdquo; sudah siap.
          </p>
          {delivery && (
            <p className="mt-2 max-w-md font-body text-xs leading-5 text-marica-ink-soft" aria-live="polite">
              Email: {delivery.email === "sent" ? "terkirim" : "belum berhasil"}.
              {" "}Meta WhatsApp: {delivery.whatsapp === "accepted"
                ? "diterima provider"
                : delivery.whatsapp === "not_configured"
                  ? "belum dikonfigurasi"
                  : "belum berhasil"}.
              {" "}Link WhatsApp siap dibagikan melalui tombol di bawah.
            </p>
          )}
          {downloadUrl && (
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-marica-amber-dark px-5 py-3 font-body text-sm font-semibold text-white"
              >
                <Download className="h-4 w-4" /> Buka PDF
              </a>
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-marica-green/30 bg-marica-green/10 px-5 py-3 font-body text-sm font-semibold text-marica-green"
                >
                  Kirim lewat WhatsApp
                </a>
              )}
            </div>
          )}
        </motion.div>
      ) : (
        <motion.form
          key="form"
          initial={reduceMotion ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.2 }}
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <div>
            <h2 className="font-display text-lg font-semibold text-marica-ink">Informasi Pengiriman</h2>
            <p className="mt-1 font-body text-xs leading-5 text-marica-ink-soft">
            Data profilmu akan terisi otomatis. Link download akan dikirim ke email dan bisa dibagikan lewat WhatsApp.
            </p>
          </div>

          {error && <p className="rounded-xl bg-red-50 px-4 py-3 font-body text-sm text-red-700">{error}</p>}

          <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama Lengkap Orang Tua">
            <input
              required
              type="text"
              value={form.name}
              onChange={update("name")}
              placeholder="Masukkan nama lengkap"
              className="w-full rounded-xl border border-marica-ink/10 bg-white px-4 py-2.5 font-body text-sm text-marica-ink placeholder:text-marica-ink-soft/60 outline-none transition focus:border-marica-amber-dark focus:ring-2 focus:ring-marica-amber-dark/20"
            />
          </Field>

          <Field label="Alamat Email">
            <input
              required
              type="email"
              value={form.email}
              onChange={update("email")}
              placeholder="Alamat pengiriman file PDF"
              className="w-full rounded-xl border border-marica-ink/10 bg-white px-4 py-2.5 font-body text-sm text-marica-ink placeholder:text-marica-ink-soft/60 outline-none transition focus:border-marica-amber-dark focus:ring-2 focus:ring-marica-amber-dark/20"
            />
          </Field>

          <Field label="Nomor WhatsApp">
            <div className="flex items-center overflow-hidden rounded-xl border border-marica-ink/10 bg-white transition focus-within:border-marica-amber-dark focus-within:ring-2 focus-within:ring-marica-amber-dark/20">
              <span className="border-r border-marica-ink/10 px-3 py-2.5 font-body text-sm text-marica-ink-soft">
                +62
              </span>
              <input
                required
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{8,15}"
                maxLength={15}
                value={form.whatsapp}
                onChange={update("whatsapp")}
                placeholder="812-xxxx-xxxx"
                className="w-full px-4 py-2.5 font-body text-sm text-marica-ink placeholder:text-marica-ink-soft/60 outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-marica-ink-soft">
              Setelah berhasil, kamu bisa membagikan link PDF ke nomor ini melalui WhatsApp.
            </p>
          </Field>

          <Field label="Usia Anak">
            <select
              required
              value={form.age}
              onChange={update("age")}
              className="w-full rounded-xl border border-marica-ink/10 bg-white px-4 py-2.5 font-body text-sm text-marica-ink outline-none transition focus:border-marica-amber-dark focus:ring-2 focus:ring-marica-amber-dark/20"
            >
              <option value="" disabled>
                Pilih usia anak
              </option>
              {AGE_OPTIONS.map((age) => (
                <option key={age} value={age}>
                  {age}
                </option>
              ))}
            </select>
          </Field>
          </div>

          <button
            type="submit"
            disabled={status === "submitting"}
            className="mt-2 flex items-center justify-center gap-2 rounded-full bg-marica-amber-dark px-5 py-3 font-body text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-70"
          >
            {status === "submitting" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Memproses...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" /> Lanjutkan ke Download
              </>
            )}
          </button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-body text-sm font-medium text-marica-ink">{label}</span>
      {children}
    </label>
  );
}

function normalizeWhatsapp(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.startsWith("62")) return digits.slice(2);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}
