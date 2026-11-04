"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ArrowLeft, Store, PackageSearch, Loader2, Sparkles } from "lucide-react";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import FeedbackPopup from "../../components/FeedbackPopup";
import { buildCheckoutWhatsAppUrl } from "@/lib/whatsapp-checkout";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  type ApiOrder,
  type ApiOrderStatus,
} from "../../components/belanja/types";

type PreorderTab = "PREORDER";
type OrderTab = "Semua" | ApiOrderStatus | PreorderTab;
type PreorderSummary = { reservationNumber: string; quantity: number; totalPrice: number; status: string; campaign: { title: string; product: { name: string } } };

const TABS: { key: OrderTab; label: string }[] = [
  { key: "Semua", label: "Semua Pesanan" },
  { key: "PENDING_PAYMENT", label: ORDER_STATUS_LABEL.PENDING_PAYMENT },
  { key: "PROCESSING", label: ORDER_STATUS_LABEL.PROCESSING },
  { key: "SHIPPED", label: ORDER_STATUS_LABEL.SHIPPED },
  { key: "DELIVERED", label: ORDER_STATUS_LABEL.DELIVERED },
  { key: "CANCELLED", label: ORDER_STATUS_LABEL.CANCELLED },
  { key: "PREORDER", label: "Pre-order" },
];

function formatRupiah(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function PesananSayaPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [preorders, setPreorders] = useState<PreorderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] =
    useState<(typeof TABS)[number]["key"]>("Semua");
  const [searchInput, setSearchInput] = useState("");
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [preordersLoading, setPreordersLoading] = useState(true);

  const loadOrders = () => {
    setIsLoading(true);
    setError(null);
    fetch("/api/orders")
      .then(async (res) => {
        if (res.status === 401) {
          router.push(
            `/login?callbackUrl=${encodeURIComponent("/belanja/pesanan-saya")}`,
          );
          return null;
        }
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error ?? "Gagal memuat pesanan");
        return json as ApiOrder[];
      })
      .then((json) => {
        if (json) setOrders(json);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Gagal memuat pesanan");
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    // Muat pesanan langsung di halaman riwayat belanja.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch("/api/preorders/mine", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (response.status === 401) return null;
        if (!response.ok) throw new Error(data.error ?? "Gagal memuat pre-order");
        return data as PreorderSummary[];
      })
      .then((data) => { if (data) setPreorders(data); })
      .catch(() => undefined)
      .finally(() => setPreordersLoading(false));
  }, []);

  const filteredOrders = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesTab = activeTab !== "PREORDER" && (activeTab === "Semua" || order.status === activeTab);
      const matchesSearch =
        !q ||
        order.orderNumber.toLowerCase().includes(q) ||
        order.items.some((item) => item.productName.toLowerCase().includes(q));
      return matchesTab && matchesSearch;
    });
  }, [orders, activeTab, searchInput]);

  const filteredPreorders = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    return preorders.filter((item) => !q || item.reservationNumber.toLowerCase().includes(q) || item.campaign.title.toLowerCase().includes(q) || item.campaign.product.name.toLowerCase().includes(q));
  }, [preorders, searchInput]);

  const orderStats = useMemo(() => ({
    total: orders.length,
    waiting: orders.filter((order) => order.status === "PENDING_PAYMENT").length,
    active: orders.filter((order) => ["PROCESSING", "SHIPPED"].includes(order.status)).length,
    completed: orders.filter((order) => order.status === "DELIVERED").length,
  }), [orders]);

  const handleBayarSekarang = async (order: ApiOrder) => {
    setPayError(null);
    setPayingOrderId(order.id);
    try {
      const response = await fetch("/api/company", { cache: "no-store" });
      const company = await response.json();
      if (!response.ok || !company.whatsapp) {
        throw new Error("Nomor WhatsApp checkout belum dikonfigurasi");
      }
      const whatsappUrl = buildCheckoutWhatsAppUrl(company.whatsapp, order);
      if (!whatsappUrl) throw new Error("Nomor WhatsApp checkout tidak valid");
      window.location.href = whatsappUrl;
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Gagal membuka WhatsApp");
    } finally {
      setPayingOrderId(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      <main className="section-soft-bg flex-1">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 lg:px-10">
          <Link
            href="/belanja"
            className="mb-5 inline-flex items-center gap-1.5 font-body text-sm font-medium text-marica-ink-soft transition hover:text-marica-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali
          </Link>

          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-marica-rose/40 via-marica-amber/20 to-marica-sky-light px-6 py-8 sm:px-10 sm:py-10">
            <div className="relative z-[1] flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-body text-sm font-medium text-marica-ink-soft">Riwayat belanja</p>
                <h1 className="mt-2 font-display text-3xl font-bold text-marica-ink sm:text-4xl">
                  Pesanan Saya
                </h1>
                <p className="mt-2 max-w-lg font-body text-sm text-marica-ink-soft">
                  Pantau pembayaran, proses pengiriman, dan riwayat pesanan Marica kamu.
                </p>
              </div>
              <div className="relative sm:w-80">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-marica-ink-soft/60" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari pesanan atau nama produk"
                className="w-full rounded-full border border-marica-ink/10 bg-white py-2.5 pl-10 pr-4 font-body text-sm text-marica-ink placeholder:text-marica-ink-soft/50 shadow-sm outline-none transition focus:border-marica-amber-dark/50"
              />
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Total Pesanan", orderStats.total],
              ["Menunggu Bayar", orderStats.waiting],
              ["Sedang Berjalan", orderStats.active],
              ["Selesai", orderStats.completed],
            ].map(([label, count]) => (
              <div key={label} className="rounded-2xl border border-marica-ink/10 bg-white px-4 py-4 shadow-sm">
                <p className="font-body text-xs text-marica-ink-soft">{label}</p>
                <p className="mt-1 font-display text-2xl font-bold text-marica-ink">{count}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="mt-7 flex gap-2 overflow-x-auto pb-1">
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative shrink-0 whitespace-nowrap rounded-full border px-4 py-2 font-body text-sm font-medium transition ${
                    active
                      ? "border-marica-amber-dark bg-marica-amber-dark text-white shadow-sm"
                      : "border-marica-ink/10 bg-white text-marica-ink-soft hover:border-marica-amber-dark/40 hover:text-marica-ink"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Orders */}
          <div className="mt-6 flex flex-col gap-5">
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-2xl bg-marica-ink/5"
                />
              ))}

            {!isLoading && error && (
              <div className="rounded-2xl border border-marica-rose-deep/20 bg-marica-rose-deep/5 p-6 text-center font-body text-sm text-marica-rose-deep">
                {error}
              </div>
            )}

            {activeTab !== "PREORDER" && !isLoading && !error && filteredOrders.length === 0 && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-marica-ink/5 bg-white py-16 text-center shadow-sm">
                <PackageSearch className="h-10 w-10 text-marica-ink-soft/40" />
                <p className="font-display text-base font-semibold text-marica-ink">Tidak ada pesanan</p>
                <p className="max-w-xs font-body text-sm text-marica-ink-soft">Belum ada pesanan yang cocok dengan pencarian atau filter ini.</p>
              </div>
            )}

            {activeTab === "PREORDER" && !preordersLoading && !error && filteredPreorders.length === 0 && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-marica-ink/5 bg-white py-16 text-center shadow-sm">
                <Sparkles className="h-10 w-10 text-marica-ink-soft/40" />
                <p className="font-display text-base font-semibold text-marica-ink">
                  Belum ada pre-order
                </p>
                <p className="max-w-xs font-body text-sm text-marica-ink-soft">
                  Belum ada pembelian rilis eksklusif yang cocok dengan pencarian ini.
                </p>
              </div>
            )}

            {activeTab === "PREORDER" && preordersLoading && <div className="h-40 animate-pulse rounded-2xl bg-marica-ink/5" />}

            {activeTab === "PREORDER" && !preordersLoading && !error && filteredPreorders.map((item) => <PreorderCard key={item.reservationNumber} item={item} />)}

            {activeTab !== "PREORDER" && !isLoading &&
              !error &&
              filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isPaying={payingOrderId === order.id}
                  onBayarSekarang={handleBayarSekarang}
                />
              ))}
          </div>
        </div>
      </main>

      <Footer />
      <FeedbackPopup message={error} onClose={() => setError(null)} />
      <FeedbackPopup message={payError} onClose={() => setPayError(null)} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Order card                                                                */
/* -------------------------------------------------------------------------- */

function PreorderCard({ item }: { item: PreorderSummary }) {
  const statusLabel: Record<string, string> = { PENDING_PAYMENT: "Menunggu pembayaran", PAID: "Berhasil", CANCELLED: "Dibatalkan", EXPIRED: "Kedaluwarsa" };
  const paid = item.status === "PAID";
  return <div className="rounded-2xl border border-marica-amber/20 bg-white p-5 shadow-[0_10px_28px_rgba(120,60,10,0.06)] sm:p-6"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-marica-ink/5 pb-4"><span className="flex items-center gap-2 font-body text-sm font-semibold text-marica-ink"><Sparkles className="h-4 w-4 text-marica-amber-dark" />Rilis Eksklusif</span><span className="flex items-center gap-2"><span className="font-body text-xs text-marica-ink-soft">{item.reservationNumber}</span><span className="rounded-full bg-marica-amber/20 px-2.5 py-1 font-body text-[11px] font-semibold text-marica-amber-dark">{statusLabel[item.status] ?? item.status}</span></span></div><div className="py-4"><p className="font-body text-sm font-semibold text-marica-ink sm:text-base">{item.campaign.title}</p><p className="mt-1 text-sm text-marica-ink-soft">{item.campaign.product.name} · {item.quantity} unit</p></div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-marica-ink/5 pt-4"><div><p className="font-body text-xs text-marica-ink-soft">Total Pre-order</p><p className="font-display text-xl font-bold text-marica-amber-text">{formatRupiah(item.totalPrice)}</p></div><Link href={`/preorder/hasil?reservation=${encodeURIComponent(item.reservationNumber)}`} className="rounded-full bg-marica-ink px-5 py-2 font-body text-sm font-semibold text-white">{paid ? "Lihat detail" : "Cek pembayaran"}</Link></div></div>;
}

function OrderCard({
  order,
  isPaying,
  onBayarSekarang,
}: {
  order: ApiOrder;
  isPaying: boolean;
  onBayarSekarang: (order: ApiOrder) => void;
}) {
  return (
    <div className="rounded-2xl border border-marica-ink/5 bg-white p-5 shadow-[0_10px_28px_rgba(120,60,10,0.06)] sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-marica-ink/5 pb-4">
        <span className="flex items-center gap-2 font-body text-sm font-semibold text-marica-ink">
          <Store className="h-4 w-4 text-marica-ink-soft" />
          Marica Official Store
          <span className="font-normal text-marica-ink-soft">
            · {formatDate(order.createdAt)}
          </span>
        </span>

        <span className="flex items-center gap-2.5">
          <span className="font-body text-xs text-marica-ink-soft">
            {order.orderNumber}
          </span>
          {order.paymentMethod?.startsWith("offline_") && (
            <span className="rounded-full bg-marica-green/15 px-2.5 py-1 font-body text-[11px] font-semibold text-marica-green">
              Checkout offline
            </span>
          )}
          <span
            className={`rounded-full px-2.5 py-1 font-body text-[11px] font-semibold ${ORDER_STATUS_STYLE[order.status]}`}
          >
            {ORDER_STATUS_LABEL[order.status]}
          </span>
        </span>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-4 py-4">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-marica-cream">
              {item.productImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.productImageUrl}
                  alt={item.productName}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-body text-sm font-semibold text-marica-ink sm:text-base">
                {item.productName}
              </p>
                        {!item.productAvailable && (
                          <p className="mt-1 font-body text-xs font-semibold text-marica-rose-deep">
                            Produk sudah tidak tersedia
                          </p>
                        )}
              <p className="mt-0.5 font-body text-xs text-marica-ink-soft sm:text-sm">
                {item.quantity} barang x {formatRupiah(item.price)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Total + actions */}
      <div className="flex flex-col items-end gap-3 border-t border-marica-ink/5 pt-4">
        <div className="text-right">
          <p className="font-body text-xs text-marica-ink-soft">
            Total Pesanan
          </p>
          <p className="font-display text-xl font-bold text-marica-amber-text">
            {formatRupiah(order.total)}
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2.5">
          <Link
            href={`/belanja/pesanan-saya/${order.id}`}
            className="rounded-full border-2 border-marica-amber-dark/40 px-5 py-2 font-body text-sm font-semibold text-marica-amber-text transition hover:bg-marica-amber/10"
          >
            Detail Pesanan
          </Link>

          {order.status === "PENDING_PAYMENT" && (
            <button
              type="button"
              disabled={isPaying}
              onClick={() => onBayarSekarang(order)}
              className="inline-flex items-center gap-1.5 rounded-full bg-marica-amber-dark px-5 py-2 font-body text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPaying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Bayar Sekarang
            </button>
          )}

          {order.status === "PROCESSING" && (
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-full border-2 border-marica-ink/10 px-5 py-2 font-body text-sm font-semibold text-marica-ink-soft/50"
            >
              Sedang Diproses
            </button>
          )}

          {order.status === "SHIPPED" && (
            <Link
              href={`/belanja/pesanan-saya/${order.id}`}
              className="rounded-full bg-marica-amber-dark px-5 py-2 font-body text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
            >
              Lacak Pesanan
            </Link>
          )}

          {order.status === "DELIVERED" && (
            <>
              <Link
                href="/belanja"
                className="rounded-full border-2 border-marica-amber-dark/40 px-5 py-2 font-body text-sm font-semibold text-marica-amber-text transition hover:bg-marica-amber/10"
              >
                Beli Lagi
              </Link>
              <Link
                href={`/belanja/pesanan-saya/${order.id}`}
                className="rounded-full bg-marica-amber-dark px-5 py-2 font-body text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
              >
                Beri Ulasan
              </Link>
            </>
          )}

          {(order.status === "CANCELLED" || order.status === "EXPIRED") && (
            <Link
              href="/belanja"
              className="rounded-full bg-marica-amber-dark px-5 py-2 font-body text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
            >
              Beli Lagi
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
