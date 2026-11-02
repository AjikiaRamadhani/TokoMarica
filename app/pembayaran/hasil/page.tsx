import { Suspense } from "react";
import PaymentCheckClient from "./PaymentCheckClient";

export default async function PaymentCheckPage({ searchParams }: { searchParams: Promise<{ order_id?: string; transaction_status?: string }> }) {
  const params = await searchParams;
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#fdf8f1]" />}><PaymentCheckClient orderId={params.order_id ?? null} initialStatus={params.transaction_status ?? null} /></Suspense>;
}
