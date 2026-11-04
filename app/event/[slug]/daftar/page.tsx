"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Ticket } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import FeedbackPopup from "@/app/components/FeedbackPopup";
import type { EventItem } from "../../events-data";

export default function EventRegistrationPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [participants, setParticipants] = useState([""]);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/events/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then((response) =>
        response.ok
          ? response.json()
          : Promise.reject(new Error("Event tidak ditemukan")),
      )
      .then((data: EventItem) => setEvent(data))
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Event tidak ditemukan",
        ),
      );
  }, [slug]);

  const updateQuantity = (value: number) => {
    const nextQuantity = Math.max(1, Math.min(10, value || 1));
    setQuantity(nextQuantity);
    setParticipants((current) =>
      Array.from({ length: nextQuantity }, (_, index) => current[index] ?? ""),
    );
  };

  const submit = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (phone && !/^[0-9]{8,15}$/.test(phone)) {
      setError("Nomor WhatsApp harus berupa angka 8-15 digit.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/event-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventSlug: slug,
          quantity,
          participantNames: participants,
          customerPhone: phone,
        }),
      });
      const result = (await response.json()) as {
        booking?: { bookingNumber: string };
        redirectUrl?: string;
        error?: string;
      };
      if (response.status === 401) {
        router.push(
          `/login?callbackUrl=${encodeURIComponent(`/event/${slug}/daftar`)}`,
        );
        return;
      }
      if (!response.ok) throw new Error(result.error ?? "Booking gagal dibuat");
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else if (result.booking?.bookingNumber) {
        router.push(`/event/tiket/${result.booking.bookingNumber}`);
      } else {
        router.push("/event-saya");
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Booking gagal dibuat",
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white font-body">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-10 lg:px-10">
          <Link
            href={`/event/${slug}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-marica-ink-soft"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke detail event
          </Link>
          <div className="mt-6 rounded-2xl border border-marica-ink/10 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold text-marica-amber-dark">
              Pendaftaran event
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold text-marica-ink">
              {event?.title ?? "Memuat event..."}
            </h1>
            <p className="mt-2 text-sm text-marica-ink-soft">
              Data peserta akan dicetak pada tiket elektronik.
            </p>
            <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
              <label className="text-sm font-medium text-marica-ink">
                Jumlah peserta
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={quantity}
                  onChange={(e) => updateQuantity(Number(e.target.value.replace(/\D/g, "")))}
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-", "."].includes(e.key)) e.preventDefault();
                  }}
                  className="mt-2 w-full rounded-xl border border-marica-ink/10 px-4 py-3 outline-none focus:border-marica-amber-dark"
                />
              </label>
              <label className="text-sm font-medium text-marica-ink">
                Nomor WhatsApp
                <input
                  type="tel"
                  value={phone}
                  inputMode="numeric"
                  pattern="[0-9]{8,15}"
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 15))}
                  className="mt-2 w-full rounded-xl border border-marica-ink/10 px-4 py-3 outline-none focus:border-marica-amber-dark"
                />
              </label>
              {participants.map((participant, index) => (
                <label
                  key={index}
                  className="text-sm font-medium text-marica-ink"
                >
                  Nama peserta {index + 1}
                  <input
                    required
                    value={participant}
                    onChange={(e) =>
                      setParticipants((current) =>
                        current.map((name, itemIndex) =>
                          itemIndex === index ? e.target.value : name,
                        ),
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-marica-ink/10 px-4 py-3 outline-none focus:border-marica-amber-dark"
                  />
                </label>
              ))}
              <button
                type="submit"
                disabled={submitting || !event}
                className="flex items-center justify-center gap-2 rounded-full bg-marica-amber-dark px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ticket className="h-4 w-4" />
                )}
                {event?.price === "Gratis"
                  ? "Daftar Gratis"
                  : "Lanjut ke Pembayaran"}
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
      <FeedbackPopup message={error} onClose={() => setError(null)} />
    </div>
  );
}
