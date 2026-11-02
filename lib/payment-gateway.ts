import crypto from "crypto";
import midtransClient from "midtrans-client";

type PaymentParams = {
  transaction_details: { order_id: string; gross_amount: number };
  customer_details?: { first_name?: string; email?: string; phone?: string };
  item_details?: Array<{ id: string; price: number; quantity: number; name: string }>;
};

function siteUrl() {
  return (envValue("NEXT_PUBLIC_SITE_URL") || envValue("NEXTAUTH_URL") || "http://localhost:3000").replace(/\/$/, "");
}

function finishRedirectUrl(orderId: string) {
  const baseUrl = siteUrl();
  const encoded = encodeURIComponent(orderId);
  return `${baseUrl}/pembayaran/hasil?order_id=${encoded}`;
}

type PaymentResult = {
  token: string | null;
  redirect_url: string;
  provider: "WINPAY" | "MIDTRANS" | "WHATSAPP";
  external_id?: string;
};

const legacyMidtransSnap = new midtransClient.Snap({
  isProduction: envValue("MIDTRANS_IS_PRODUCTION") === "true",
  serverKey: envValue("MIDTRANS_SERVER_KEY") || "",
  clientKey: envValue("MIDTRANS_CLIENT_KEY") || "",
});

function envValue(name: string) {
  const value = process.env[name]?.trim();
  return value?.replace(/^("|')|("|')$/g, "") || undefined;
}

function jakartaTimestamp() {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 19) + "+07:00";
}

function whatsappFallback(params: PaymentParams, reason?: unknown): PaymentResult {
  if (envValue("WINPAY_DISABLE_WHATSAPP_FALLBACK") === "true") {
    const detail = reason instanceof Error ? reason.message : String(reason || "WinPay gagal membuat invoice");
    throw new Error(`WINPAY_CHECKOUT_FAILED: ${detail}`);
  }
  const number = (process.env.MARICA_WHATSAPP_NUMBER || "6285870459329").replace(/\D/g, "");
  const customer = params.customer_details?.first_name || "Pelanggan Marica";
  const amount = new Intl.NumberFormat("id-ID").format(params.transaction_details.gross_amount);
  const message = [`Halo Marica, saya ingin melanjutkan pembayaran.`, `Invoice: ${params.transaction_details.order_id}`, `Nama: ${customer}`, `Total: Rp${amount}`, `Mohon dibantu proses pembayarannya ya.`].join("\n");
  if (reason) console.warn("[Payment gateway] WinPay fallback to WhatsApp", reason);
  return { token: null, redirect_url: `https://wa.me/${number}?text=${encodeURIComponent(message)}`, provider: "WHATSAPP" };
}

async function createWinpayInvoice(params: PaymentParams): Promise<PaymentResult> {
  const apiKey = envValue("WINPAY_API_KEY");
  const secretKey = envValue("WINPAY_SECRET_KEY");
  if (!apiKey || !secretKey) return whatsappFallback(params, "WINPAY_API_KEY/WINPAY_SECRET_KEY belum dikonfigurasi");
  const configuredBaseUrl = envValue("WINPAY_BASE_URL");
  const isProduction = envValue("WINPAY_IS_PRODUCTION") === "true";
  const baseUrl = configuredBaseUrl || (isProduction ? "https://checkout.winpay.id" : "https://sandbox-checkout.winpay.id");
  const timestamp = jakartaTimestamp();
  const body = {
    customer: { name: params.customer_details?.first_name || "Pelanggan Marica", email: params.customer_details?.email || undefined, phone: params.customer_details?.phone || "-" },
    // WinPay tidak menerima baris produk dengan harga negatif. Checkout toko
    // dapat membawa diskon sebagai item negatif, jadi kirim satu baris invoice
    // dengan total final agar jumlah yang ditagihkan tetap akurat.
    invoice: { ref: params.transaction_details.order_id, products: [{ name: `Pembayaran Marica ${params.transaction_details.order_id}`.slice(0, 80), qty: 1, price: params.transaction_details.gross_amount }] },
    back_url: `${envValue("NEXT_PUBLIC_SITE_URL") || "http://localhost:3000"}/pembayaran/hasil?ref=${encodeURIComponent(params.transaction_details.order_id)}`,
    interval: Number(envValue("WINPAY_INVOICE_EXPIRY_MINUTES") || 120),
  };
  const signature = crypto.createHmac("sha256", secretKey).update(timestamp).digest("hex");
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/create`, { method: "POST", headers: { "Content-Type": "application/json", "X-Winpay-Timestamp": timestamp, "X-Winpay-Signature": signature, "X-Winpay-Key": apiKey }, body: JSON.stringify(body), cache: "no-store" });
    const rawResponse = await response.text();
    const data = JSON.parse(rawResponse || "null") as { responseData?: { id?: string; redirect_url?: string }; responseMessage?: string; message?: string } | null;
    if (!response.ok || !data?.responseData?.redirect_url) {
      const reason = data?.responseMessage || data?.message || `HTTP ${response.status}`;
      console.warn("[Payment gateway] WinPay rejected invoice", { status: response.status, baseUrl, reason });
      return whatsappFallback(params, reason);
    }
    return { token: null, redirect_url: data.responseData.redirect_url, provider: "WINPAY", external_id: data.responseData.id };
  } catch (error) {
    return whatsappFallback(params, error);
  }
}

export async function createPaymentTransaction(params: PaymentParams): Promise<PaymentResult> {
  if ((envValue("PAYMENT_PROVIDER") || "winpay").toLowerCase() === "midtrans") {
    const transaction = await legacyMidtransSnap.createTransaction({
      ...params,
      callbacks: { finish: finishRedirectUrl(params.transaction_details.order_id) },
    } as Parameters<typeof legacyMidtransSnap.createTransaction>[0]);
    return { token: transaction.token, redirect_url: transaction.redirect_url, provider: "MIDTRANS", external_id: transaction.token };
  }
  return createWinpayInvoice(params);
}
