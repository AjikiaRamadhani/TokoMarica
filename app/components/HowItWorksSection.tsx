"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Compass, Gift, Wand2 } from "lucide-react";

const defaultSteps = [
  {
    key: "pilih-aktivitas",
    step: "LANGKAH 1",
    title: "Pilih Aktivitas Favorit",
    subtitle: "Jelajahi Pilihan Bermain & Belajar",
    description:
      "Pilih pengalaman yang cocok untuk Si Kecil melalui situs web kami—mulai dari main di area Playpass, ikutan Workshop akhir pekan, atau berlangganan Edu-Kit bulanan untuk di rumah.",
    icon: Compass,
    iconBg: "bg-marica-amber/20",
    iconText: "text-marica-amber-text",
    labelText: "text-marica-amber-text",
    image: "/images/how-it-works-step-1.jpg",
    imageAlt: "Memilih aktivitas favorit",
  },
  {
    key: "terima-kit",
    step: "LANGKAH 2",
    title: "Datang Langsung atau Terima di Rumah",
    subtitle: "Fleksibel Sesuai Kebutuhan Bunda",
    description:
      "Datang langsung ke toko fisik Marica Experience Store untuk seru-seruan bersama, atau cukup duduk manis di rumah menunggu paket Edu-Kit dikirim langsung ke depan pintu.",
    icon: Gift,
    iconBg: "bg-[#e0507a]/15",
    iconText: "text-[#e0507a]",
    labelText: "text-[#e0507a]",
    image: "/images/how-it-works-step-2.jpg",
    imageAlt: "Datang langsung atau terima di rumah",
  },
  {
    key: "nikmati-momen",
    step: "LANGKAH 3",
    title: "Nikmati Momen Belajar Ceria",
    subtitle: "Lihat Si Kecil Tumbuh Makin Kreatif & Cerdas",
    description:
      "Nikmati momen quality time yang hangat, bebas pusing, dan penuh tawa saat melihat anak aktif mengeksplorasi imajinasi serta logikanya lewat cara yang menyenangkan.",
    icon: Wand2,
    iconBg: "bg-marica-blue/20",
    iconText: "text-[#1f5f83]",
    labelText: "text-[#1f5f83]",
    image: "/images/how-it-works-step-3.jpg",
    imageAlt: "Momen belajar ceria",
  },
];

export default function HowItWorksSection() {
  const steps = defaultSteps;

  return (
    <section id="cara-kerja" className="section-peach-bg relative overflow-hidden px-6 py-20 lg:px-10 lg:py-28">
      {/* decorative glow blobs, consistent with the rest of the page */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-14 top-10 h-56 w-56 rounded-full bg-marica-amber/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 bottom-0 h-64 w-64 rounded-full bg-marica-blue/10 blur-3xl"
      />

      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5 }}
          className="font-display text-[1.7rem] font-bold leading-tight text-marica-ink sm:text-3xl lg:text-[2.2rem]"
        >
          Bagaimana Marica Membantu?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mt-3 max-w-xl font-body text-sm leading-relaxed text-marica-ink-soft sm:text-base"
        >
          Tiga langkah sederhana untuk memulai pengalaman belajar yang
          menyenangkan dan interaktif bersama Marica. Kami hadir untuk
          membuat edukasi lebih ceria.
        </motion.p>
      </div>

      {/* ===== Mobile: vertical timeline ===== */}
      <div className="relative z-10 mx-auto mt-14 max-w-md sm:hidden">
        {/* dashed vertical connecting line running behind the icon column */}
        <motion.div
          aria-hidden
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 1.1, ease: "easeInOut", delay: 0.2 }}
          style={{ originY: 0 }}
          className="absolute left-[27px] top-8 bottom-8 w-0 border-l-2 border-dashed border-marica-ink/20"
        />

        <div className="flex flex-col gap-10">
          {steps.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.55, delay: i * 0.15, ease: "easeOut" }}
                className="relative flex gap-4"
              >
                {/* icon badge, sits on top of the connecting line */}
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{
                    type: "spring",
                    stiffness: 320,
                    damping: 16,
                    delay: i * 0.15 + 0.1,
                  }}
                  className={`relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${item.iconBg} ring-4 ring-white`}
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{
                      duration: 2.4,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.4,
                    }}
                  >
                    <Icon className={`h-6 w-6 ${item.iconText}`} strokeWidth={2} />
                  </motion.div>
                </motion.div>

                {/* content card */}
                <motion.div
                  whileHover={{ y: -4 }}
                  className="flex-1 rounded-[24px] bg-white p-5 shadow-[0_18px_40px_rgba(120,60,10,0.15)] transition-shadow hover:shadow-[0_24px_50px_rgba(120,60,10,0.22)]"
                >
                  <motion.span
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.4, delay: i * 0.15 + 0.25 }}
                    className={`font-display text-xs font-bold uppercase tracking-wider ${item.labelText}`}
                  >
                    {item.step}
                  </motion.span>

                  <h3 className="mt-1 font-display text-base font-bold leading-snug text-marica-ink">
                    {item.title}
                  </h3>
                  {item.subtitle && (
                    <p className="mt-0.5 font-display text-sm font-semibold text-marica-amber-dark">
                      {item.subtitle}
                    </p>
                  )}

                  <p className="mt-2 font-body text-sm leading-relaxed text-marica-ink-soft">
                    {item.description}
                  </p>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.5, delay: i * 0.15 + 0.3, ease: "easeOut" }}
                    whileHover={{ scale: 1.04 }}
                    className="relative mt-4 w-full overflow-hidden rounded-2xl"
                  >
                    <Image
                      src={item.image}
                      alt={item.imageAlt}
                      width={420}
                      height={260}
                      className="h-36 w-full object-cover"
                    />
                  </motion.div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ===== Tablet & up: original grid with horizontal connecting line ===== */}
      <div className="relative z-10 mx-auto mt-14 hidden max-w-6xl sm:block lg:mt-16">
        {/* connecting line drawn across the three steps on desktop */}
        <motion.div
          aria-hidden
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1, ease: "easeInOut", delay: 0.3 }}
          style={{ originX: 0 }}
          className="absolute left-[16.5%] right-[16.5%] top-[68px] hidden h-0.5 bg-marica-ink/15 lg:block"
        />

        <div className="grid items-stretch gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {steps.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3, margin: "0px 0px -60px 0px" }}
                transition={{ duration: 0.6, delay: i * 0.15, ease: "easeOut" }}
                whileHover={{ y: -6 }}
                className={`relative flex h-full flex-col items-center rounded-[28px] bg-white p-6 text-center shadow-[0_18px_40px_rgba(120,60,10,0.15)] transition-shadow hover:shadow-[0_24px_50px_rgba(120,60,10,0.22)] sm:p-7 ${
                  i === 2 ? "sm:col-span-2 sm:mx-auto sm:w-[calc(50%-1rem)] lg:col-span-1 lg:mx-0 lg:w-auto" : ""
                }`}
              >
                {/* icon badge */}
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{
                    type: "spring",
                    stiffness: 320,
                    damping: 16,
                    delay: i * 0.15 + 0.15,
                  }}
                  className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full ${item.iconBg}`}
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{
                      duration: 2.4,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.4,
                    }}
                  >
                    <Icon className={`h-7 w-7 ${item.iconText}`} strokeWidth={2} />
                  </motion.div>
                </motion.div>

                <motion.span
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.4, delay: i * 0.15 + 0.25 }}
                  className={`mt-4 font-display text-xs font-bold uppercase tracking-wider ${item.labelText}`}
                >
                  {item.step}
                </motion.span>

                <h3 className="mt-1.5 font-display text-lg font-bold leading-snug text-marica-ink sm:text-xl">
                  {item.title}
                </h3>
                {item.subtitle && (
                  <p className="mt-1 font-display text-sm font-semibold text-marica-amber-dark sm:text-base">
                    {item.subtitle}
                  </p>
                )}

                <p className="mt-2.5 font-body text-sm leading-relaxed text-marica-ink-soft">
                  {item.description}
                </p>

                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: i * 0.15 + 0.3, ease: "easeOut" }}
                  whileHover={{ scale: 1.04 }}
                  className="relative mt-auto w-full overflow-hidden rounded-2xl pt-5"
                >
                  <Image
                    src={item.image}
                    alt={item.imageAlt}
                    width={420}
                    height={260}
                    className="aspect-[420/260] h-auto w-full object-cover"
                  />
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
