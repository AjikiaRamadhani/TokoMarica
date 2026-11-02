"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  MapPin,
  Plus,
  Home,
  Building2,
  MoreHorizontal,
  Check,
  Crosshair,
  Phone,
  User,
  Search,
  Truck,
  Loader2,
} from "lucide-react";
import {
  type ApiDestination,
  type ShippingCourierOption,
  destinationLabel,
  parseShippingCostResponse,
} from "./types";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type AddressLabel = "Rumah" | "Kantor" | "Lainnya";

export interface ShippingAddress {
  id: string;
  label: AddressLabel;
  isPrimary: boolean;
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
  fullAddress: string;
  note?: string;
  /** RajaOngkir destination id — required to calculate real shipping cost. */
  destinationId: string;
  destinationLabel: string;
}

export const SAVED_ADDRESSES_KEY = "marica-saved-shipping-addresses";

export function loadSavedAddresses(): ShippingAddress[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(SAVED_ADDRESSES_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function saveAddresses(addresses: ShippingAddress[]) {
  localStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(addresses));
}

interface AddressModalProps {
  open: boolean;
  onClose: () => void;
  addresses: ShippingAddress[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddAddress: (address: ShippingAddress) => void;
  /** Total weight of everything being checked out, used for the ongkir calculation. */
  totalWeightGrams: number;
  /** Called once the user has picked an address AND a courier/service. */
  onConfirm: (
    address: ShippingAddress,
    shipping: ShippingCourierOption,
  ) => void;
  isSubmitting?: boolean;
  submitError?: string | null;
}

const LABEL_ICON: Record<AddressLabel, typeof Home> = {
  Rumah: Home,
  Kantor: Building2,
  Lainnya: MoreHorizontal,
};

// Couriers to compare by default. RajaOngkir/Komerce supports combining
// multiple couriers in one call (see lib/rajaongkir.ts) — adjust this list to
// whichever couriers your store actually ships with.
const DEFAULT_COURIERS = "jne:jnt:sicepat";

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function AddressModal({
  open,
  onClose,
  addresses,
  selectedId,
  onSelect,
  onAddAddress,
  totalWeightGrams,
  onConfirm,
  isSubmitting,
  submitError,
}: AddressModalProps) {
  const [mode, setMode] = useState<"list" | "form" | "shipping">("list");

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Reset to the address list every time the modal is (re)opened.
  useEffect(() => {
    if (open) setMode(addresses.length > 0 ? "list" : "form");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = addresses.find((a) => a.id === selectedId) ?? null;

  const handleClose = () => {
    setMode(addresses.length > 0 ? "list" : "form");
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="address-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-marica-ink/40"
          />

          <motion.div
            key="address-modal"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-[0_-14px_35px_rgba(120,60,10,0.15)] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:w-[560px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
          >
            <div className="mx-auto mb-1 h-1.5 w-12 rounded-full bg-marica-ink/10 sm:hidden" />

            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-marica-ink sm:text-xl">
                {mode === "list" && "Atur Alamat Pengiriman"}
                {mode === "form" && "Tambah Alamat Baru"}
                {mode === "shipping" && "Pilih Kurir & Layanan"}
              </h2>
              <button
                type="button"
                onClick={
                  mode === "form" && addresses.length > 0
                    ? () => setMode("list")
                    : mode === "shipping"
                      ? () => setMode("list")
                      : handleClose
                }
                aria-label="Tutup"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-marica-cream text-marica-ink-soft transition hover:bg-marica-amber/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {mode === "list" && (
              <AddressList
                addresses={addresses}
                selectedId={selectedId}
                onSelect={onSelect}
                onAddNew={() => setMode("form")}
                onContinue={() => selected && setMode("shipping")}
              />
            )}

            {mode === "form" && (
              <AddressForm
                showCancel={addresses.length > 0}
                onCancel={() => setMode("list")}
                onSave={(addr) => {
                  onAddAddress(addr);
                  setMode("shipping");
                }}
              />
            )}

            {mode === "shipping" && selected && (
              <ShippingStep
                address={selected}
                totalWeightGrams={totalWeightGrams}
                onBack={() => setMode("list")}
                onConfirm={(shipping) => onConfirm(selected, shipping)}
                isSubmitting={isSubmitting}
                submitError={submitError}
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* -------------------------------------------------------------------------- */
/*  List view                                                                 */
/* -------------------------------------------------------------------------- */

function AddressList({
  addresses,
  selectedId,
  onSelect,
  onAddNew,
  onContinue,
}: {
  addresses: ShippingAddress[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddNew: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="mt-5">
      <p className="mb-3 font-body text-sm text-marica-ink-soft">
        Pilih alamat tujuan pengiriman untuk pesanan ini.
      </p>

      <div className="flex flex-col gap-3">
        {addresses.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-marica-ink/15 py-10 text-center">
            <MapPin className="h-8 w-8 text-marica-ink-soft/40" />
            <p className="font-body text-sm text-marica-ink-soft">
              Belum ada alamat tersimpan.
            </p>
          </div>
        )}

        {addresses.map((addr) => {
          const Icon = LABEL_ICON[addr.label];
          const isSelected = addr.id === selectedId;
          return (
            <button
              key={addr.id}
              type="button"
              onClick={() => onSelect(addr.id)}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                isSelected
                  ? "border-marica-amber-dark bg-marica-amber/10"
                  : "border-marica-ink/10 bg-white hover:bg-marica-cream"
              }`}
            >
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  isSelected
                    ? "bg-marica-amber-dark text-white"
                    : "bg-marica-cream text-marica-ink-soft"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-body text-sm font-semibold text-marica-ink">
                    {addr.recipientName}
                  </span>
                  <span className="rounded-full bg-marica-ink/5 px-2 py-0.5 font-body text-[11px] font-medium text-marica-ink-soft">
                    {addr.label}
                  </span>
                  {addr.isPrimary && (
                    <span className="rounded-full bg-marica-green/15 px-2 py-0.5 font-body text-[11px] font-medium text-marica-green">
                      Utama
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block font-body text-xs text-marica-ink-soft">
                  {addr.phone}
                </span>
                <span className="mt-1 block font-body text-xs leading-relaxed text-marica-ink-soft">
                  {addr.fullAddress}, {addr.district}, {addr.city},{" "}
                  {addr.province} {addr.postalCode}
                </span>
              </span>

              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  isSelected
                    ? "border-marica-amber-dark bg-marica-amber-dark"
                    : "border-marica-ink/15"
                }`}
              >
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onAddNew}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-marica-amber-dark/50 py-3.5 font-body text-sm font-semibold text-marica-amber-text transition hover:bg-marica-amber/10"
        >
          <Plus className="h-4 w-4" />
          Tambah Alamat Baru
        </button>
      </div>

      <button
        type="button"
        disabled={!selectedId}
        onClick={onContinue}
        className="mt-6 w-full rounded-full bg-marica-amber-dark py-3 font-body text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Lanjut Pilih Pengiriman
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shipping (courier + cost) step                                           */
/* -------------------------------------------------------------------------- */

function ShippingStep({
  address,
  totalWeightGrams,
  onBack,
  onConfirm,
  isSubmitting,
  submitError,
}: {
  address: ShippingAddress;
  totalWeightGrams: number;
  onBack: () => void;
  onConfirm: (shipping: ShippingCourierOption) => void;
  isSubmitting?: boolean;
  submitError?: string | null;
}) {
  const [options, setOptions] = useState<ShippingCourierOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setSelectedIdx(null);

    fetch("/api/shipping/cost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destinationId: address.destinationId,
        weightGrams: totalWeightGrams,
        courier: DEFAULT_COURIERS,
      }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error ?? "Gagal menghitung ongkir");
        return json;
      })
      .then((json) => {
        if (cancelled) return;
        const parsed = parseShippingCostResponse(json);
        setOptions(parsed);
        if (parsed.length === 0)
          setLoadError("Tidak ada layanan pengiriman untuk alamat ini.");
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError(
            err instanceof Error ? err.message : "Gagal menghitung ongkir",
          );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [address.destinationId, totalWeightGrams]);

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 font-body text-xs font-semibold text-marica-amber-text underline-offset-2 hover:underline"
      >
        &larr; Ganti alamat
      </button>

      <div className="mb-4 rounded-2xl border border-marica-ink/10 bg-marica-cream/40 p-3.5">
        <p className="font-body text-sm font-semibold text-marica-ink">
          {address.recipientName}
        </p>
        <p className="font-body text-xs text-marica-ink-soft">
          {address.fullAddress}, {address.district}, {address.city},{" "}
          {address.province} {address.postalCode}
        </p>
        <p className="mt-1 font-body text-[11px] text-marica-ink-soft/70">
          Tujuan RajaOngkir: {address.destinationLabel}
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-8 font-body text-sm text-marica-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" />
          Menghitung ongkos kirim...
        </div>
      )}

      {!isLoading && loadError && (
        <div className="rounded-2xl border border-marica-rose-deep/20 bg-marica-rose-deep/5 p-4 text-center font-body text-sm text-marica-rose-deep">
          {loadError}
        </div>
      )}

      {!isLoading && !loadError && (
        <div className="flex flex-col gap-2.5">
          {options.map((opt, i) => {
            const isSelected = selectedIdx === i;
            return (
              <button
                key={`${opt.courier}-${opt.service}-${i}`}
                type="button"
                onClick={() => setSelectedIdx(i)}
                className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition ${
                  isSelected
                    ? "border-marica-amber-dark bg-marica-amber/10"
                    : "border-marica-ink/10 bg-white hover:bg-marica-cream"
                }`}
              >
                <span className="flex items-start gap-2.5">
                  <Truck className="mt-0.5 h-4 w-4 shrink-0 text-marica-ink-soft" />
                  <span>
                    <span className="block font-body text-sm font-semibold uppercase text-marica-ink">
                      {opt.courier} · {opt.service}
                    </span>
                    {opt.description && (
                      <span className="block font-body text-xs text-marica-ink-soft">
                        {opt.description}
                      </span>
                    )}
                    {opt.etd && (
                      <span className="block font-body text-xs text-marica-ink-soft">
                        Estimasi {opt.etd} hari
                      </span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 font-body text-sm font-bold text-marica-amber-text">
                  Rp {opt.cost.toLocaleString("id-ID")}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {submitError && (
        <p className="mt-3 font-body text-sm text-marica-rose-deep">
          {submitError}
        </p>
      )}

      <button
        type="button"
        disabled={selectedIdx === null || isSubmitting}
        onClick={() => selectedIdx !== null && onConfirm(options[selectedIdx])}
        className="mt-5 w-full rounded-full bg-marica-amber-dark py-3 font-body text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isSubmitting ? "Membuat Pesanan..." : "Buat Pesanan"}
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Add-address form                                                          */
/* -------------------------------------------------------------------------- */

function AddressForm({
  showCancel,
  onCancel,
  onSave,
}: {
  showCancel: boolean;
  onCancel: () => void;
  onSave: (address: ShippingAddress) => void;
}) {
  const [label, setLabel] = useState<AddressLabel>("Rumah");
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [note, setNote] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  // --- RajaOngkir destination search (replaces free-text province/city) ---
  const [destQuery, setDestQuery] = useState("");
  const [destResults, setDestResults] = useState<ApiDestination[]>([]);
  const [destLoading, setDestLoading] = useState(false);
  const [destError, setDestError] = useState<string | null>(null);
  const [selectedDest, setSelectedDest] = useState<ApiDestination | null>(null);

  useEffect(() => {
    const q = destQuery.trim();
    if (selectedDest && destinationLabel(selectedDest) === q) return; // already picked, don't re-search
    if (q.length < 3) {
      setDestResults([]);
      return;
    }
    let cancelled = false;
    setDestLoading(true);
    setDestError(null);
    const timer = setTimeout(() => {
      fetch(`/api/shipping/destinations?search=${encodeURIComponent(q)}`)
        .then(async (res) => {
          const json = await res.json().catch(() => null);
          if (!res.ok)
            throw new Error(json?.error ?? "Gagal mencari kota tujuan");
          return json;
        })
        .then((json) => {
          if (cancelled) return;
          setDestResults(Array.isArray(json) ? json : (json?.data ?? []));
        })
        .catch((err) => {
          if (!cancelled)
            setDestError(
              err instanceof Error ? err.message : "Gagal mencari kota tujuan",
            );
        })
        .finally(() => {
          if (!cancelled) setDestLoading(false);
        });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [destQuery, selectedDest]);

  const isValid =
    recipientName.trim() &&
    phone.trim() &&
    selectedDest &&
    district.trim() &&
    postalCode.trim() &&
    fullAddress.trim();

  const handleUseCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocateError("Perangkat ini tidak mendukung deteksi lokasi.");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const reverseRes = await fetch(
            `/api/shipping/reverse-geocode?lat=${latitude}&lon=${longitude}`,
          );
          const reverseJson = await reverseRes.json().catch(() => null);
          if (!reverseRes.ok)
            throw new Error(reverseJson?.error ?? "Alamat tidak ditemukan");

          const location = reverseJson.address as {
            road?: string;
            house_number?: string;
            neighbourhood?: string;
            suburb?: string;
            village?: string;
            town?: string;
            city?: string;
            county?: string;
            state?: string;
            postcode?: string;
          };
          const city =
            location.city ??
            location.town ??
            location.village ??
            location.county ??
            "";
          const district =
            location.suburb ?? location.neighbourhood ?? location.village ?? "";
          const query = [district, city].filter(Boolean).join(" ");
          const destinationRes = await fetch(
            `/api/shipping/destinations?search=${encodeURIComponent(query || city)}`,
          );
          const destinationJson = await destinationRes.json().catch(() => null);
          if (!destinationRes.ok)
            throw new Error(
              destinationJson?.error ?? "Kota tujuan tidak ditemukan",
            );
          const destinations: ApiDestination[] = Array.isArray(destinationJson)
            ? destinationJson
            : (destinationJson?.data ?? []);
          const destination = destinations[0];
          if (!destination)
            throw new Error(
              "Kota tujuan tidak ditemukan. Pilih kota secara manual.",
            );

          setSelectedDest(destination);
          setDestQuery(destinationLabel(destination));
          setDistrict(district || String(destination.subdistrict_name ?? ""));
          setPostalCode(location.postcode ?? "");
          setFullAddress(
            [
              location.road,
              location.house_number,
              location.neighbourhood,
              location.suburb,
            ]
              .filter(Boolean)
              .join(", "),
          );
          setNote(
            (prev) =>
              prev ||
              `Lokasi GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          );
        } catch (error) {
          setLocateError(
            error instanceof Error ? error.message : "Alamat tidak ditemukan",
          );
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocateError(
          "Gagal mengambil lokasi. Pastikan izin lokasi diaktifkan.",
        );
        setLocating(false);
      },
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !selectedDest) return;
    if (!/^[0-9]{8,15}$/.test(phone)) return;
    if (!/^[0-9]{5}$/.test(postalCode)) return;
    if (fullAddress.trim().length < 10) return;

    const label_ = destinationLabel(selectedDest);
    // Best-effort split of "Kecamatan, Kota, Provinsi" into city/province —
    // exact field names depend on the still-unconfirmed Komerce response
    // shape (see lib/rajaongkir.ts), so fall back to the raw label.
    const city = String(
      selectedDest.city_name ?? label_.split(",")[1]?.trim() ?? label_,
    );
    const province = String(
      selectedDest.province_name ?? label_.split(",")[2]?.trim() ?? "",
    );

    onSave({
      id: `addr-${Date.now()}`,
      label,
      isPrimary,
      recipientName: recipientName.trim(),
      phone: phone.trim(),
      province,
      city,
      district: district.trim(),
      postalCode: postalCode.trim(),
      fullAddress: fullAddress.trim(),
      note: note.trim() || undefined,
      destinationId: String(selectedDest.id),
      destinationLabel: label_,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
      {/* Label chips */}
      <div>
        <span className="mb-1.5 block font-body text-xs font-medium text-marica-ink-soft">
          Label Alamat
        </span>
        <div className="flex gap-2">
          {(Object.keys(LABEL_ICON) as AddressLabel[]).map((opt) => {
            const Icon = LABEL_ICON[opt];
            const active = label === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setLabel(opt)}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 font-body text-xs font-medium transition ${
                  active
                    ? "border-marica-amber-dark bg-marica-amber-dark text-white"
                    : "border-marica-ink/10 bg-white text-marica-ink-soft hover:bg-marica-cream"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Use current location */}
      <button
        type="button"
        onClick={handleUseCurrentLocation}
        disabled={locating}
        className="flex items-center justify-center gap-2 rounded-2xl border border-marica-blue/30 bg-marica-sky-light py-2.5 font-body text-xs font-semibold text-marica-ink transition hover:bg-marica-sky disabled:opacity-60"
      >
        <Crosshair className="h-3.5 w-3.5" />
        {locating ? "Mendeteksi lokasi..." : "Gunakan Lokasi Saat Ini"}
      </button>
      {locateError && (
        <p className="-mt-2 font-body text-xs text-marica-rose-deep">
          {locateError}
        </p>
      )}

      {/* Recipient + phone */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nama Penerima" icon={User}>
          <input
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="cth. Budi Santoso"
            className={inputClass}
          />
        </Field>
        <Field label="No. Telepon" icon={Phone}>
          <input
            value={phone}
            inputMode="numeric"
            pattern="[0-9]{8,15}"
            maxLength={15}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            placeholder="08xxxxxxxxxx"
            className={inputClass}
          />
        </Field>
      </div>

      {/* Destination search (RajaOngkir) — replaces free-text province/city */}
      <Field label="Kota / Kecamatan Tujuan" icon={Search}>
        <div className="relative">
          <input
            value={destQuery}
            onChange={(e) => {
              setDestQuery(e.target.value);
              setSelectedDest(null);
            }}
            placeholder="Ketik min. 3 huruf, cth. Magelang Tengah"
            className={inputClass}
          />
          {destQuery.trim().length >= 3 && !selectedDest && (
            <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-marica-ink/10 bg-white shadow-lg">
              {destLoading && (
                <p className="px-3.5 py-2.5 font-body text-xs text-marica-ink-soft">
                  Mencari...
                </p>
              )}
              {!destLoading && destError && (
                <p className="px-3.5 py-2.5 font-body text-xs text-marica-rose-deep">
                  {destError}
                </p>
              )}
              {!destLoading && !destError && destResults.length === 0 && (
                <p className="px-3.5 py-2.5 font-body text-xs text-marica-ink-soft">
                  Tidak ditemukan.
                </p>
              )}
              {!destLoading &&
                destResults.map((dest) => (
                  <button
                    key={String(dest.id)}
                    type="button"
                    onClick={() => {
                      setSelectedDest(dest);
                      setDestQuery(destinationLabel(dest));
                      setDestResults([]);
                    }}
                    className="block w-full px-3.5 py-2.5 text-left font-body text-xs text-marica-ink hover:bg-marica-cream"
                  >
                    {destinationLabel(dest)}
                  </button>
                ))}
            </div>
          )}
        </div>
        {selectedDest && (
          <span className="mt-1 flex items-center gap-1 font-body text-[11px] text-marica-green">
            <Check className="h-3 w-3" /> Tujuan dipilih
          </span>
        )}
      </Field>

      {/* District + postal code */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kecamatan">
          <input
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="cth. Magelang Tengah"
            className={inputClass}
          />
        </Field>
        <Field label="Kode Pos">
          <input
            value={postalCode}
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ""))}
            placeholder="cth. 56117"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Alamat Lengkap">
        <textarea
          value={fullAddress}
          onChange={(e) => setFullAddress(e.target.value)}
          placeholder="Nama jalan, nomor rumah, RT/RW, patokan..."
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </Field>

      <Field label="Catatan untuk Kurir (opsional)">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="cth. Pagar hijau, titip ke satpam"
          className={inputClass}
        />
      </Field>

      <label className="flex items-center gap-2 font-body text-sm text-marica-ink-soft">
        <input
          type="checkbox"
          checked={isPrimary}
          onChange={(e) => setIsPrimary(e.target.checked)}
          className="h-4 w-4 rounded border-marica-ink/20 text-marica-amber-dark focus:ring-marica-amber-dark/40"
        />
        Jadikan sebagai alamat utama
      </label>

      <div className="mt-1 flex gap-2.5">
        {showCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border-2 border-marica-ink/10 py-3 font-body text-sm font-semibold text-marica-ink-soft transition hover:bg-marica-cream"
          >
            Batal
          </button>
        )}
        <button
          type="submit"
          disabled={!isValid}
          className="flex-1 rounded-full bg-marica-amber-dark py-3 font-body text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Simpan &amp; Lanjut
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-xl border border-marica-ink/10 bg-white py-2.5 px-3.5 font-body text-sm text-marica-ink placeholder:text-marica-ink-soft/50 outline-none transition focus:border-marica-amber-dark/50";

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: typeof User;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 font-body text-xs font-medium text-marica-ink-soft">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </span>
      {children}
    </label>
  );
}
