"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, ExternalLink, Loader2, Package, Star, Store, Truck, XCircle } from "lucide-react";

import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import FeedbackPopup from "../../../components/FeedbackPopup";
import CancelOrderModal from "../../../components/belanja/CancelOrderModal";
import { buildCheckoutWhatsAppUrl } from "@/lib/whatsapp-checkout";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  type ApiOrder,
  type ApiOrderReview,
} from "../../../components/belanja/types";

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ApiOrderReview[]>([]);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { rating: number; comment: string }>>({});
  const [submittingReview, setSubmittingReview] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const loadReviews = async (orderId: string) => {
    const response = await fetch(`/api/orders/${orderId}/reviews`);
    if (!response.ok) return;
    const json = (await response.json()) as { reviews?: ApiOrderReview[] };
    setReviews(json.reviews ?? []);
  };

  const loadOrder = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${params.id}`);
      const json = await response.json().catch(() => null);
      if (response.status === 401) {
        router.push(
          `/login?callbackUrl=${encodeURIComponent(`/belanja/pesanan-saya/${params.id}`)}`,
        );
        return;
      }
      if (!response.ok)
        throw new Error(json?.error ?? "Pesanan tidak ditemukan");
      setOrder(json as ApiOrder);
      void loadReviews(params.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat detail pesanan",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (params.id) void loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handlePay = async () => {
    if (!order) {
      setError("Detail pesanan belum siap dimuat.");
      return;
    }
    setIsPaying(true);
    setError(null);
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
      setError(err instanceof Error ? err.message : "Gagal membuka WhatsApp");
    } finally {
      setIsPaying(false);
    }
  };

  const openCancelModal = () => {
    setCancelError(null);
    setCancelModalOpen(true);
  };

  const closeCancelModal = () => {
    if (!isCancelling) setCancelModalOpen(false);
  };

  const handleCancel = async () => {
    if (!order) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(json?.error ?? "Gagal membatalkan pesanan");
      setOrder(json as ApiOrder);
      setCancelModalOpen(false);
    } catch (err) {
      setCancelError(
        err instanceof Error ? err.message : "Gagal membatalkan pesanan",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!order) return;
    setIsConfirming(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm_delivery" }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error ?? "Gagal mengonfirmasi pesanan");
      setOrder(json as ApiOrder);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengonfirmasi pesanan");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSubmitReview = async (productId: string) => {
    const draft = reviewDrafts[productId];
    if (!draft?.rating) {
      setReviewError("Pilih rating bintang terlebih dahulu.");
      return;
    }
    setSubmittingReview(productId);
    setReviewError(null);
    try {
      const response = await fetch(`/api/orders/${order?.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating: draft.rating, comment: draft.comment }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error ?? "Gagal menyimpan ulasan");
      setReviews((current) => [...current, json.review as ApiOrderReview]);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Gagal menyimpan ulasan");
    } finally {
      setSubmittingReview(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="section-soft-bg flex-1">
        <div className="mx-auto max-w-4xl px-5 py-8 sm:px-6 lg:px-10">
          <Link
            href="/belanja/pesanan-saya"
            className="mb-6 inline-flex items-center gap-1.5 font-body text-sm font-medium text-marica-ink-soft hover:text-marica-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Pesanan Saya
          </Link>

          {isLoading && (
            <div className="h-72 animate-pulse rounded-2xl bg-marica-ink/5" />
          )}
          {!isLoading && error && !order && <div className="h-24" />}

          {!isLoading && order && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 font-body text-sm font-semibold text-marica-ink">
                    <Store className="h-4 w-4 text-marica-ink-soft" /> Marica
                    Official Store
                  </p>
                  <h1 className="mt-2 font-display text-2xl font-bold text-marica-ink">
                    Detail Pesanan
                  </h1>
                  <p className="mt-1 font-body text-sm text-marica-ink-soft">
                    {order.orderNumber} · {formatDate(order.createdAt)}
                  </p>
                  {order.paymentMethod?.startsWith("offline_") && (
                    <span className="mt-2 inline-flex rounded-full bg-marica-green/15 px-2.5 py-1 font-body text-xs font-semibold text-marica-green">
                      Checkout offline melalui kasir
                    </span>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1.5 font-body text-xs font-semibold ${ORDER_STATUS_STYLE[order.status]}`}
                >
                  {ORDER_STATUS_LABEL[order.status]}
                </span>
              </div>

              <OrderTimeline order={order} />

              <section className="mt-6 rounded-2xl border border-marica-ink/5 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-marica-amber-dark" />
                  <h2 className="font-display text-lg font-bold text-marica-ink">Pengiriman</h2>
                </div>
                {order.trackingNumber ? (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="font-body text-sm text-marica-ink-soft">
                      <p>Kurir: <strong className="text-marica-ink">{order.shippingCourier?.toUpperCase() ?? "-"} {order.shippingService ?? ""}</strong></p>
                      <p className="mt-1">Nomor resi: <strong className="text-marica-ink">{order.trackingNumber}</strong></p>
                    </div>
                    {order.trackingUrl && (
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-marica-amber-dark px-5 py-2.5 font-body text-sm font-semibold text-white transition hover:brightness-105"
                      >
                        Lacak Pengiriman <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 font-body text-sm text-marica-ink-soft">
                    Nomor resi akan muncul setelah pesanan diserahkan kepada kurir.
                  </p>
                )}
              </section>

              <section className="mt-6 rounded-2xl border border-marica-ink/5 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="font-display text-lg font-bold text-marica-ink">
                  Produk
                </h2>
                <div className="mt-4 flex flex-col gap-4">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 border-b border-marica-ink/5 pb-4 last:border-0 last:pb-0"
                    >
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-marica-cream">
                        {item.productImageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.productImageUrl}
                            alt={item.productName}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-body text-sm font-semibold text-marica-ink">
                          {item.productName}
                        </p>
                        {!item.productAvailable && (
                          <p className="mt-1 font-body text-xs font-semibold text-marica-rose-deep">
                            Produk sudah tidak tersedia
                          </p>
                        )}
                        <p className="mt-1 font-body text-xs text-marica-ink-soft">
                          {item.quantity} barang x {formatRupiah(item.price)}
                        </p>
                      </div>
                      <p className="font-body text-sm font-bold text-marica-ink">
                        {formatRupiah(item.subtotal)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {order.status === "DELIVERED" && (
                <ReviewSection
                  order={order}
                  reviews={reviews}
                  drafts={reviewDrafts}
                  submittingProductId={submittingReview}
                  error={reviewError}
                  onDraftChange={(productId, draft) =>
                    setReviewDrafts((current) => ({ ...current, [productId]: draft }))
                  }
                  onSubmit={handleSubmitReview}
                />
              )}

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <section className="rounded-2xl border border-marica-ink/5 bg-white p-5 shadow-sm">
                  <h2 className="font-display text-lg font-bold text-marica-ink">
                    Alamat Pengiriman
                  </h2>
                  <div className="mt-3 font-body text-sm text-marica-ink">
                    <p className="font-semibold">{order.shippingName}</p>
                    <p className="mt-1 text-marica-ink-soft">
                      {order.shippingPhone}
                    </p>
                    <p className="mt-2 leading-relaxed">
                      {order.shippingAddress}
                    </p>
                    <p className="leading-relaxed">
                      {order.shippingCity}, {order.shippingProvince}{" "}
                      {order.shippingPostalCode}
                    </p>
                  </div>
                  <div className="mt-4 border-t border-marica-ink/10 pt-3">
                    <p className="font-body text-sm font-semibold text-marica-ink">
                      Kurir
                    </p>
                    <p className="mt-1 font-body text-sm text-marica-ink-soft">
                      {order.shippingCourier?.toUpperCase() ?? "Kurir"}{" "}
                      {order.shippingService ?? ""}
                    </p>
                    <p className="mt-1 font-body text-sm text-marica-ink-soft">
                      Ongkir {formatRupiah(order.shippingCost)}
                    </p>
                  </div>
                </section>
                <section className="rounded-2xl border border-marica-ink/5 bg-white p-5 shadow-sm">
                  <h2 className="font-display text-lg font-bold text-marica-ink">
                    Ringkasan Pembayaran
                  </h2>
                  <div className="mt-3 flex justify-between font-body text-sm text-marica-ink-soft">
                    <span>Subtotal</span>
                    <span>{formatRupiah(order.subtotal)}</span>
                  </div>
                  <div className="mt-2 flex justify-between font-body text-sm text-marica-ink-soft">
                    <span>Potongan Marica Points</span>
                    <span className="text-marica-green">
                      -{formatRupiah(order.pointsDiscount)}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between font-body text-sm text-marica-ink-soft">
                    <span>Jasa ongkir</span>
                    <span>{formatRupiah(order.shippingCost)}</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-marica-ink/10 pt-2 font-body font-bold text-marica-ink">
                    <span>Total</span>
                    <span>{formatRupiah(order.total)}</span>
                  </div>
                </section>
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                {order.status === "PENDING_PAYMENT" && (
                  <>
                    <button
                      type="button"
                      onClick={openCancelModal}
                      disabled={isCancelling || isPaying}
                      className="inline-flex items-center gap-1.5 rounded-full border-2 border-marica-rose-deep/30 px-5 py-2.5 font-body text-sm font-semibold text-marica-rose-deep disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />{" "}
                      {isCancelling ? "Membatalkan..." : "Batalkan Pesanan"}
                    </button>
                    <button
                      type="button"
                      onClick={handlePay}
                      disabled={isPaying || isCancelling}
                      className="inline-flex items-center gap-1.5 rounded-full bg-marica-amber-dark px-5 py-2.5 font-body text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {isPaying && <Loader2 className="h-4 w-4 animate-spin" />}{" "}
                      Bayar Sekarang
                    </button>
                  </>
                )}
                {order.status !== "PENDING_PAYMENT" && (
                  <Package className="h-5 w-5 text-marica-ink-soft" />
                )}
                {order.status === "SHIPPED" && (
                  <button
                    type="button"
                    onClick={handleConfirmDelivery}
                    disabled={isConfirming}
                    className="inline-flex items-center gap-1.5 rounded-full border-2 border-marica-green/40 px-5 py-2.5 font-body text-sm font-semibold text-marica-green disabled:opacity-50"
                  >
                    {isConfirming && <Loader2 className="h-4 w-4 animate-spin" />}
                    Barang Sudah Diterima
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
      <FeedbackPopup message={error} onClose={() => setError(null)} />
      <CancelOrderModal
        orderNumber={cancelModalOpen ? (order?.orderNumber ?? null) : null}
        isCancelling={isCancelling}
        error={cancelError}
        onCancel={closeCancelModal}
        onConfirm={handleCancel}
      />
    </div>
  );
}

function ReviewSection({
  order,
  reviews,
  drafts,
  submittingProductId,
  error,
  onDraftChange,
  onSubmit,
}: {
  order: ApiOrder;
  reviews: ApiOrderReview[];
  drafts: Record<string, { rating: number; comment: string }>;
  submittingProductId: string | null;
  error: string | null;
  onDraftChange: (productId: string, draft: { rating: number; comment: string }) => void;
  onSubmit: (productId: string) => void;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-marica-green/20 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="font-display text-lg font-bold text-marica-ink">Beri Ulasan</h2>
        <p className="mt-1 font-body text-sm text-marica-ink-soft">
          Pesanan sudah diterima. Bagikan pengalamanmu untuk membantu pelanggan lain.
        </p>
      </div>
      <div className="mt-5 flex flex-col gap-5">
        {order.items.filter((item) => item.productId).map((item) => {
          const productId = item.productId as string;
          const review = reviews.find((current) => current.productId === productId);
          const draft = drafts[productId] ?? { rating: 0, comment: "" };
          return (
            <div key={item.id} className="rounded-xl border border-marica-ink/10 p-4">
              <p className="font-body text-sm font-semibold text-marica-ink">{item.productName}</p>
              {review ? (
                <div className="mt-3">
                  <StarRating rating={review.rating} />
                  {review.comment && <p className="mt-2 font-body text-sm text-marica-ink-soft">{review.comment}</p>}
                  <p className="mt-2 font-body text-xs font-semibold text-marica-green">Ulasan tersimpan</p>
                </div>
              ) : (
                <>
                  <div className="mt-3 flex gap-1" aria-label="Pilih rating">
                    {Array.from({ length: 5 }, (_, index) => {
                      const rating = index + 1;
                      return (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => onDraftChange(productId, { ...draft, rating })}
                          aria-label={`${rating} bintang`}
                          className="rounded p-1 transition hover:bg-marica-amber/20"
                        >
                          <Star className={`h-5 w-5 ${rating <= draft.rating ? "fill-marica-amber-dark text-marica-amber-dark" : "text-marica-ink/20"}`} />
                        </button>
                      );
                    })}
                  </div>
                  <textarea
                    value={draft.comment}
                    onChange={(event) => onDraftChange(productId, { ...draft, comment: event.target.value })}
                    maxLength={1000}
                    rows={3}
                    placeholder="Tulis ulasan (opsional)"
                    className="mt-3 w-full rounded-xl border border-marica-ink/10 px-3 py-2 font-body text-sm text-marica-ink outline-none focus:border-marica-amber-dark/50"
                  />
                  <button
                    type="button"
                    onClick={() => onSubmit(productId)}
                    disabled={submittingProductId === productId}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-marica-amber-dark px-4 py-2 font-body text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {submittingProductId === productId && <Loader2 className="h-4 w-4 animate-spin" />}
                    Kirim Ulasan
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="mt-4 rounded-lg bg-marica-rose-deep/5 p-3 font-body text-sm text-marica-rose-deep">{error}</p>}
    </section>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1" aria-label={`Rating ${rating} dari 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} className={`h-4 w-4 ${index < rating ? "fill-marica-amber-dark text-marica-amber-dark" : "text-marica-ink/20"}`} />
      ))}
    </div>
  );
}

function OrderTimeline({ order }: { order: ApiOrder }) {
  const stages = [
    { label: "Pesanan dibuat", date: order.createdAt },
    { label: "Pembayaran berhasil", date: order.paidAt },
    { label: "Sedang dipacking", date: order.processingAt },
    { label: "Dikirim", date: order.shippedAt },
    { label: "Selesai", date: order.deliveredAt },
  ];
  const rank: Record<ApiOrder["status"], number> = {
    PENDING_PAYMENT: 0,
    PAID: 1,
    PROCESSING: 2,
    SHIPPED: 3,
    DELIVERED: 4,
    CANCELLED: -1,
    EXPIRED: -1,
  };
  const currentRank = rank[order.status];

  return (
    <section className="mt-6 rounded-2xl border border-marica-ink/5 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-lg font-bold text-marica-ink">Perjalanan Pesanan</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-5 sm:gap-2">
        {stages.map((stage, index) => {
          const reached = currentRank >= index;
          return (
            <div key={stage.label} className="relative flex items-start gap-3 sm:block sm:text-center">
              {index < stages.length - 1 && (
                <span className={`absolute left-3 top-7 h-[2px] w-full sm:left-1/2 sm:top-3 sm:h-0.5 sm:w-full ${currentRank > index ? "bg-marica-green" : "bg-marica-ink/10"}`} />
              )}
              <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full sm:mx-auto ${reached ? "bg-marica-green text-white" : "bg-marica-ink/10 text-marica-ink-soft"}`}>
                {reached ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-3.5 w-3.5" />}
              </span>
              <div className="sm:mt-2">
                <p className={`font-body text-xs font-semibold ${reached ? "text-marica-ink" : "text-marica-ink-soft"}`}>{stage.label}</p>
                {stage.date && <p className="mt-0.5 font-body text-[11px] text-marica-ink-soft">{formatDate(stage.date)}</p>}
              </div>
            </div>
          );
        })}
      </div>
      {(order.status === "CANCELLED" || order.status === "EXPIRED") && (
        <p className="mt-4 rounded-xl bg-marica-rose-deep/5 p-3 font-body text-sm text-marica-rose-deep">
          Pesanan ini {order.status === "EXPIRED" ? "kedaluwarsa karena belum dibayar" : "dibatalkan"}.
        </p>
      )}
    </section>
  );
}
