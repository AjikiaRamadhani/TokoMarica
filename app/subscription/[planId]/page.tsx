"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Loader2,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
type CityResult = {
  id: string;
  city: string;
  province: string;
  postalCode: string;
  regency?: string;
  regencyId?: string;
};

type SubscriptionPlan = {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: "MONTHLY" | "QUARTERLY";
};
type ChildProfile = { id: string; name: string; isActive: boolean };

type ShippingForm = {
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingDistrict: string;
  shippingProvince: string;
  shippingPostalCode: string;
};

const gallery = [
  { src: "/images/subcribe.png", alt: "Keluarga bermain dengan Edu-Kit" },
  { src: "/images/benefit1.png", alt: "Aktivitas belajar bersama" },
  { src: "/images/benefit2.png", alt: "Permainan edukatif anak" },
  { src: "/images/benefit3.png", alt: "Isi paket Edu-Kit" },
  { src: "/images/benefit4.png", alt: "Aktivitas kelompok anak" },
];

const curriculum = [
  ["Bulan 1", "Misteri Hutan Hijau & Ekosistem", "Biologi dan sains"],
  ["Bulan 2", "Mobil Tenaga Udara & Aerodinamika", "Engineering"],
  ["Bulan 3", "Misi Galaksi & Lampu Proyektor Bintang", "Astronomi"],
  ["Bulan 4", "Laboratorium Warna & Kristal Ajaib", "Kimia ramah anak"],
  ["Bulan 5", "Arsitektur Kuno & Simetri Geometri", "Matematika"],
  ["Bulan 6", "Peta Kode Logika & Robot Kumbang Kayu", "Unplugged coding"],
];

const emptyForm: ShippingForm = {
  shippingName: "",
  shippingPhone: "",
  shippingAddress: "",
  shippingCity: "",
  shippingDistrict: "",
  shippingProvince: "",
  shippingPostalCode: "",
};

const formatRupiah = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

export default function SubscriptionDetailPage() {
  const params = useParams<{ planId: string }>();
  const router = useRouter();
  const planId = Array.isArray(params.planId) ? params.planId[0] : params.planId;
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedImage, setSelectedImage] = useState(gallery[0]);
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [childProfileId, setChildProfileId] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityResult | null>(null);
  const [districtQuery, setDistrictQuery] = useState("");
  const [districtResults, setDistrictResults] = useState<CityResult[]>([]);
  const [districtLoading, setDistrictLoading] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<CityResult | null>(null);

  useEffect(() => {
    const query = cityQuery.trim();
    if (selectedCity && selectedCity.city === query) return;
    if (query.length < 3) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setCityLoading(true);
      fetch(`/api/locations/cities?search=${encodeURIComponent(query)}`, {
        cache: "no-store",
      })
        .then(async (response) => {
          const data = await response.json().catch(() => null);
          if (!response.ok) throw new Error(data?.error ?? "Gagal mencari kota");
          return data;
        })
        .then((data) => {
          if (cancelled) return;
          setCityResults(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (!cancelled) setCityResults([]);
        })
        .finally(() => {
          if (!cancelled) setCityLoading(false);
        });
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cityQuery, selectedCity]);

  useEffect(() => {
    const query = districtQuery.trim();
    if (!selectedCity?.regencyId || query.length < 3) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDistrictResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setDistrictLoading(true);
      fetch(`/api/locations/cities?search=${encodeURIComponent(query)}&regencyId=${encodeURIComponent(selectedCity.regencyId!)}&regencyName=${encodeURIComponent(selectedCity.city)}`, { cache: "no-store" })
        .then(async (response) => {
          const data = await response.json().catch(() => null);
          if (!response.ok) throw new Error(data?.error ?? "Gagal mencari kecamatan");
          return data;
        })
        .then((data) => { if (!cancelled) setDistrictResults(Array.isArray(data) ? data : []); })
        .catch(() => { if (!cancelled) setDistrictResults([]); })
        .finally(() => { if (!cancelled) setDistrictLoading(false); });
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [districtQuery, selectedCity]);

  useEffect(() => {
    if (!planId) return;
    fetch("/api/subscriptions/plans", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error ?? "Paket gagal dimuat");
        return data as SubscriptionPlan[];
      })
      .then((plans) => {
        const matchingPlan = plans.find((item) => item.id === planId);
        if (!matchingPlan) throw new Error("Paket subscription tidak ditemukan");
        setPlan(matchingPlan);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Paket gagal dimuat");
      })
      .finally(() => setIsLoading(false));
    fetch("/api/children", { cache: "no-store" }).then(async (response) => response.ok ? response.json() : []).then((data) => setChildren(Array.isArray(data) ? data.filter((child) => child.isActive) : [])).catch(() => setChildren([]));
  }, [planId]);

  const submitSubscription = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!plan) return;
    if (!/^[0-9]{8,15}$/.test(form.shippingPhone)) {
      setError("Nomor WhatsApp harus berupa angka 8-15 digit.");
      return;
    }
    if (!/^[0-9]{5}$/.test(form.shippingPostalCode)) {
      setError("Kode pos harus berupa 5 digit angka.");
      return;
    }
    if (!selectedCity || !selectedDistrict) {
      setError("Pilih kota dan kecamatan dari hasil pencarian terlebih dahulu.");
      return;
    }
    if (form.shippingAddress.trim().length < 10) {
      setError("Alamat harus diisi dengan lengkap.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          childProfileId: childProfileId || undefined,
          ...form,
          shippingAddress: `${form.shippingAddress.trim()}, Kecamatan ${form.shippingDistrict}`,
        }),
      });
      const data = await response.json().catch(() => null);
      if (response.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent(`/subscription/${plan.id}`)}`);
        return;
      }
      if (!response.ok) throw new Error(data?.error ?? "Subscription gagal dibuat");
      if (data?.redirectUrl) {
        window.location.assign(data.redirectUrl);
        return;
      }
      router.push("/profil");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Subscription gagal dibuat");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fff9f3] text-marica-ink">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-marica-ink-soft">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat detail paket...
        </div>
      </div>
    );
  }

  if (!plan || error) {
    return (
      <div className="min-h-screen bg-[#fff9f3] text-marica-ink">
        <Navbar />
        <div className="mx-auto max-w-xl px-5 py-24 text-center">
          <h1 className="font-display text-3xl font-bold">Paket tidak tersedia</h1>
          <p className="mt-3 text-sm text-marica-ink-soft">{error}</p>
          <Link href="/subscription" className="mt-6 inline-flex rounded-full bg-marica-amber-dark px-5 py-3 text-sm font-bold text-white">
            Kembali ke Subscription
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const periodLabel = plan.interval === "MONTHLY" ? "bulan" : "3 bulan";

  return (
    <div className="min-h-screen bg-[#fff9f3] text-marica-ink">
      <Navbar />
      <main>
        <div className="mx-auto max-w-7xl px-5 pb-5 pt-6 sm:px-8 lg:px-10">
          <Link href="/subscription" className="inline-flex items-center gap-2 text-xs font-semibold text-marica-ink-soft hover:text-marica-amber-dark">
            <ArrowLeft className="h-4 w-4" /> Semua paket subscription
          </Link>
        </div>

        <section className="mx-auto grid max-w-7xl gap-6 px-5 pb-14 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:px-10">
          <div className="rounded-[1.75rem] border border-marica-ink/10 bg-white p-4 shadow-[0_12px_35px_rgba(120,60,10,0.08)] sm:p-6">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-marica-cream">
              <Image src={selectedImage.src} alt={selectedImage.alt} fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 58vw" />
              <span className="absolute left-4 top-4 rounded-full bg-marica-amber-dark px-3 py-1 text-[11px] font-bold text-white">
                Eksklusif Marica
              </span>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {gallery.map((image) => (
                <button key={image.src} type="button" onClick={() => setSelectedImage(image)} className={`relative aspect-square overflow-hidden rounded-xl border-2 ${selectedImage.src === image.src ? "border-marica-amber-dark" : "border-transparent"}`}>
                  <Image src={image.src} alt={image.alt} fill className="object-cover" sizes="120px" />
                </button>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-marica-cream/70 px-4 py-3 text-xs text-marica-ink-soft">
              <span><ShieldCheck className="mr-1.5 inline h-4 w-4 text-marica-green" />Aman, terkurasi, dan non-toxic</span>
              <span className="font-bold text-marica-green">100% Halal &amp; aman</span>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-marica-ink/10 bg-white p-6 shadow-[0_12px_35px_rgba(120,60,10,0.08)] sm:p-8">
            <div className="flex flex-wrap gap-2 text-[11px] font-bold">
              <span className="rounded-full bg-marica-amber/20 px-3 py-1 text-marica-amber-dark">Langganan {plan.interval === "MONTHLY" ? "bulanan" : "triwulan"}</span>
              <span className="rounded-full bg-marica-green/10 px-3 py-1 text-marica-green">Usia 4–8 tahun</span>
              <span className="rounded-full bg-marica-sky-light px-3 py-1 text-marica-blue">TK–SD awal</span>
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold">{plan.name}</h1>
            <p className="mt-3 text-sm leading-6 text-marica-ink-soft">{plan.description} Aktivitas disusun untuk membuat waktu bermain di rumah lebih bermakna.</p>
            <div className="mt-5 rounded-2xl border border-marica-amber/30 bg-[#fff5e9] p-5">
              <p className="text-3xl font-bold text-marica-amber-text">{formatRupiah(plan.price)} <span className="text-sm font-normal text-marica-ink-soft">/ {periodLabel}</span></p>
              <p className="mt-2 text-xs text-marica-ink-soft">Tagihan berulang sesuai periode paket. Kamu dapat mengelola subscription dari profil.</p>
            </div>
            <h2 className="mt-6 font-display text-lg font-bold">Manfaat utama untuk buah hati</h2>
            <ul className="mt-3 space-y-3 text-sm leading-5 text-marica-ink-soft">
              {["Bahan non-toxic dan aman digunakan saat bermain", "Melatih fokus, logika, kreativitas, dan koordinasi", "Screen-free bonding untuk waktu berkualitas bersama keluarga"].map((item) => (
                <li key={item}><CheckCircle2 className="mr-2 inline h-4 w-4 text-marica-green" />{item}</li>
              ))}
            </ul>
            <div className="mt-6 rounded-2xl border border-marica-ink/10 bg-[#fffaf5] p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display font-bold">Kelengkapan dalam Edu-Kit</h2>
                <PackageCheck className="h-5 w-5 text-marica-amber-dark" />
              </div>
              <ul className="mt-3 space-y-2 text-xs text-marica-ink-soft">
                {["Proyek aktivitas bertema dan bahan craft", "Mini educational game dan panduan bermain", "Buku aktivitas dan bonus digital printable"].map((item) => (
                  <li key={item}><Check className="mr-2 inline h-4 w-4 text-marica-green" />{item}</li>
                ))}
              </ul>
            </div>
            <div className="mt-4 flex gap-3 rounded-2xl bg-marica-cream/80 p-4 text-xs leading-5 text-marica-ink-soft">
              <Truck className="mt-0.5 h-5 w-5 shrink-0 text-marica-amber-dark" />
              <span><strong className="text-marica-ink">Pengiriman rutin otomatis.</strong> Paket dikirim pada awal periode berikutnya ke alamat yang kamu masukkan.</span>
            </div>
          </div>
        </section>

        <section className="border-y border-marica-ink/10 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-marica-amber-dark">Detail program &amp; transparansi</p>
            <h2 className="mt-2 font-display text-3xl font-bold">Eksplorasi kurikulum 6 bulan</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-marica-ink-soft">Setiap periode membawa tema baru agar anak terus punya ruang untuk bereksperimen dan menemukan hal yang disukai.</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {curriculum.map(([month, title, skill]) => (
                <article key={month} className="rounded-2xl border border-marica-ink/10 bg-[#fffaf5] p-5">
                  <span className="rounded-full bg-marica-amber/20 px-3 py-1 text-[11px] font-bold text-marica-amber-dark">{month}</span>
                  <h3 className="mt-4 font-display font-bold">{title}</h3>
                  <p className="mt-2 text-xs text-marica-ink-soft">{skill}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-14 sm:px-8">
          <div className="rounded-[1.75rem] bg-white p-6 shadow-[0_12px_35px_rgba(120,60,10,0.08)] sm:p-8">
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 h-6 w-6 shrink-0 text-marica-amber-dark" />
              <div>
                <h2 className="font-display text-2xl font-bold">Mulai berlangganan</h2>
                <p className="mt-2 text-sm text-marica-ink-soft">Isi alamat pengiriman. Setelah itu kamu akan diarahkan ke pembayaran aman Midtrans.</p>
              </div>
            </div>
            <form onSubmit={submitSubscription} className="mt-7 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold sm:col-span-2">Profil anak <span className="font-normal text-marica-ink-soft">(opsional)</span><select value={childProfileId} onChange={(event) => setChildProfileId(event.target.value)} className="mt-2 w-full rounded-xl border border-marica-ink/15 bg-white px-4 py-3 text-sm font-normal"><option value="">Pilih nanti</option>{children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select><span className="mt-1 block text-xs font-normal text-marica-ink-soft">Profil anak dipakai untuk personalisasi Edu-Kit.</span></label>
              {([
                ["shippingName", "Nama penerima", "Budi atau nama orang tua"],
                ["shippingPhone", "Nomor WhatsApp", "08xxxxxxxxxx"],
                ["shippingCity", "Kota / Kabupaten", "Sukoharjo"],
                ["shippingDistrict", "Kecamatan", "Bulu"],
                ["shippingProvince", "Provinsi", "DKI Jakarta"],
                ["shippingPostalCode", "Kode pos", "12345"],
              ] as const).map(([name, label, placeholder]) => (
                <label key={name} className="text-sm font-semibold">
                  {label}
                  {name === "shippingCity" || name === "shippingDistrict" ? (
                    <div className="relative">
                      <input
                        required
                        value={name === "shippingCity" ? cityQuery : districtQuery}
                        disabled={name === "shippingDistrict" && !selectedCity}
                        onChange={(event) => {
                          if (name === "shippingCity") {
                            setCityQuery(event.target.value);
                            setSelectedCity(null);
                            setSelectedDistrict(null);
                            setDistrictQuery("");
                          } else {
                            setDistrictQuery(event.target.value);
                            setSelectedDistrict(null);
                          }
                          setForm((current) => ({
                            ...current,
                            [name]: event.target.value,
                            ...(name === "shippingCity" ? { shippingProvince: "", shippingDistrict: "" } : {}),
                          }));
                        }}
                        placeholder={placeholder}
                        autoComplete="off"
                        className="mt-2 w-full rounded-xl border border-marica-ink/15 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-marica-amber-dark focus:ring-2 focus:ring-marica-amber/20"
                      />
                      {((name === "shippingCity" ? cityQuery : districtQuery).trim().length >= 3) &&
                        (name === "shippingCity" ? !selectedCity : !selectedDistrict) && (
                        <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-marica-ink/10 bg-white shadow-lg">
                          {(name === "shippingCity" ? cityLoading : districtLoading) && <p className="px-4 py-3 text-xs font-normal text-marica-ink-soft">Mencari {name === "shippingCity" ? "kota" : "kecamatan"}...</p>}
                          {!cityLoading && !districtLoading && (name === "shippingCity" ? cityResults : districtResults).length === 0 && <p className="px-4 py-3 text-xs font-normal text-marica-ink-soft">Tidak ditemukan.</p>}
                          {!cityLoading && !districtLoading && (name === "shippingCity" ? cityResults : districtResults).map((destination) => (
                            <button
                              key={String(destination.id)}
                              type="button"
                              onClick={() => {
                                const value = destination.city;
                                if (name === "shippingCity") {
                                  setSelectedCity(destination);
                                  setCityQuery(value);
                                  setCityResults([]);
                                } else {
                                  setSelectedDistrict(destination);
                                  setDistrictQuery(value);
                                  setDistrictResults([]);
                                }
                                setForm((current) => ({
                                  ...current,
                                  [name]: value,
                                  ...(name === "shippingCity" ? {
                                    shippingCity: value,
                                    shippingProvince: destination.province,
                                  } : {
                                    shippingDistrict: value,
                                    shippingPostalCode: destination.postalCode || current.shippingPostalCode,
                                  }),
                                }));
                              }}
                              className="block w-full px-4 py-3 text-left text-xs font-normal text-marica-ink hover:bg-marica-cream"
                            >
                              <span className="font-semibold">{destination.city}</span>
                              {name === "shippingCity" && destination.regency
                                ? <span className="ml-1 text-marica-ink-soft">({destination.regency}, {destination.province})</span>
                                : name === "shippingCity" && destination.province && <span className="ml-1 text-marica-ink-soft">({destination.province})</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <input required value={form[name]} inputMode={name === "shippingPhone" || name === "shippingPostalCode" ? "numeric" : undefined} pattern={name === "shippingPhone" ? "[0-9]{8,15}" : name === "shippingPostalCode" ? "[0-9]{5}" : undefined} maxLength={name === "shippingPhone" ? 15 : name === "shippingPostalCode" ? 5 : undefined} onChange={(event) => setForm((current) => ({ ...current, [name]: name === "shippingPhone" || name === "shippingPostalCode" ? event.target.value.replace(/\D/g, "") : event.target.value }))} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-marica-ink/15 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-marica-amber-dark focus:ring-2 focus:ring-marica-amber/20" />
                  )}
                </label>
              ))}
              <label className="text-sm font-semibold sm:col-span-2">
                Alamat lengkap
                <textarea required value={form.shippingAddress} onChange={(event) => setForm((current) => ({ ...current, shippingAddress: event.target.value }))} placeholder="Nama jalan, nomor rumah, kecamatan, dan patokan" rows={3} className="mt-2 w-full resize-none rounded-xl border border-marica-ink/15 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-marica-amber-dark focus:ring-2 focus:ring-marica-amber/20" />
              </label>
              {error && <p className="sm:col-span-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              <button disabled={isSubmitting} className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-marica-amber-dark px-5 py-4 text-sm font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60">
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <PackageCheck className="h-5 w-5" />}
                {isSubmitting ? "Menyiapkan pembayaran..." : "Mulai Berlangganan Sekarang"}
              </button>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
