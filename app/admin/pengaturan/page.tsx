"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle } from "lucide-react";

export default function AdminSettingsPage() {
  const [whatsapp, setWhatsapp] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/company", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Gagal memuat pengaturan");
        setWhatsapp(data.whatsapp ?? "");
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Gagal memuat pengaturan"),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal menyimpan pengaturan");
      setWhatsapp(data.whatsapp ?? whatsapp);
      setMessage("Nomor WhatsApp checkout berhasil disimpan.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menyimpan pengaturan");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-marica-amber-text">
          Pengaturan toko
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-marica-ink">
          WhatsApp Checkout
        </h1>
        <p className="mt-2 font-body text-sm text-marica-ink-soft">
          Nomor ini akan menerima pesan otomatis ketika pelanggan menyelesaikan checkout produk.
        </p>
      </div>

      <form onSubmit={save} className="rounded-3xl border border-marica-ink/8 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-marica-green/15 text-marica-green">
            <MessageCircle className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <label htmlFor="whatsapp" className="font-body text-sm font-bold text-marica-ink">
              Nomor WhatsApp bisnis
            </label>
            <input
              id="whatsapp"
              value={whatsapp}
              onChange={(event) => setWhatsapp(event.target.value)}
              placeholder="Contoh: 085870459329 atau 6285870459329"
              disabled={isLoading || isSaving}
              className="mt-2 w-full rounded-xl border border-marica-ink/10 px-4 py-3 font-body text-sm text-marica-ink outline-none focus:border-marica-amber disabled:bg-marica-cream/50"
            />
            <p className="mt-2 font-body text-xs text-marica-ink-soft">
              Nomor akan otomatis dinormalisasi ke format internasional (+62).
            </p>
          </div>
        </div>
        {error && <p className="mt-5 rounded-xl bg-marica-rose-deep/10 px-4 py-3 font-body text-sm text-marica-rose-deep">{error}</p>}
        {message && <p className="mt-5 flex items-center gap-2 rounded-xl bg-marica-green/10 px-4 py-3 font-body text-sm text-marica-green"><CheckCircle2 className="h-4 w-4" />{message}</p>}
        <button
          type="submit"
          disabled={isLoading || isSaving}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-marica-amber-dark px-5 py-3 font-body text-sm font-semibold text-white disabled:opacity-50"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Simpan nomor WhatsApp
        </button>
      </form>
    </div>
  );
}
