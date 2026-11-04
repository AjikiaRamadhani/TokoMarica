"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, useAnimationControls, type PanInfo } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

type Testimonial = {
  id: string;
  customerName: string;
  role: string | null;
  avatarUrl: string | null;
  message: string;
  order: number;
};

const testimonials: Testimonial[] = [
  {
    id: "sarah",
    customerName: "Bunda Sarah Melati",
    role: "Ibu Rumah Tangga & Ibu dari 2 Anak",
    avatarUrl: null,
    message:
      "Akhirnya ketemu tempat main yang bikin anak betah berjam-jam tanpa perlu main HP! Tempatnya bersih, pilihan board game-nya banyak banget, dan stafnya telaten ngajarin cara mainnya. Jadi punya tempat quality time favorit baru bareng anak di akhir pekan.",
    order: 1,
  },
  {
    id: "anita",
    customerName: "Bunda Anita Rahma, S.T.",
    role: "Ibu Bekerja & Penggemar Edukasi Anak",
    avatarUrl: null,
    message:
      "Workshop sains dan kriya mingguan di Marica selalu bikin si kecil antusias! Materi belajar yang biasanya membosankan di sekolah, di sini malah disajikan seru banget lewat praktik langsung. Sepulang dari workshop, anaknya makin kritis dan kreatif.",
    order: 2,
  },
  {
    id: "citra",
    customerName: "Bunda Citra Kirana",
    role: "Ibu Bekerja & Pelanggan Edu-Kit Bulanan",
    avatarUrl: null,
    message:
      "Jujur sebagai working mom, saya sering kehabisan waktu dan ide buat ngerancang permainan edukatif di rumah. Berlangganan Edu-Kit Marica bener-bener menyelamatkan! Tiap bulan tinggal tunggu paket datang, semua bahan & panduannya sudah lengkap dan siap pakai.",
    order: 3,
  },
  {
    id: "maya",
    customerName: "Bunda Maya Indah",
    role: "Content Creator & Pegiat Parenting",
    avatarUrl: null,
    message:
      "Koleksi buku cerita dan edugame dari Marica desainnya bagus-bagus banget dan alur permainannya edukatif. Anak saya jadi lebih cepat paham konsep logika sederhana lewat cara yang menyenangkan. Recommended banget buat koleksi di rumah!",
    order: 4,
  },
  {
    id: "ratna",
    customerName: "Ibu Ratna Dewi, S.Pd.",
    role: "Kepala Sekolah & Pendidik PAUD/TK",
    avatarUrl: null,
    message:
      "Siswa-siswi kami sangat antusias saat ikutan acara kunjungan dan pelatihan media ajar edugame dari Marica. Konsep belajar sambil bermainnya sangat pas untuk membantu anak-anak memahami materi dengan lebih cepat dan ceria!",
    order: 5,
  },
];

const testimonialImages = [
  "/images/testimoni1.webp",
  "/images/testimoni2.webp",
  "/images/testimoni3.webp",
  "/images/testimoni4.webp",
  "/images/testimoni5.webp",
  "/images/testimoni22.webp",
];

const AUTOPLAY_INTERVAL = 4500;

export default function TestimonialSection() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();

  const [index, setIndex] = useState(0);
  const [cardStep, setCardStep] = useState(0);
  const [maxIndex, setMaxIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Measure card width + gap responsively
  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      const viewport = viewportRef.current;
      if (!track || !viewport) return;
      const firstCard = track.children[0] as HTMLElement | undefined;
      if (!firstCard) return;

      const trackStyle = getComputedStyle(track);
      const gap = parseFloat(trackStyle.columnGap || trackStyle.gap || "0");
      const step = firstCard.offsetWidth + gap;
      setCardStep(step);

      const visibleCount = Math.max(1, Math.floor(viewport.offsetWidth / step));
      setMaxIndex(Math.max(0, testimonials.length - visibleCount));
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [testimonials]);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0), maxIndex);
      setIndex(clamped);
    },
    [maxIndex]
  );

  useEffect(() => {
    controls.start({
      x: -index * cardStep,
      transition: { type: "spring", stiffness: 320, damping: 34 },
    });
  }, [index, cardStep, controls]);

  // Autoplay
  useEffect(() => {
    if (isPaused || maxIndex === 0) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, AUTOPLAY_INTERVAL);
    return () => clearInterval(id);
  }, [isPaused, maxIndex]);

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const { offset, velocity } = info;
    if (offset.x < -60 || velocity.x < -400) {
      goTo(index + 1);
    } else if (offset.x > 60 || velocity.x > 400) {
      goTo(index - 1);
    } else {
      controls.start({
        x: -index * cardStep,
        transition: { type: "spring", stiffness: 320, damping: 34 },
      });
    }
  };

  return (
    <section
      id="testimoni"
      className="section-cream-bg relative overflow-hidden px-6 py-20 lg:px-10 lg:py-28"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-marica-amber/15 blur-3xl"
      />

      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5 }}
          className="font-display text-[1.7rem] font-bold leading-tight text-marica-ink sm:text-3xl lg:text-[2.2rem]"
        >
          Apa Kata Orang Tua?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mt-3 max-w-md font-body text-sm leading-relaxed text-marica-ink-soft sm:text-base"
        >
          Cerita nyata dari para orang tua yang sudah tumbuh bersama Marica.
        </motion.p>
      </div>

      <>
        {/* Carousel */}
        <div className="relative z-10 mx-auto mt-12 max-w-6xl lg:mt-16">
            <div ref={viewportRef} className="overflow-hidden">
              <motion.div
                ref={trackRef}
                className="flex cursor-grab gap-5 active:cursor-grabbing"
                drag="x"
                dragConstraints={{ left: -maxIndex * cardStep, right: 0 }}
                dragElastic={0.12}
                animate={controls}
                onDragEnd={handleDragEnd}
              >
                {testimonials.map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
                    whileHover={{ y: -6, scale: 1.02 }}
                    className="relative w-[78%] shrink-0 select-none overflow-hidden rounded-3xl bg-white p-6 shadow-[0_14px_35px_rgba(120,60,10,0.14)] transition-shadow hover:shadow-[0_20px_45px_rgba(120,60,10,0.22)] sm:w-[46%] lg:w-[24%]"
                  >
                    <Quote
                      className="pointer-events-none absolute -right-2 -top-2 h-16 w-16 text-marica-amber/25"
                      fill="currentColor"
                    />

                    <div className="relative flex items-center gap-3">
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full ring-4 ring-white">
                        <Image
                          src={testimonialImages[i % testimonialImages.length]}
                          alt={t.customerName}
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      </div>
                      <div className="leading-tight">
                        <p className="font-display text-[15px] font-semibold text-marica-ink">
                          {t.customerName}
                        </p>
                        {t.role && (
                          <p className="font-body text-xs text-marica-ink-soft">{t.role}</p>
                        )}
                      </div>
                    </div>

                    <div className="relative mt-4 flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, si) => (
                        <motion.span
                          key={si}
                          initial={{ opacity: 0, scale: 0.4 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true, amount: 0.6 }}
                          transition={{ duration: 0.3, delay: i * 0.1 + 0.2 + si * 0.06 }}
                        >
                          <Star className="h-4 w-4 text-marica-amber-dark" fill="currentColor" />
                        </motion.span>
                      ))}
                    </div>

                    <p className="relative mt-4 font-body text-sm italic leading-relaxed text-marica-ink-soft">
                      &quot;{t.message}&quot;
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Arrows */}
            <button
              type="button"
              aria-label="Testimoni sebelumnya"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              className="absolute left-0 top-1/2 hidden -translate-x-4 -translate-y-1/2 items-center justify-center rounded-full bg-white p-2.5 text-marica-ink shadow-lg transition hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 lg:flex"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Testimoni berikutnya"
              onClick={() => goTo(index + 1)}
              disabled={index >= maxIndex}
              className="absolute right-0 top-1/2 hidden translate-x-4 -translate-y-1/2 items-center justify-center rounded-full bg-white p-2.5 text-marica-ink shadow-lg transition hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 lg:flex"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Dots */}
          <div className="relative z-10 mt-6 flex items-center justify-center gap-2">
            {Array.from({ length: maxIndex + 1 }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ke slide ${i + 1}`}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === i ? "w-6 bg-marica-ink" : "w-2 bg-marica-ink/30"
                }`}
              />
            ))}
          </div>
      </>
    </section>
  );
}