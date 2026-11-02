"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar as CalendarIcon,
  GraduationCap,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  ArrowRight,
  Info,
} from "lucide-react";

import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import {
  CATEGORY_LABEL,
  CATEGORY_STYLE,
  DAY_LABELS_ID,
  MONTH_LABELS_ID,
  formatLongDateID,
  isEventExpired,
  todayInJakarta,
  type EventCategory,
  type EventItem,
} from "./events-data";

export const dynamic = "force-dynamic";

type CategoryFilter = "semua" | EventCategory;
type ViewMode = "kalender" | "daftar";

// Sel kalender: tanggal asli + apakah termasuk bulan yang sedang dilihat.
type CalendarCell = {
  date: Date;
  inCurrentMonth: boolean;
};

function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const firstOfMonth = new Date(year, month, 1);
  // getDay(): 0 = Minggu ... 6 = Sabtu. Kita mau minggu mulai Senin,
  // jadi geser supaya Senin = 0.
  const leadingBlank = (firstOfMonth.getDay() + 6) % 7;

  const start = new Date(year, month, 1 - leadingBlank);
  const cells: CalendarCell[] = [];

  // 6 baris x 7 kolom cukup untuk menampung bulan apa pun.
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ date: d, inCurrentMonth: d.getMonth() === month });
  }
  return cells;
}

function isoOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function EventCalendarPage() {
  const today = useMemo(() => todayInJakarta(), []);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [category, setCategory] = useState<CategoryFilter>("semua");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("kalender");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/events", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Gagal memuat daftar event");
        return response.json() as Promise<EventItem[]>;
      })
      .then((data) => {
        if (!cancelled) setEvents(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (!cancelled)
          setLoadError(
            error instanceof Error
              ? error.message
              : "Gagal memuat daftar event",
          );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const ev of events) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchesCategory = category === "semua" || ev.category === category;
      const matchesQuery = ev.title
        .toLowerCase()
        .includes(query.trim().toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [category, events, query]);

  const eventsThisMonth = useMemo(
    () =>
      filteredEvents.filter((ev) => {
        const d = new Date(`${ev.date}T00:00:00`);
        return d.getFullYear() === year && d.getMonth() === month;
      }),
    [filteredEvents, year, month],
  );

  const stats = useMemo(() => {
    const monthAll = events.filter((ev) => {
      const d = new Date(`${ev.date}T00:00:00`);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    return {
      total: monthAll.length,
      workshop: monthAll.filter((e) => e.category === "workshop").length,
      parenting: monthAll.filter((e) => e.category === "parenting").length,
    };
  }, [events, year, month]);

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const goToday = () =>
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
  const goPrev = () => setCursor(new Date(year, month - 1, 1));
  const goNext = () => setCursor(new Date(year, month + 1, 1));

  return (
    <div className="flex min-h-screen flex-col bg-white font-body">
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
          {/* Header banner */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-marica-rose/40 via-marica-amber/20 to-marica-sky-light px-8 py-10 sm:px-12"
          >
            <nav className="font-body text-sm text-marica-ink-soft">
              <Link href="/" className="hover:text-marica-ink">
                Beranda
              </Link>
              <span className="mx-2">/</span>
              <span className="font-semibold text-marica-ink">
                Event & Workshop
              </span>
            </nav>

            <h1 className="mt-4 font-display text-4xl font-bold text-marica-ink sm:text-5xl">
              Kalender Event & Workshop
            </h1>
            <p className="mt-3 max-w-xl font-body text-marica-ink-soft">
              Temukan jadwal weekend workshop dan sesi parenting bersama Marica.
            </p>

            <motion.div
              aria-hidden
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute -right-6 top-1/2 hidden h-40 w-40 -translate-y-1/2 rounded-3xl bg-white/70 shadow-lg backdrop-blur-sm sm:block lg:right-10 lg:h-48 lg:w-64"
            >
              <div className="flex h-full w-full items-center justify-center">
                <CalendarIcon className="h-16 w-16 text-marica-amber-dark" />
              </div>
            </motion.div>
          </motion.div>

          {loadError && (
            <p className="mt-6 rounded-2xl bg-marica-rose-deep/10 px-4 py-3 font-body text-sm text-marica-rose-deep">
              {loadError}
            </p>
          )}

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="mt-6 grid grid-cols-1 divide-y divide-marica-ink/10 rounded-2xl border border-marica-ink/10 bg-white shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0"
          >
            <StatItem
              icon={<CalendarIcon className="h-5 w-5" />}
              label="Kegiatan bulan ini"
              value={stats.total}
            />
            <StatItem
              icon={<GraduationCap className="h-5 w-5" />}
              label="Weekend Workshop"
              value={stats.workshop}
            />
            <StatItem
              icon={<Users className="h-5 w-5" />}
              label="Sesi Parenting"
              value={stats.parenting}
            />
          </motion.div>

          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease: "easeOut" }}
            className="mt-6 flex flex-col gap-4 rounded-2xl border border-marica-ink/10 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="relative w-full lg:max-w-xs">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-marica-ink-soft" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="text"
                placeholder="Cari event atau workshop..."
                className="w-full rounded-full border border-marica-ink/10 bg-white py-2.5 pl-10 pr-4 font-body text-sm text-marica-ink placeholder:text-marica-ink-soft/70 focus:outline-none focus:ring-2 focus:ring-marica-amber/40"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <FilterPill
                active={category === "semua"}
                onClick={() => setCategory("semua")}
              >
                Semua
              </FilterPill>
              <FilterPill
                active={category === "workshop"}
                onClick={() => setCategory("workshop")}
              >
                Weekend Workshop
              </FilterPill>
              <FilterPill
                active={category === "parenting"}
                onClick={() => setCategory("parenting")}
              >
                Sesi Parenting
              </FilterPill>
            </div>

            <div className="flex shrink-0 items-center gap-1 rounded-full bg-marica-cream p-1">
              <ViewToggleButton
                active={view === "kalender"}
                onClick={() => setView("kalender")}
                icon={<CalendarIcon className="h-4 w-4" />}
                label="Kalender"
              />
              <ViewToggleButton
                active={view === "daftar"}
                onClick={() => setView("daftar")}
                icon={<List className="h-4 w-4" />}
                label="Daftar"
              />
            </div>
          </motion.div>

          {/* Body: calendar/list + sidebar */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24, ease: "easeOut" }}
              className="rounded-2xl border border-marica-ink/10 bg-white p-5 shadow-sm"
            >
              <AnimatePresence mode="wait">
                {view === "kalender" ? (
                  <motion.div
                    key="kalender"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <AnimatePresence mode="wait">
                        <motion.h2
                          key={`${year}-${month}`}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -12 }}
                          transition={{ duration: 0.2 }}
                          className="font-display text-2xl font-bold text-marica-ink"
                        >
                          {MONTH_LABELS_ID[month]} {year}
                        </motion.h2>
                      </AnimatePresence>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 font-body text-xs text-marica-ink-soft">
                          <span className="h-2 w-2 rounded-full bg-marica-amber-dark" />
                          Weekend Workshop
                          <span className="ml-3 h-2 w-2 rounded-full bg-marica-teal" />
                          Sesi Parenting
                        </div>

                        <button
                          onClick={goToday}
                          className="rounded-full border border-marica-ink/10 px-3.5 py-1.5 font-body text-sm font-semibold text-marica-ink transition hover:bg-marica-cream"
                        >
                          Hari Ini
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            aria-label="Bulan sebelumnya"
                            onClick={goPrev}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-marica-ink/10 text-marica-ink transition hover:bg-marica-cream"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            aria-label="Bulan berikutnya"
                            onClick={goNext}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-marica-ink/10 text-marica-ink transition hover:bg-marica-cream"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-7 overflow-hidden rounded-xl border border-marica-ink/10">
                      {DAY_LABELS_ID.map((d, i) => (
                        <div
                          key={d}
                          className={`border-b border-marica-ink/10 px-2 py-2.5 text-center font-body text-xs font-semibold text-marica-ink-soft ${
                            i >= 5 ? "bg-marica-cream/60" : "bg-white"
                          }`}
                        >
                          {d}
                        </div>
                      ))}

                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`${year}-${month}-grid`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="col-span-7 grid grid-cols-7"
                        >
                          {grid.map((cell, i) => {
                            const iso = isoOf(cell.date);
                            const dayEvents = (
                              eventsByDate.get(iso) ?? []
                            ).filter(
                              (ev) =>
                                category === "semua" ||
                                ev.category === category,
                            );
                            const isToday = isSameDay(cell.date, today);
                            const isWeekend = (cell.date.getDay() + 6) % 7 >= 5;

                            return (
                              <div
                                key={i}
                                className={`min-h-[86px] border-b border-r border-marica-ink/10 p-1.5 last:border-r-0 [&:nth-child(7n)]:border-r-0 ${
                                  isWeekend ? "bg-marica-cream/40" : "bg-white"
                                } ${!cell.inCurrentMonth ? "opacity-40" : ""}`}
                              >
                                <span
                                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-body text-xs ${
                                    isToday
                                      ? "border border-marica-amber-dark font-bold text-marica-amber-dark"
                                      : "text-marica-ink"
                                  }`}
                                >
                                  {cell.date.getDate()}
                                </span>

                                <div className="mt-1 flex flex-col gap-1">
                                  {dayEvents.slice(0, 2).map((ev) => {
                                    const style = CATEGORY_STYLE[ev.category];
                                    const expired = isEventExpired(ev.date);
                                    return (
                                      <Link
                                        key={ev.slug}
                                        href={`/event/${ev.slug}`}
                                        className={`truncate rounded-md px-1.5 py-1 font-body text-[11px] font-semibold leading-tight transition hover:brightness-95 ${style.bg} ${style.text} ${expired ? "grayscale opacity-60 line-through" : ""}`}
                                        title={expired ? `${ev.title} — Sudah Expired` : ev.title}
                                      >
                                        {ev.title}
                                      </Link>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="daftar"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h2 className="font-display text-2xl font-bold text-marica-ink">
                      Semua jadwal
                    </h2>
                    <div className="mt-5 flex flex-col gap-3">
                      {isLoading ? (
                        <p className="py-10 text-center font-body text-sm text-marica-ink-soft">
                          Memuat event...
                        </p>
                      ) : filteredEvents.length > 0 ? (
                        filteredEvents
                          .slice()
                          .sort((a, b) => a.date.localeCompare(b.date))
                          .map((ev, i) => (
                            <EventCard key={ev.slug} event={ev} index={i} />
                          ))
                      ) : (
                        <EmptyState />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Sidebar */}
            <motion.aside
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
            >
              <h3 className="font-display text-xl font-bold text-marica-ink">
                Jadwal bulan ini
              </h3>
              <p className="mt-1 font-body text-sm text-marica-ink-soft">
                {eventsThisMonth.length} kegiatan tersedia
              </p>

              <div className="mt-4 flex flex-col gap-4">
                {eventsThisMonth
                  .slice()
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((ev, i) => (
                    <EventCard key={ev.slug} event={ev} index={i} />
                  ))}
                {eventsThisMonth.length === 0 && <EmptyState />}
              </div>
            </motion.aside>
          </div>

          {/* Info footer strip */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-10 flex items-start gap-4 rounded-2xl bg-marica-rose/25 p-6"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-marica-amber-dark text-white">
              <Info className="h-4 w-4" />
            </span>
            <div>
              <p className="font-display text-base font-bold text-marica-ink">
                Pilih jadwal yang sesuai
              </p>
              <p className="mt-1 font-body text-sm text-marica-ink-soft">
                Pendaftaran dibuka hingga H-1 acara. Kuota terbatas untuk
                menjaga kualitas interaksi.
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 px-6 py-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-marica-cream text-marica-amber-dark">
        {icon}
      </span>
      <div>
        <p className="font-body text-sm text-marica-ink-soft">{label}</p>
        <motion.p
          key={value}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="font-display text-2xl font-bold text-marica-ink"
        >
          {value}
        </motion.p>
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 font-body text-sm font-semibold transition ${
        active
          ? "bg-marica-amber-dark text-white shadow-sm"
          : "bg-marica-cream text-marica-ink-soft hover:text-marica-ink"
      }`}
    >
      {children}
    </button>
  );
}

function ViewToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-body text-sm font-semibold text-marica-ink-soft transition"
    >
      {active && (
        <motion.span
          layoutId="view-toggle-pill"
          className="absolute inset-0 -z-10 rounded-full bg-white shadow-sm"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
      <span className={active ? "text-marica-ink" : ""}>{icon}</span>
      <span className={active ? "text-marica-ink" : ""}>{label}</span>
    </button>
  );
}

function EventCard({ event, index }: { event: EventItem; index: number }) {
  const style = CATEGORY_STYLE[event.category];
  const expired = isEventExpired(event.date);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
      whileHover={expired ? undefined : { y: -3 }}
      className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-shadow ${expired ? "border-marica-rose-deep/20 bg-marica-ink/5 grayscale-[0.25]" : "border-marica-ink/10 bg-white hover:shadow-md"}`}
    >
      {expired && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8, rotate: -4 }}
          animate={{ opacity: [0.75, 1, 0.75], scale: [0.98, 1.03, 0.98] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-3 top-3 rounded-full border border-marica-rose-deep/20 bg-marica-rose-deep/10 px-2.5 py-1 font-body text-[10px] font-bold uppercase tracking-wide text-marica-rose-deep"
        >
          Sudah Expired
        </motion.span>
      )}
      <span
        className={`inline-block rounded-full px-3 py-1 font-body text-xs font-semibold ${style.bg} ${style.text} ${expired ? "mr-28" : ""}`}
      >
        {CATEGORY_LABEL[event.category]}
      </span>

      <h4 className="mt-3 font-display text-base font-bold text-marica-ink">
        {event.title}
      </h4>

      <div className="mt-2 flex flex-col gap-1.5 font-body text-sm text-marica-ink-soft">
        <span className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 shrink-0" />
          {formatLongDateID(event.date)}
        </span>
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0" />
          {event.timeStart} - {event.timeEnd} WIB
        </span>
      </div>

      <Link
        href={`/event/${event.slug}`}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full border border-marica-amber-dark px-4 py-2 font-body text-sm font-semibold text-marica-amber-dark transition hover:bg-marica-amber-dark hover:text-white"
      >
        Lihat Detail
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-marica-ink/15 px-6 py-10 text-center">
      <p className="font-body text-sm text-marica-ink-soft">
        Belum ada jadwal yang cocok dengan pencarian atau filter kamu.
      </p>
    </div>
  );
}
