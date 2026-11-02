import HeroView from "./HeroView";
import { landingHero, landingStatistics } from "@/lib/landing-content";

const hero = {
  id: "static-hero",
  headline: "Temukan Buku dan Produk Seru untuk Si Kecil",
  subheadline:
    "Belanja buku anak, mainan edukatif, Edu-Kit, printable, dan berbagai produk pilihan Marica untuk menemani bermain dan belajar di rumah.",
  imageUrl: "/images/hero-character.webp",
  ctaText: "Belanja Sekarang",
  ctaLink: "/belanja",
  badges: [],
};

const stats = [
  { id: "families", label: "Keluarga", value: "5000+", icon: "users", order: 1 },
  { id: "rating", label: "Rating Review", value: "4.9/5", icon: "star", order: 2 },
  { id: "activities", label: "Aktivitas", value: "100+", icon: "box", order: 3 },
];

export default function Hero() {
  return <HeroView hero={hero} stats={stats} />;
}
