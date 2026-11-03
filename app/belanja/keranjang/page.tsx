"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BadgePercent,
  Loader2,
  Minus,
  Plus,
  ShoppingCart,
  ShoppingBag,
  Trash2,
} from "lucide-react";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import FeedbackPopup from "../../components/FeedbackPopup";
import AddressModal, {
  loadSavedAddresses,
  saveAddresses,
  type ShippingAddress,
} from "../../components/belanja/AddressModal";
import type {
  ApiCart,
  ApiCartItem,
  ApiProduct,
  ShippingCourierOption,
} from "../../components/belanja/types";

const DEFAULT_ITEM_WEIGHT_GRAMS = 500;

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

type CartBundle = {
  id: string;
  name: string | null;
  bundlePrice: number;
  savings: number;
  products: ApiProduct[];
};

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<ApiCart>({ items: [], subtotal: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [recommendedBundles, setRecommendedBundles] = useState<CartBundle[]>(
    [],
  );
  const [busyBundleId, setBusyBundleId] = useState<string | null>(null);

  const loadBundleRecommendations = async (items: ApiCartItem[]) => {
    if (items.length === 0) {
      setRecommendedBundles([]);
      return;
    }

    try {
      const responses = await Promise.all(
        items.map((item) =>
          fetch(`/api/products/${encodeURIComponent(item.product.slug)}`),
        ),
      );
      const products = (await Promise.all(
        responses
          .filter((response) => response.ok)
          .map((response) => response.json()),
      )) as Array<
        ApiProduct & {
          bundles?: Array<{
            id: string;
            name: string | null;
            bundlePrice: number;
            savings: number;
            otherProducts: ApiProduct[];
          }>;
        }
      >;
      const bundles = new Map<string, CartBundle>();

      products.forEach((product) => {
        product.bundles?.forEach((bundle) => {
          if (bundles.has(bundle.id)) return;
          bundles.set(bundle.id, {
            id: bundle.id,
            name: bundle.name,
            bundlePrice: bundle.bundlePrice,
            savings: bundle.savings,
            products: [product, ...bundle.otherProducts],
          });
        });
      });

      setRecommendedBundles(Array.from(bundles.values()));
    } catch {
      setRecommendedBundles([]);
    }
  };

  const loadCart = async (showInitialLoading = false) => {
    if (showInitialLoading) setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/cart");
      const json = await response.json().catch(() => null);
      if (response.status === 401) {
        router.push(
          `/login?callbackUrl=${encodeURIComponent("/belanja/keranjang")}`,
        );
        return;
      }
      if (!response.ok)
        throw new Error(json?.error ?? "Gagal memuat keranjang");
      const nextCart = json as ApiCart;
      setCart(nextCart);
      void loadBundleRecommendations(nextCart.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat keranjang");
    } finally {
      if (showInitialLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCart(true); // eslint-disable-line react-hooks/set-state-in-effect
    fetch("/api/points")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { balance?: number } | null) =>
        setPointsBalance(data?.balance ?? 0),
      )
      .catch(() => setPointsBalance(0));
    const saved = loadSavedAddresses();
    setAddresses(saved);
    setSelectedAddressId(
      saved.find((address) => address.isPrimary)?.id ?? saved[0]?.id ?? null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalWeightGrams = useMemo(
    () =>
      cart.items.reduce(
        (total, item) => total + item.quantity * DEFAULT_ITEM_WEIGHT_GRAMS,
        0,
      ),
    [cart.items],
  );

  const updateItem = async (item: ApiCartItem, quantity: number) => {
    if (quantity < 1) return removeItem(item.id);
    setBusyItemId(item.id);
    setError(null);
    try {
      const response = await fetch(`/api/cart/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(json?.error ?? "Gagal mengubah jumlah produk");
      await loadCart();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mengubah jumlah produk",
      );
    } finally {
      setBusyItemId(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setBusyItemId(itemId);
    setError(null);
    try {
      const response = await fetch(`/api/cart/${itemId}`, { method: "DELETE" });
      const json = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(json?.error ?? "Gagal menghapus produk");
      await loadCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus produk");
    } finally {
      setBusyItemId(null);
    }
  };

  const addBundleToCart = async (bundle: CartBundle) => {
    setBusyBundleId(bundle.id);
    setError(null);
    try {
      for (const product of bundle.products) {
        const response = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            quantity: 1,
            bundleId: bundle.id,
          }),
        });
        const json = await response.json().catch(() => null);
        if (!response.ok)
          throw new Error(json?.error ?? "Gagal menambahkan paket");
      }
      await loadCart();
      setAddressModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambahkan paket");
    } finally {
      setBusyBundleId(null);
    }
  };

  const confirmCheckout = async (
    address: ShippingAddress,
    shipping: ShippingCourierOption,
  ) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingName: address.recipientName,
          shippingPhone: address.phone,
          shippingAddress: address.fullAddress,
          shippingCity: address.city,
          shippingProvince: address.province,
          shippingPostalCode: address.postalCode,
          shippingCourier: shipping.courier,
          shippingService: shipping.service,
          shippingCost: shipping.cost,
          redeemPoints,
        }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error ?? "Gagal membuat pesanan");

      setAddressModalOpen(false);
      if (typeof json?.whatsappUrl === "string") {
        window.location.href = json.whatsappUrl;
      } else {
        router.push("/belanja/pesanan-saya");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat pesanan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="section-soft-bg flex-1">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 lg:px-10 lg:py-10">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-5 inline-flex items-center gap-1.5 font-body text-sm font-medium text-marica-ink-soft hover:text-marica-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali
          </button>

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-marica-amber-text">
                Belanja pilihanmu
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold text-marica-ink sm:text-3xl">
                Keranjang
              </h1>
              {!isLoading && cart.items.length > 0 && (
                <p className="mt-1 font-body text-sm text-marica-ink-soft">
                  {cart.items.length} produk siap diproses
                </p>
              )}
            </div>
            <Link
              href="/belanja"
              className="hidden shrink-0 items-center gap-1.5 rounded-full border border-marica-ink/10 bg-white px-4 py-2 font-body text-sm font-semibold text-marica-ink-soft shadow-sm transition hover:border-marica-amber/50 hover:text-marica-amber-text sm:inline-flex"
            >
              Lanjut Belanja
            </Link>
          </div>

          {!isLoading && cart.items.length === 0 ? (
            <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-marica-amber/20 bg-[linear-gradient(145deg,#fffdf8_0%,#fff7e6_100%)] px-6 py-20 text-center shadow-[0_14px_35px_rgba(120,60,10,0.06)]">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-marica-amber-dark shadow-sm">
                <ShoppingBag className="h-8 w-8" />
              </span>
              <h2 className="font-display text-lg font-semibold text-marica-ink">
                Keranjang masih kosong
              </h2>
              <p className="max-w-sm font-body text-sm text-marica-ink-soft">
                Temukan permainan dan aktivitas seru untuk melengkapi kebutuhan
                si kecil.
              </p>
              <Link
                href="/belanja"
                className="mt-2 rounded-full bg-marica-amber-dark px-5 py-2.5 font-body text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
              >
                Pilih Produk
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="flex flex-col gap-3">
                {!isLoading && cart.items.length > 0 && (
                  <div className="mb-1 flex items-center justify-between border-b border-marica-ink/8 pb-3">
                    <p className="font-body text-sm font-semibold text-marica-ink">
                      Produk pilihanmu
                    </p>
                    <span className="font-body text-xs text-marica-ink-soft">
                      Harga terbaik untukmu
                    </span>
                  </div>
                )}
                {cart.items.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    busy={busyItemId === item.id}
                    onChange={updateItem}
                    onRemove={removeItem}
                  />
                ))}

                {!isLoading && recommendedBundles.length > 0 && (
                  <section className="mt-3 overflow-hidden rounded-2xl border border-marica-amber/25 bg-[linear-gradient(135deg,#fffdf8_0%,#fff5df_100%)] p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="font-body text-xs font-semibold uppercase tracking-[0.12em] text-marica-amber-text">
                          Pilihan untuk keranjangmu
                        </p>
                        <h2 className="mt-1 font-display text-lg font-bold text-marica-ink sm:text-xl">
                          Paket lebih hemat
                        </h2>
                        <p className="mt-1 font-body text-xs text-marica-ink-soft">
                          Gabungkan produk pilihan dan dapatkan harga spesial.
                        </p>
                      </div>
                      <BadgePercent className="hidden h-7 w-7 text-marica-amber-dark sm:block" />
                    </div>

                    <div className="mt-4 grid gap-3 xl:grid-cols-2">
                      {recommendedBundles.map((bundle) => (
                        <div
                          key={bundle.id}
                          className="rounded-xl border border-marica-ink/8 bg-white/90 p-3.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate font-body text-sm font-bold text-marica-ink">
                                {bundle.name || "Paket Hemat"}
                              </h3>
                              <p className="mt-1 font-body text-xs text-marica-ink-soft">
                                {bundle.products.length} produk dalam satu paket
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-marica-rose-deep/10 px-2 py-1 font-body text-[11px] font-bold text-marica-rose-deep">
                              Hemat {formatRupiah(bundle.savings)}
                            </span>
                          </div>

                          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                            {bundle.products.map((product) => (
                              <Link
                                key={product.id}
                                href={`/belanja/${product.slug}`}
                                className="w-20 shrink-0"
                              >
                                <div className="h-16 overflow-hidden rounded-lg bg-marica-cream">
                                  {product.images[0]?.url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={product.images[0].url}
                                      alt={product.name}
                                      className="h-full w-full object-cover"
                                    />
                                  )}
                                </div>
                                <p className="mt-1 line-clamp-2 font-body text-[11px] leading-tight text-marica-ink-soft">
                                  {product.name}
                                </p>
                              </Link>
                            ))}
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3 border-t border-marica-ink/8 pt-3">
                            <div>
                              <p className="font-body text-[11px] text-marica-ink-soft">
                                Harga paket
                              </p>
                              <p className="font-display text-base font-bold text-marica-ink">
                                {formatRupiah(bundle.bundlePrice)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => addBundleToCart(bundle)}
                              disabled={busyBundleId !== null}
                              className="inline-flex items-center gap-1.5 rounded-full bg-marica-amber-dark px-3.5 py-2 font-body text-xs font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {busyBundleId === bundle.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ShoppingCart className="h-3.5 w-3.5" />
                              )}
                              {busyBundleId === bundle.id
                                ? "Menambahkan"
                                : "Tambah Paket"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              <aside className="h-fit rounded-3xl border border-marica-ink/5 bg-white p-5 shadow-[0_14px_35px_rgba(120,60,10,0.08)] sm:p-6 lg:sticky lg:top-24">
                <h2 className="font-display text-lg font-bold text-marica-ink">
                  Ringkasan Pesanan
                </h2>
                <div className="mt-1 flex items-center gap-1.5 font-body text-xs text-marica-ink-soft">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  {cart.items.length} produk di keranjang
                </div>
                <div className="mt-4 flex items-center justify-between font-body text-sm text-marica-ink-soft">
                  <span>{cart.items.length} produk</span>
                  <span>{formatRupiah(cart.subtotal)}</span>
                </div>
                {!!cart.bundleDiscount && cart.bundleDiscount > 0 && (
                  <div className="mt-2 flex items-center justify-between font-body text-xs text-marica-green">
                    <span>Hemat paket</span>
                    <span>-{formatRupiah(cart.bundleDiscount)}</span>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between border-t border-marica-ink/10 pt-3 font-body font-bold text-marica-ink">
                  <span>Subtotal</span>
                  <span>{formatRupiah(cart.subtotal)}</span>
                </div>
                <div className="mt-4 rounded-xl bg-marica-cream/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="redeem-points"
                      className="font-body text-sm font-semibold text-marica-ink"
                    >
                      Pakai Marica Points
                    </label>
                    <span className="font-body text-xs text-marica-ink-soft">
                      Saldo {pointsBalance.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id="redeem-points"
                      type="number"
                      min={0}
                      max={pointsBalance}
                      value={redeemPoints || ""}
                      onChange={(event) => {
                        const next = Math.max(
                          0,
                          Math.min(
                            pointsBalance,
                            Number(event.target.value) || 0,
                          ),
                        );
                        setRedeemPoints(Math.floor(next));
                      }}
                      className="w-full rounded-lg border border-marica-ink/10 bg-white px-3 py-2 font-body text-sm text-marica-ink outline-none focus:border-marica-amber"
                      placeholder="0"
                    />
                    <span className="shrink-0 font-body text-xs text-marica-ink-soft">
                      = Rp{redeemPoints.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <p className="mt-2 font-body text-xs text-marica-ink-soft">
                    1 poin = Rp1. Potongan dihitung saat ongkir dipilih.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddressModalOpen(true)}
                  disabled={isLoading || cart.items.length === 0}
                  className="mt-5 w-full rounded-full bg-marica-amber-dark py-3 font-body text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Lanjut ke Pesanan
                </button>
                <p className="mt-3 text-center font-body text-xs text-marica-ink-soft">
                  Pembayaran dilakukan setelah pesanan dibuat.
                </p>
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer />

      <AddressModal
        open={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        addresses={addresses}
        selectedId={selectedAddressId}
        onSelect={setSelectedAddressId}
        onAddAddress={(address) => {
          const next = address.isPrimary
            ? [
                ...addresses.map((saved) => ({ ...saved, isPrimary: false })),
                address,
              ]
            : [...addresses, address];
          saveAddresses(next);
          setAddresses(next);
          setSelectedAddressId(address.id);
        }}
        totalWeightGrams={totalWeightGrams}
        onConfirm={confirmCheckout}
        isSubmitting={isSubmitting}
        submitError={error}
      />
      <FeedbackPopup message={error} onClose={() => setError(null)} />
    </div>
  );
}

function CartItemRow({
  item,
  busy,
  onChange,
  onRemove,
}: {
  item: ApiCartItem;
  busy: boolean;
  onChange: (item: ApiCartItem, quantity: number) => void;
  onRemove: (itemId: string) => void;
}) {
  const image = item.product.images[0]?.url;
  return (
    <div className="flex gap-3 rounded-2xl border border-marica-ink/5 bg-white p-3 shadow-sm sm:gap-4 sm:p-4">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-marica-cream sm:h-24 sm:w-24">
        {image && (
          <img
            src={image}
            alt={item.product.name}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-display text-sm font-semibold text-marica-ink sm:text-base">
            {item.product.name}
          </p>
          {item.product.stock <= 5 && (
            <span className="shrink-0 rounded-full bg-marica-rose-deep/10 px-2 py-1 font-body text-[10px] font-semibold text-marica-rose-deep">
              Sisa {item.product.stock}
            </span>
          )}
        </div>
        <p className="mt-1 font-body text-sm font-bold text-marica-amber-text">
          {formatRupiah(item.product.price)}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            aria-label="Kurangi jumlah"
            disabled={busy}
            onClick={() => onChange(item, item.quantity - 1)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-marica-ink/10 text-marica-ink-soft disabled:opacity-40"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-6 text-center font-body text-sm font-semibold text-marica-ink">
            {item.quantity}
          </span>
          <button
            type="button"
            aria-label="Tambah jumlah"
            disabled={busy || item.quantity >= item.product.stock}
            onClick={() => onChange(item, item.quantity + 1)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-marica-ink/10 text-marica-ink-soft disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          {busy && (
            <Loader2 className="h-4 w-4 animate-spin text-marica-ink-soft" />
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        <p className="font-body text-sm font-bold text-marica-ink">
          {formatRupiah(item.product.price * item.quantity)}
        </p>
        <button
          type="button"
          aria-label={`Hapus ${item.product.name}`}
          disabled={busy}
          onClick={() => onRemove(item.id)}
          className="text-marica-rose-deep transition hover:brightness-75 disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
