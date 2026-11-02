import midtransClient from "midtrans-client";
import { createPaymentTransaction } from "@/lib/payment-gateway";

export const snap = { createTransaction: createPaymentTransaction };

function envValue(name: string) {
  const value = process.env[name]?.trim();
  return value?.replace(/^("|')|("|')$/g, "") || "";
}

export const coreApi = new midtransClient.CoreApi({
  isProduction: envValue("MIDTRANS_IS_PRODUCTION") === "true",
  serverKey: envValue("MIDTRANS_SERVER_KEY"),
  clientKey: envValue("MIDTRANS_CLIENT_KEY"),
});
