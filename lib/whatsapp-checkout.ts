type CheckoutItem = {
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
};

type CheckoutOrder = {
  orderNumber: string;
  total: number;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  shippingPostalCode: string;
  shippingCourier: string | null;
  shippingService: string | null;
  shippingCost: number;
  subtotal: number;
  pointsDiscount?: number;
  items: CheckoutItem[];
};

export function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return digits ? `62${digits}` : "";
}

export function buildCheckoutWhatsAppUrl(
  number: string,
  order: CheckoutOrder,
) {
  const normalized = normalizeWhatsAppNumber(number);
  if (!normalized) return null;

  const itemLines = order.items.flatMap((item) => [
    `- ${item.productName}`,
    `  Harga satuan: Rp${item.price.toLocaleString("id-ID")}`,
    `  Jumlah: ${item.quantity}`,
    `  Subtotal: Rp${item.subtotal.toLocaleString("id-ID")}`,
  ]);
  const discountLines =
    order.pointsDiscount && order.pointsDiscount > 0
      ? [`Diskon poin: -Rp${order.pointsDiscount.toLocaleString("id-ID")}`]
      : [];
  const message = [
    "Halo Marica, saya ingin melanjutkan pesanan.",
    `Nomor pesanan: ${order.orderNumber}`,
    `Nama: ${order.shippingName}`,
    `Telepon: ${order.shippingPhone}`,
    "",
    "Detail produk:",
    ...itemLines,
    "",
    `Subtotal produk: Rp${order.subtotal.toLocaleString("id-ID")}`,
    `Ongkir (${order.shippingCourier ?? "-"} ${order.shippingService ?? ""}): Rp${order.shippingCost.toLocaleString("id-ID")}`.trim(),
    ...discountLines,
    `Total: Rp${order.total.toLocaleString("id-ID")}`,
    "",
    `Alamat: ${order.shippingAddress}, ${order.shippingCity}, ${order.shippingProvince} ${order.shippingPostalCode}`,
    `Kurir: ${order.shippingCourier ?? "-"} ${order.shippingService ?? ""}`.trim(),
    "Mohon dibantu proses pesanan dan pembayarannya ya.",
  ].join("\n");

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildManualPaymentWhatsAppUrl(
  number: string,
  input: { reference: string; customerName: string; total: number; description: string },
) {
  const normalized = normalizeWhatsAppNumber(number);
  if (!normalized) return null;
  const message = [
    "Halo Marica, saya ingin melakukan pembayaran manual.",
    `Nomor transaksi: ${input.reference}`,
    `Nama: ${input.customerName}`,
    `Detail: ${input.description}`,
    `Total: Rp${input.total.toLocaleString("id-ID")}`,
    "Mohon diinformasikan rekening atau metode pembayaran dan dikonfirmasi setelah saya mengirim bukti pembayaran.",
  ].join("\n");
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
