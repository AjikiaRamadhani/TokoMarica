export type ApiProductImage = {
  id: string;
  url: string;
  isVideo: boolean;
  order: number;
};

export type ApiProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  ageMin: number | null;
  ageMax: number | null;
  skillFocus: string[];
  playerCount: string | null;
  isBestSeller: boolean;
  soldCount: number;
  ratingAvg: number;
  reviewCount: number;
  category: { id: string; name: string; slug: string } | null;
  images: ApiProductImage[];
};

export type ApiProductsResponse = {
  products: ApiProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ApiCategory = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  colorTag: string | null;
  children: { id: string; name: string; slug: string }[];
};

export type SortValue = "newest" | "price_asc" | "price_desc" | "bestseller";

export type PriceRangeOption = {
  key: string;
  label: string;
  min?: number;
  max?: number;
};

export type AgeOption = {
  key: string;
  label: string;
  value: string; // "min-max", matches the API's `age` param contract
};

export const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "newest", label: "Terbaru" },
  { value: "bestseller", label: "Terpopuler" },
  { value: "price_asc", label: "Harga Terendah" },
  { value: "price_desc", label: "Harga Tertinggi" },
];

export const PRICE_RANGES: PriceRangeOption[] = [
  { key: "all", label: "Semua Harga" },
  { key: "under-100", label: "Di bawah Rp 100.000", max: 100000 },
  { key: "100-300", label: "Rp 100.000 - Rp 300.000", min: 100000, max: 300000 },
  { key: "over-300", label: "Di atas Rp 300.000", min: 300000 },
];

export const AGE_OPTIONS: AgeOption[] = [
  { key: "0-2", label: "0 - 2 Tahun", value: "0-2" },
  { key: "3-5", label: "3 - 5 Tahun", value: "3-5" },
  { key: "6-8", label: "6 - 8 Tahun", value: "6-8" },
  { key: "9-99", label: "9+ Tahun", value: "9-99" },
];

/* -------------------------------------------------------------------------- */
/*  Cart — matches GET/POST /api/cart response shape                         */
/* -------------------------------------------------------------------------- */

export type ApiCartItem = {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  bundleId: string | null;
  product: ApiProduct;
};

export type ApiCart = {
  id?: string;
  items: ApiCartItem[];
  subtotal: number;
  originalSubtotal?: number;
  bundleDiscount?: number;
};

/* -------------------------------------------------------------------------- */
/*  Orders — matches GET /api/orders response shape (schema.prisma OrderStatus)*/
/* -------------------------------------------------------------------------- */

export type ApiOrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "EXPIRED";

export const ORDER_STATUS_LABEL: Record<ApiOrderStatus, string> = {
  PENDING_PAYMENT: "Menunggu Pembayaran",
  PAID: "Paid",
  PROCESSING: "Diproses",
  SHIPPED: "Dikirim",
  DELIVERED: "Selesai",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kedaluwarsa",
};

export const ORDER_STATUS_STYLE: Record<ApiOrderStatus, string> = {
  PENDING_PAYMENT: "bg-marica-amber/20 text-marica-amber-text",
  PAID: "bg-marica-sky-light text-marica-blue",
  PROCESSING: "bg-marica-sky-light text-marica-blue",
  SHIPPED: "bg-marica-violet/20 text-marica-violet-deep",
  DELIVERED: "bg-marica-green/15 text-marica-green",
  CANCELLED: "bg-marica-rose-deep/10 text-marica-rose-deep",
  EXPIRED: "bg-marica-rose-deep/10 text-marica-rose-deep",
};

export type ApiOrderItem = {
  id: string;
  productId: string | null;
  productName: string;
  productImageUrl: string | null;
  productAvailable: boolean;
  price: number;
  quantity: number;
  subtotal: number;
};

export type ApiOrderReview = {
  id: string;
  productId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiProductReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { name: string };
};

export type ApiOrder = {
  id: string;
  orderNumber: string;
  status: ApiOrderStatus;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  shippingPostalCode: string;
  shippingCourier: string | null;
  shippingService: string | null;
  shippingCost: number;
  trackingNumber: string | null;
  trackingUrl: string | null;
  paymentMethod: string | null;
  fulfillmentNote: string | null;
  subtotal: number;
  pointsUsed: number;
  pointsDiscount: number;
  total: number;
  paidAt: string | null;
  processingAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  items: ApiOrderItem[];
};

/* -------------------------------------------------------------------------- */
/*  Shipping — RajaOngkir (Komerce) destination search & cost calculation     */
/* -------------------------------------------------------------------------- */

// NOTE: lib/rajaongkir.ts itself flags that the exact response shape of the
// new Komerce API "belum kekonfirmasi 100%". Keep this loose/defensive and
// tighten it once you've confirmed the real field names against a live call.
export type ApiDestination = {
  id: number | string;
  label?: string;
  subdistrict_name?: string;
  district_name?: string;
  city_name?: string;
  province_name?: string;
  zip_code?: string;
  [key: string]: unknown;
};

export function destinationLabel(dest: ApiDestination): string {
  if (dest.label) return dest.label;
  return [dest.subdistrict_name ?? dest.district_name, dest.city_name, dest.province_name]
    .filter(Boolean)
    .join(", ");
}

export type ShippingCourierOption = {
  courier: string; // e.g. "jne"
  service: string; // e.g. "REG"
  description?: string;
  cost: number;
  etd?: string;
};

// NOTE: same caveat as above — komerceFetch's response shape for
// /calculate/domestic-cost isn't 100% confirmed either, so this parser tries
// a couple of plausible shapes. Adjust field names once verified.
export function parseShippingCostResponse(raw: unknown): ShippingCourierOption[] {
  const list = Array.isArray(raw) ? raw : (raw as { costs?: unknown[] })?.costs ?? [];
  return (list as Record<string, unknown>[])
    .map((item) => ({
      courier: String(item.code ?? item.courier ?? ""),
      service: String(item.service ?? ""),
      description: item.description ? String(item.description) : undefined,
      cost: Number(
        (item.cost as { value?: number }[])?.[0]?.value ?? item.cost ?? item.price ?? 0
      ),
      etd: item.etd ? String(item.etd) : undefined,
    }))
    .filter((opt) => opt.courier && opt.cost > 0);
}
