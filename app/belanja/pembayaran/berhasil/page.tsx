import { Suspense } from "react";
import PaymentSuccessClient from "./PaymentSuccessClient";

export default async function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const params = await searchParams;
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#fdf8f1]" />}><PaymentSuccessClient orderId={params.order ?? null} /></Suspense>;
}
