import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/poppins/300.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";

import "./globals.css";
import FontProvider from "./components/FontProvider";
import Providers from "./components/Providers";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.marica.id";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "Toko Marica - Buku, Mainan, dan Produk Edukatif Anak",
    template: "%s | Marica",
  },

  description:
    "Toko Marica menyediakan buku anak, mainan edukatif, Edu-Kit, printable, dan produk pilihan untuk menemani tumbuh kembang anak.",

  keywords: [
    "Marica",
    "toko mainan edukatif",
    "buku anak",
    "buku edukatif anak",
    "produk edukatif anak",
    "mainan anak",
    "belajar sambil bermain",
    "playpass anak",
    "edu-kit",
    "workshop anak",
    "phygital learning",
  ],

  authors: [
    {
      name: "PT Sebangku Jaya Abadi",
    },
  ],

  openGraph: {
    type: "website",
    locale: "id_ID",
    url: siteUrl,
    siteName: "Marica",

    title: "Toko Marica - Buku, Mainan, dan Produk Edukatif Anak",

    description:
      "Belanja buku anak, mainan edukatif, Edu-Kit, printable, dan produk pilihan Marica.",

    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Marica - Belajar Ceria Bersama Si Kecil",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title: "Toko Marica - Buku, Mainan, dan Produk Edukatif Anak",

    description:
      "Belanja buku anak, mainan edukatif, Edu-Kit, printable, dan produk pilihan Marica.",

    images: ["/images/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
  },
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html
      lang="id"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col font-body">
        <FontProvider>
          <Providers>{children}</Providers>
        </FontProvider>
      </body>
    </html>
  );
}
