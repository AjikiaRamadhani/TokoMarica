import type { Metadata } from "next";
import type { ReactNode } from "react";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.marica.id";

export const metadata: Metadata = {
  title: "Artikel Edukasi dan Parenting",
  description:
    "Baca artikel edukasi anak, tips parenting, aktivitas belajar sambil bermain, dan inspirasi keluarga dari Marica.",
  alternates: {
    canonical: `${siteUrl}/artikel`,
  },
  openGraph: {
    type: "website",
    url: `${siteUrl}/artikel`,
    title: "Artikel Edukasi dan Parenting | Marica",
    description:
      "Baca artikel edukasi anak, tips parenting, aktivitas belajar sambil bermain, dan inspirasi keluarga dari Marica.",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Artikel edukasi dan parenting Marica",
      },
    ],
  },
};

export default function ArtikelLayout({ children }: { children: ReactNode }) {
  return children;
}
