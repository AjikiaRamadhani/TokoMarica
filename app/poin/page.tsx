"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Coins, History, Loader2 } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FeedbackPopup from "../components/FeedbackPopup";

type PointTransaction = {
  id: string;
  type: "EARN" | "REDEEM" | "ADJUSTMENT" | "REVERSAL";
  pointsDelta: number;
  reason: string | null;
  createdAt: string;
};

const typeLabels: Record<PointTransaction["type"], string> = {
  EARN: "Diperoleh",
  REDEEM: "Digunakan",
  ADJUSTMENT: "Penyesuaian",
  REVERSAL: "Dikembalikan",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function PointsPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/points")
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (response.status === 401) {
          router.push(`/login?callbackUrl=${encodeURIComponent("/poin")}`);
          return null;
        }
        if (!response.ok) throw new Error(data?.error ?? "Gagal memuat poin");
        return data as { balance: number; transactions: PointTransaction[] };
      })
      .then((data) => {
        if (!data) return;
        setBalance(data.balance);
        setTransactions(data.transactions);
      })
      .catch((reason) => {
        setError(
          reason instanceof Error ? reason.message : "Gagal memuat poin",
        );
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="section-soft-bg flex-1">
        <div className="mx-auto max-w-4xl px-5 py-8 sm:px-6 lg:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-body text-sm font-medium text-marica-ink-soft hover:text-marica-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali
          </Link>

          <div className="mt-7">
            <p className="font-body text-sm font-semibold text-marica-amber-text">
              MARICA REWARDS
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-marica-ink">
              Marica Points
            </h1>
            <p className="mt-2 font-body text-marica-ink-soft">
              Kumpulkan poin dari transaksi dan kunjungan game
              game. Gunakan sebagai potongan belanja.
            </p>
          </div>

          <div className="mt-7 rounded-3xl bg-marica-amber-dark p-6 text-white shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
                <Coins className="h-6 w-6" />
              </span>
              <span className="font-body text-sm font-medium text-white/80">
                Saldo poin kamu
              </span>
            </div>
            <p className="mt-5 font-display text-4xl font-bold">
              {loading ? "..." : balance.toLocaleString("id-ID")}{" "}
              <span className="text-xl">poin</span>
            </p>
            <p className="mt-2 font-body text-sm text-white/80">
              1 poin bernilai Rp1 saat checkout.
            </p>
          </div>

          <section className="mt-7 rounded-2xl border border-marica-ink/5 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-marica-amber-text" />
              <h2 className="font-display text-xl font-bold text-marica-ink">
                Riwayat poin
              </h2>
            </div>

            {loading && (
              <Loader2 className="mx-auto mt-8 h-6 w-6 animate-spin text-marica-amber-text" />
            )}
            {!loading && !error && transactions.length === 0 && (
              <p className="mt-6 text-center font-body text-sm text-marica-ink-soft">
                Belum ada aktivitas poin.
              </p>
            )}
            {!loading && transactions.length > 0 && (
              <div className="mt-4 divide-y divide-marica-ink/10">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-body text-sm font-semibold text-marica-ink">
                        {transaction.reason ?? typeLabels[transaction.type]}
                      </p>
                      <p className="mt-1 font-body text-xs text-marica-ink-soft">
                        {typeLabels[transaction.type]} ·{" "}
                        {formatDate(transaction.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 font-body text-sm font-bold ${transaction.pointsDelta >= 0 ? "text-emerald-600" : "text-marica-rose-deep"}`}
                    >
                      {transaction.pointsDelta >= 0 ? "+" : ""}
                      {transaction.pointsDelta.toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
      <FeedbackPopup message={error} onClose={() => setError(null)} />
    </div>
  );
}
