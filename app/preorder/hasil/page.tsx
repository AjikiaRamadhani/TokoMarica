import { Suspense } from "react";
import PreorderResultClient from "./PreorderResultClient";

export default async function PreorderResultPage({ searchParams }: { searchParams: Promise<{ reservation?: string }> }) {
  const params = await searchParams;
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#fdf8f1]" />}><PreorderResultClient reservationNumber={params.reservation ?? null} /></Suspense>;
}
