"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  ArrowRight,
  Ticket,
} from "lucide-react";

import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import {
  categoryLabel,
  categoryStyle,
  formatLongDateID,
  isEventExpired,
  type EventItem,
} from "../events-data";

export default function EventDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [related, setRelated] = useState<EventItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/events/${encodeURIComponent(params.slug)}`, {
        cache: "no-store",
      }),
      fetch("/api/events", { cache: "no-store" }),
    ])
      .then(async ([eventResponse, eventsResponse]) => {
        if (!eventResponse.ok) throw new Error("Event tidak ditemukan");
        const eventData = (await eventResponse.json()) as EventItem;
        const events = eventsResponse.ok
          ? ((await eventsResponse.json()) as EventItem[])
          : [];
        setEvent(eventData);
        setRelated(
          events.filter((item) => item.slug !== eventData.slug).slice(0, 3),
        );
      })
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Event tidak ditemukan",
        ),
      );
  }, [params.slug]);

  if (error)
    return (
      <div className="flex min-h-screen items-center justify-center font-body text-marica-ink-soft">
        {error}
      </div>
    );
  if (!event)
    return (
      <div className="flex min-h-screen items-center justify-center font-body text-marica-ink-soft">
        Memuat event...
      </div>
    );

  const style = categoryStyle(event.category);
  const expired = isEventExpired(event.date);
  const quotaFilled = event.quota - event.quotaLeft;
  const quotaPct = Math.round((quotaFilled / event.quota) * 100);

  return (
    <div className="flex min-h-screen flex-col bg-white font-body">
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-8 lg:px-10">
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Link
              href="/event"
              className="inline-flex items-center gap-1.5 font-body text-sm font-semibold text-marica-ink-soft transition hover:text-marica-ink"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Kalender Event
            </Link>
          </motion.div>

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: "easeOut" }}
            className="relative mt-5 overflow-hidden rounded-3xl bg-gradient-to-br from-marica-rose/40 via-marica-amber/20 to-marica-sky-light px-8 py-10 sm:px-12"
          >
            <span
              className={`inline-block rounded-full px-3.5 py-1.5 font-body text-xs font-semibold ${style.bg} ${style.text}`}
            >
              {categoryLabel(event.category)}
            </span>
            {expired && (
              <motion.span
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: [0.75, 1, 0.75], scale: [0.98, 1.03, 0.98] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="ml-2 inline-block rounded-full border border-marica-rose-deep/20 bg-marica-rose-deep/10 px-3.5 py-1.5 font-body text-xs font-bold uppercase tracking-wide text-marica-rose-deep"
              >
                Sudah Expired
              </motion.span>
            )}

            <h1 className="mt-4 font-display text-3xl font-bold text-marica-ink sm:text-4xl">
              {event.title}
            </h1>
            <p className="mt-3 max-w-xl font-body text-marica-ink-soft">
              {event.shortDescription}
            </p>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 font-body text-sm text-marica-ink">
              <span className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-marica-amber-dark" />
                {formatLongDateID(event.date)}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-marica-amber-dark" />
                {event.timeStart} - {event.timeEnd} WIB
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-marica-amber-dark" />
                {event.location}
              </span>
            </div>
          </motion.div>

          {/* Body grid */}
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.6fr_1fr]">
            <div className="flex flex-col gap-8">
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.14, ease: "easeOut" }}
              >
                <h2 className="font-display text-xl font-bold text-marica-ink">
                  Tentang kegiatan ini
                </h2>
                <div className="mt-3 flex flex-col gap-3 font-body text-sm leading-relaxed text-marica-ink-soft">
                  {event.description.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
              >
                <h2 className="font-display text-xl font-bold text-marica-ink">
                  Rangkaian acara
                </h2>
                <ol className="mt-4 flex flex-col">
                  {event.agenda.map((step, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.35,
                        delay: 0.24 + i * 0.06,
                        ease: "easeOut",
                      }}
                      className="relative flex gap-4 pb-6 last:pb-0"
                    >
                      <div className="flex flex-col items-center">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-marica-amber/20 font-body text-xs font-bold text-marica-amber-dark">
                          {i + 1}
                        </span>
                        {i < event.agenda.length - 1 && (
                          <span className="mt-1 w-px flex-1 bg-marica-ink/10" />
                        )}
                      </div>
                      <div className="pb-1">
                        <p className="font-body text-xs font-semibold text-marica-amber-dark">
                          {step.time} WIB
                        </p>
                        <p className="mt-0.5 font-body text-sm text-marica-ink">
                          {step.item}
                        </p>
                      </div>
                    </motion.li>
                  ))}
                </ol>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.26, ease: "easeOut" }}
                className="flex items-center gap-4 rounded-2xl border border-marica-ink/10 bg-marica-cream/60 p-5"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white font-display text-lg font-bold text-marica-amber-dark shadow-sm">
                  {(event.facilitator.name.split(" ")[1] ?? "M").charAt(0)}
                </span>
                <div>
                  <p className="font-body text-xs text-marica-ink-soft">
                    Dipandu oleh
                  </p>
                  <p className="font-display text-base font-bold text-marica-ink">
                    {event.facilitator.name}
                  </p>
                  <p className="font-body text-sm text-marica-ink-soft">
                    {event.facilitator.role}
                  </p>
                </div>
              </motion.section>
            </div>

            {/* Sidebar: registration card */}
            <motion.aside
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18, ease: "easeOut" }}
              className="h-fit rounded-2xl border border-marica-ink/10 bg-white p-6 shadow-sm lg:sticky lg:top-24"
            >
              <p className="font-display text-2xl font-bold text-marica-ink">
                {event.price}
              </p>

              <div className="mt-5 flex flex-col gap-3 border-y border-marica-ink/10 py-5 font-body text-sm text-marica-ink-soft">
                <span className="flex items-center gap-2.5">
                  <CalendarIcon className="h-4 w-4 shrink-0" />
                  {formatLongDateID(event.date)}
                </span>
                <span className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 shrink-0" />
                  {event.timeStart} - {event.timeEnd} WIB
                </span>
                <span className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {event.location}
                </span>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between font-body text-xs text-marica-ink-soft">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Kuota terisi
                  </span>
                  <span>
                    {quotaFilled}/{event.quota}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-marica-cream">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${quotaPct}%` }}
                    transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
                    className="h-full rounded-full bg-marica-amber-dark"
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={expired || event.quotaLeft === 0}
                onClick={() => {
                  const destination = `/event/${event.slug}/daftar`;
                  router.push(
                    sessionStatus === "unauthenticated"
                      ? `/login?callbackUrl=${encodeURIComponent(destination)}`
                      : destination,
                  );
                }}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-marica-amber-dark px-5 py-3 font-body text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Ticket className="h-4 w-4" />
                {expired
                  ? "Event Sudah Expired"
                  : event.quotaLeft === 0
                    ? "Kuota Penuh"
                    : "Daftar Sekarang"}
              </motion.button>

              <p className="mt-3 text-center font-body text-xs text-marica-ink-soft">
                Pendaftaran dibuka hingga H-1 acara.
              </p>
            </motion.aside>
          </div>

          {/* Related events */}
          {related.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mt-14"
            >
              <h2 className="font-display text-xl font-bold text-marica-ink">
                Kegiatan lainnya
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {related.map((ev, i) => {
                  const s = categoryStyle(ev.category);
                  return (
                    <motion.div
                      key={ev.slug}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{
                        duration: 0.4,
                        delay: i * 0.08,
                        ease: "easeOut",
                      }}
                      whileHover={{ y: -3 }}
                      className="rounded-2xl border border-marica-ink/10 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <span
                        className={`inline-block rounded-full px-3 py-1 font-body text-xs font-semibold ${s.bg} ${s.text}`}
                      >
                        {categoryLabel(ev.category)}
                      </span>
                      <h3 className="mt-3 font-display text-sm font-bold text-marica-ink">
                        {ev.title}
                      </h3>
                      <p className="mt-1.5 font-body text-xs text-marica-ink-soft">
                        {formatLongDateID(ev.date)}
                      </p>
                      <Link
                        href={`/event/${ev.slug}`}
                        className="mt-3 flex items-center gap-1 font-body text-xs font-semibold text-marica-amber-dark"
                      >
                        Lihat Detail
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
