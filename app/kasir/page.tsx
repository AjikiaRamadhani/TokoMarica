"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Banknote,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Minus,
  Package,
  Plus,
  QrCode,
  ReceiptText,
  Search,
  ShoppingCart,
  Ticket,
  Trash2,
  UserRound,
  AlertCircle,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  isActive: boolean;
  images?: { url: string }[];
};
type SalesSummary = {
  completedTransactions: number;
  completedRevenue: number;
  cashRevenue: number;
  currentShiftTransactions: number;
  currentShiftCashRevenue: number;
};
type PackageItem = {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  maxParticipants?: number;
};
type MemberVoucher = {
  id: string;
  voucher: {
    code: string;
    title: string;
    discountAmount: number;
    expiresAt?: string | null;
  };
};
type Member = {
  id: string;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  pointsBalance: number;
  vouchers?: MemberVoucher[];
};
type CartItem = {
  key: string;
  type: "PRODUCT" | "PLAYPASS" | "TABLE_FEE";
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  tableNumber?: string;
};
type Shift = { id: string; openingCash: number; openedAt: string };
type CatalogTab = "PRODUCT" | "PLAYPASS" | "TABLE_FEE";
type CheckInMode = "EVENT" | "PLAYPASS" | "TABLE_RESERVATION";
type Sale = {
  id: string;
  transactionNumber: string;
  status: string;
  total: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: string;
  createdAt: string;
  customer: {
    id: string;
    name: string | null;
    email: string | null;
    whatsapp: string | null;
  } | null;
  items: {
    itemName: string;
    quantity: number;
    unitPrice?: number;
    subtotal?: number;
    type?: CartItem["type"];
    productId?: string | null;
  }[];
};
type ActiveTable = {
  id: string;
  sessionNumber: string;
  tableNumber: string;
  endsAt: string;
  package: { name: string };
};

const money = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;
const parseAmount = (value: string) => Number(value.replace(/[^\d]/g, "")) || 0;
const formatAmountInput = (value: string) => {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits).toLocaleString("id-ID") : "";
};

function normalizeProductImageUrl(value?: string | null) {
  const source = value?.trim();
  if (!source) return null;
  if (source.startsWith("//")) return `https:${source}`;
  if (/^(https?:|data:|blob:)/i.test(source) || source.startsWith("/")) {
    return source;
  }
  return `/${source}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function PosPage() {
  const [tab, setTab] = useState<CatalogTab>("PRODUCT");
  const [catalogPage, setCatalogPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const [salesQuery, setSalesQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [playpasses, setPlaypasses] = useState<PackageItem[]>([]);
  const [tableFees, setTableFees] = useState<PackageItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [member, setMember] = useState<Member | null>(null);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(
    null,
  );
  const [shift, setShift] = useState<Shift | null>(null);
  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "QRIS">("CASH");
  const [tableNumber, setTableNumber] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isVoiding, setIsVoiding] = useState<string | null>(null);
  const [isUpdatingTable, setIsUpdatingTable] = useState<string | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesSummary, setSalesSummary] = useState<SalesSummary>({
    completedTransactions: 0,
    completedRevenue: 0,
    cashRevenue: 0,
    currentShiftTransactions: 0,
    currentShiftCashRevenue: 0,
  });
  const [activeTables, setActiveTables] = useState<ActiveTable[]>([]);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [checkInMode, setCheckInMode] = useState<CheckInMode>("EVENT");
  const [checkInToken, setCheckInToken] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const memberSearchRequestRef = useRef(0);

  useEffect(() => {
    if (!isCameraActive) return;
    const scanner = new Html5Qrcode("kasir-qr-reader");
    let disposed = false;
    let cleanupPromise: Promise<void> | null = null;
    scannerRef.current = scanner;

    const stopAndClearScanner = () => {
      if (!cleanupPromise) {
        cleanupPromise = (async () => {
          if (scanner.isScanning) {
            await scanner.stop();
          }
          scanner.clear();
        })();
      }
      return cleanupPromise;
    };

    const startPromise = scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 230, height: 230 } },
      (decodedText) => {
        setCheckInToken(decodedText);
        setIsCameraActive(false);
      },
      () => undefined,
    );
    void startPromise
      .then(() => {
        if (disposed) {
          return stopAndClearScanner();
        }
      })
      .catch(() => {
        if (disposed) return;
        setIsCameraActive(false);
        setNotice({
          type: "error",
          text: "Kamera tidak dapat diakses. Gunakan input kode QR.",
        });
      });
    return () => {
      disposed = true;
      void startPromise
        .then(stopAndClearScanner, () => {
          scanner.clear();
        })
        .catch(() => undefined);
      scannerRef.current = null;
    };
  }, [isCameraActive]);

  useEffect(() => {
    Promise.all([
      fetch("/api/cashier/products?limit=50", { cache: "no-store" }).then(
        (res) => res.json(),
      ),
      fetch("/api/cashier/playpasses", { cache: "no-store" }).then((res) =>
        res.json(),
      ),
      fetch("/api/cashier/table-fees/packages", { cache: "no-store" }).then(
        (res) => res.json(),
      ),
      fetch("/api/cashier/shifts", { cache: "no-store" }).then((res) =>
        res.json(),
      ),
      fetch("/api/cashier/sales?limit=100", { cache: "no-store" }).then((res) =>
        res.json(),
      ),
      fetch("/api/cashier/table-fees", { cache: "no-store" }).then((res) =>
        res.json(),
      ),
    ])
      .then(
        ([
          productData,
          playpassData,
          tableFeeData,
          shiftData,
          salesData,
          tableData,
        ]) => {
          setProducts(productData.products ?? []);
          setPlaypasses(Array.isArray(playpassData) ? playpassData : []);
          setTableFees(Array.isArray(tableFeeData) ? tableFeeData : []);
          setShift(shiftData.shift ?? null);
          setSales(Array.isArray(salesData.sales) ? salesData.sales : []);
          setSalesSummary({
            completedTransactions:
              salesData.summary?.completedTransactions ?? 0,
            completedRevenue: salesData.summary?.completedRevenue ?? 0,
            cashRevenue: salesData.summary?.cashRevenue ?? 0,
            currentShiftTransactions:
              salesData.summary?.currentShiftTransactions ?? 0,
            currentShiftCashRevenue:
              salesData.summary?.currentShiftCashRevenue ?? 0,
          });
          setActiveTables(
            Array.isArray(tableData.sessions) ? tableData.sessions : [],
          );
        },
      )
      .catch(() =>
        setNotice({ type: "error", text: "Katalog POS gagal dimuat." }),
      )
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const requestId = ++memberSearchRequestRef.current;
    const value = memberQuery.trim();
    if (value.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMembers([]);
      setIsSearchingMembers(false);
      return;
    }
    setIsSearchingMembers(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/cashier/members?search=${encodeURIComponent(value)}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error ?? "Gagal mencari member.");
          if (requestId === memberSearchRequestRef.current) {
            setMembers(Array.isArray(data.members) ? data.members : []);
          }
        })
        .catch((error: unknown) => {
          if (error instanceof Error && error.name === "AbortError") return;
          if (requestId === memberSearchRequestRef.current) {
            setMembers([]);
            setNotice({
              type: "error",
              text:
                error instanceof Error
                  ? error.message
                  : "Gagal mencari member.",
            });
          }
        })
        .finally(() => {
          if (requestId === memberSearchRequestRef.current) {
            setIsSearchingMembers(false);
          }
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [memberQuery]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );
  const selectedVoucher = member?.vouchers?.find(
    (item) => item.id === selectedVoucherId,
  );
  const voucherDiscount = selectedVoucher
    ? Math.min(selectedVoucher.voucher.discountAmount, subtotal)
    : 0;
  const total = subtotal - voucherDiscount;
  const paid = parseAmount(paidAmount);
  const change = Math.max(0, paid - total);

  const catalog =
    tab === "PRODUCT" ? products : tab === "PLAYPASS" ? playpasses : tableFees;
  const sortedCatalog =
    tab === "PRODUCT"
      ? [...catalog].sort((left, right) => {
          const leftAvailable = "stock" in left && left.stock > 0;
          const rightAvailable = "stock" in right && right.stock > 0;
          return Number(rightAvailable) - Number(leftAvailable);
        })
      : catalog;
  const filteredCatalog = sortedCatalog.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase()),
  );
  const catalogPageSize = 6;
  const catalogPageCount = Math.max(
    1,
    Math.ceil(filteredCatalog.length / catalogPageSize),
  );
  const visibleCatalog = filteredCatalog.slice(
    (Math.min(catalogPage, catalogPageCount) - 1) * catalogPageSize,
    Math.min(catalogPage, catalogPageCount) * catalogPageSize,
  );
  const filteredSales = sales.filter((sale) =>
    sale.transactionNumber
      .toLowerCase()
      .includes(salesQuery.trim().toLowerCase()),
  );
  const salesPageSize = 10;
  const salesPageCount = Math.max(
    1,
    Math.ceil(filteredSales.length / salesPageSize),
  );
  const visibleSales = filteredSales.slice(
    (Math.min(salesPage, salesPageCount) - 1) * salesPageSize,
    Math.min(salesPage, salesPageCount) * salesPageSize,
  );

  async function refreshActiveTables() {
    const response = await fetch("/api/cashier/table-fees", {
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "Gagal memuat sesi meja.");
    setActiveTables(Array.isArray(data.sessions) ? data.sessions : []);
  }

  function addItem(item: Product | PackageItem) {
    const type = tab;
    const key = `${type}-${item.id}`;
    if (type === "PRODUCT") {
      const product = products.find((entry) => entry.id === item.id);
      const quantityInCart =
        cart.find((line) => line.key === key)?.quantity ?? 0;
      if (!product || quantityInCart >= product.stock) {
        setNotice({
          type: "error",
          text: "Stok produk di Marica Store tidak mencukupi.",
        });
        return;
      }
    }
    if (type === "TABLE_FEE") {
      setCart((current) => [
        ...current,
        {
          key: `${key}-${Date.now()}`,
          type,
          itemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          tableNumber,
        },
      ]);
      return;
    }
    setCart((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing)
        return current.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + 1 } : line,
        );
      return [
        ...current,
        {
          key,
          type,
          itemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        },
      ];
    });
  }

  function updateQuantity(key: string, delta: number) {
    const line = cart.find((item) => item.key === key);
    if (line?.type === "PRODUCT" && delta > 0) {
      const product = products.find((item) => item.id === line.itemId);
      if (product && line.quantity + delta > product.stock) {
        setNotice({
          type: "error",
          text: "Jumlah melebihi stok produk di Marica Store.",
        });
        return;
      }
    }
    setCart((current) =>
      current.flatMap((item) =>
        item.key !== key
          ? item
          : item.quantity + delta > 0
            ? [{ ...item, quantity: item.quantity + delta }]
            : [],
      ),
    );
  }

  async function openShift(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/cashier/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingCash: parseAmount(openingCash) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setNotice({ type: "error", text: data.error ?? "Shift gagal dibuka." });
      return;
    }
    setShift(data);
    setOpeningCash("");
    setNotice({ type: "success", text: "Shift berhasil dibuka." });
  }

  async function submitSale(event: React.FormEvent) {
    event.preventDefault();
    if (!shift) {
      setNotice({ type: "error", text: "Buka shift terlebih dahulu." });
      return;
    }
    if (cart.length === 0) {
      setNotice({ type: "error", text: "Tambahkan item ke keranjang." });
      return;
    }
    if (
      cart.some(
        (item) => item.type === "TABLE_FEE" && !item.tableNumber?.trim(),
      )
    ) {
      setNotice({
        type: "error",
        text: "Masukkan nomor meja untuk Table Fee.",
      });
      return;
    }
    const includesTableFee = cart.some((item) => item.type === "TABLE_FEE");
    setIsSubmitting(true);
    setNotice(null);
    const res = await fetch("/api/cashier/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: member?.id,
        userVoucherId: selectedVoucherId ?? undefined,
        paymentMethod,
        paidAmount: paid,
        items: cart.map((item) => ({
          type: item.type,
          productId: item.type === "PRODUCT" ? item.itemId : undefined,
          packageId: item.type !== "PRODUCT" ? item.itemId : undefined,
          tableNumber: item.tableNumber,
          quantity: item.quantity,
        })),
      }),
    });
    const data = await res.json();
    setIsSubmitting(false);
    if (!res.ok) {
      setNotice({
        type: "error",
        text: data.error ?? "Transaksi gagal disimpan.",
      });
      return;
    }
    const soldQuantities = new Map<string, number>();
    for (const item of data.items ?? []) {
      if (item.type === "PRODUCT" && item.productId) {
        soldQuantities.set(
          item.productId,
          (soldQuantities.get(item.productId) ?? 0) + item.quantity,
        );
      }
    }
    setProducts((current) =>
      current.map((product) => ({
        ...product,
        stock: Math.max(
          0,
          product.stock - (soldQuantities.get(product.id) ?? 0),
        ),
      })),
    );
    setCart([]);
    setPaidAmount("");
    setMember(null);
    setSelectedVoucherId(null);
    setMemberQuery("");
    setLastSaleId(data.id ?? null);
    setSales((current) => [data, ...current]);
    setSalesPage(1);
    setSalesSummary((current) => ({
      completedTransactions: current.completedTransactions + 1,
      completedRevenue: current.completedRevenue + (data.total ?? total),
      cashRevenue:
        current.cashRevenue +
        (paymentMethod === "CASH" ? (data.total ?? total) : 0),
      currentShiftTransactions: current.currentShiftTransactions + 1,
      currentShiftCashRevenue:
        current.currentShiftCashRevenue +
        (paymentMethod === "CASH" ? (data.total ?? total) : 0),
    }));
    if (includesTableFee) {
      void refreshActiveTables().catch(() => undefined);
    }
    setNotice({
      type: "success",
      text: `Transaksi ${data.transactionNumber} berhasil dibuat.`,
    });
  }

  async function updateTableSession(id: string, action: "complete" | "cancel") {
    if (
      action === "cancel" &&
      !window.confirm("Batalkan sesi Table Fee ini?")
    ) {
      return;
    }
    setIsUpdatingTable(id);
    try {
      const response = await fetch(`/api/cashier/table-fees/${id}/${action}`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error ?? "Sesi meja gagal diperbarui.");
      await refreshActiveTables();
      setNotice({
        type: "success",
        text:
          action === "complete"
            ? "Sesi meja berhasil diselesaikan."
            : "Sesi meja berhasil dibatalkan.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Sesi meja gagal diperbarui.",
      });
    } finally {
      setIsUpdatingTable(null);
    }
  }

  async function closeShift(event: React.FormEvent) {
    event.preventDefault();
    if (!shift) return;
    setIsClosing(true);
    const res = await fetch(`/api/cashier/shifts/${shift.id}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closingCash: parseAmount(closingCash) }),
    });
    const data = await res.json();
    setIsClosing(false);
    if (!res.ok) {
      setNotice({ type: "error", text: data.error ?? "Shift gagal ditutup." });
      return;
    }
    setShift(null);
    setClosingCash("");
    setNotice({
      type: "success",
      text: `Shift ditutup. Selisih kas ${money(data.difference ?? 0)}.`,
    });
  }

  async function voidSale(sale: Sale) {
    if (!window.confirm(`Void transaksi ${sale.transactionNumber}?`)) return;
    setIsVoiding(sale.id);
    const res = await fetch(`/api/cashier/sales/${sale.id}/void`, {
      method: "POST",
    });
    const data = await res.json();
    setIsVoiding(null);
    if (!res.ok) {
      setNotice({
        type: "error",
        text: data.error ?? "Transaksi gagal di-void.",
      });
      return;
    }
    const returnedQuantities = new Map<string, number>();
    for (const item of sale.items) {
      if (item.type === "PRODUCT" && item.productId) {
        returnedQuantities.set(
          item.productId,
          (returnedQuantities.get(item.productId) ?? 0) + item.quantity,
        );
      }
    }
    setProducts((current) =>
      current.map((product) => ({
        ...product,
        stock: product.stock + (returnedQuantities.get(product.id) ?? 0),
      })),
    );
    setSales((current) =>
      current.map((item) =>
        item.id === sale.id ? { ...item, status: "VOIDED" } : item,
      ),
    );
    setSalesPage(1);
    setSalesSummary((current) => ({
      completedTransactions: Math.max(0, current.completedTransactions - 1),
      completedRevenue: Math.max(0, current.completedRevenue - sale.total),
      cashRevenue: Math.max(
        0,
        current.cashRevenue - (sale.paymentMethod === "CASH" ? sale.total : 0),
      ),
      currentShiftTransactions: Math.max(
        0,
        current.currentShiftTransactions - 1,
      ),
      currentShiftCashRevenue: Math.max(
        0,
        current.currentShiftCashRevenue -
          (sale.paymentMethod === "CASH" ? sale.total : 0),
      ),
    }));
    setNotice({
      type: "success",
      text: `Transaksi ${sale.transactionNumber} berhasil di-void.`,
    });
  }

  async function printReceipt(saleId: string) {
    const res = await fetch(`/api/cashier/sales/${saleId}/receipt`, {
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setNotice({ type: "error", text: data.error ?? "Struk gagal dimuat." });
      return;
    }
    const popup = window.open("", "_blank", "width=420,height=720");
    if (!popup) {
      setNotice({
        type: "error",
        text: "Izinkan pop-up browser untuk mencetak struk.",
      });
      return;
    }

    const voucher = data.voucher as
      | { code: string; title: string; discountAmount: number }
      | null
      | undefined;
    const itemRows = (
      data.items as Array<{
        name: string;
        quantity: number;
        price: number;
        subtotal: number;
      }>
    )
      .map(
        (item) => `<tr>
          <td>
            <div class="item-name">${escapeHtml(item.name)}</div>
            <div class="item-meta">${item.quantity} x ${escapeHtml(money(item.price))}</div>
          </td>
          <td class="amount">${escapeHtml(money(item.subtotal))}</td>
        </tr>`,
      )
      .join("");
    const voucherDetails = voucher
      ? `<section class="voucher-box">
          <div class="section-label">Voucher digunakan</div>
          <div class="voucher-title">${escapeHtml(voucher.title)}</div>
          <div class="voucher-code">Kode: <strong>${escapeHtml(voucher.code)}</strong></div>
          <div class="voucher-row"><span>Nilai voucher</span><span>${escapeHtml(money(voucher.discountAmount))}</span></div>
          <div class="voucher-row applied"><span>Potongan diterapkan</span><span>-${escapeHtml(money(data.discountAmount ?? 0))}</span></div>
        </section>`
      : "";
    const paymentLabel = data.paymentMethod === "QRIS" ? "QRIS" : "Tunai";
    const statusLabel =
      data.status === "VOIDED" ? "DIBATALKAN / VOID" : "LUNAS";

    popup.document.write(
      `<html><head><meta charset="utf-8"><title>${escapeHtml(data.transactionNumber)}</title><style>
        @page{size:80mm auto;margin:5mm}
        *{box-sizing:border-box}
        body{width:70mm;margin:0 auto;color:#202124;font:12px Arial,sans-serif;line-height:1.4}
        .header{text-align:center;border-bottom:1px dashed #999;padding-bottom:12px}
        h1{margin:0;font-size:22px;letter-spacing:.04em}
        .subtitle{margin:3px 0 0;color:#666;font-size:11px}
        .meta{padding:10px 0;border-bottom:1px dashed #999;color:#444;font-size:11px}
        .meta-row{display:flex;justify-content:space-between;gap:12px;margin:3px 0}
        .meta-row span:first-child{color:#777}
        .meta-row span:last-child{text-align:right;font-weight:600}
        table{width:100%;border-collapse:collapse;margin:10px 0}
        th{padding:0 0 5px;border-bottom:1px solid #333;text-align:left;font-size:10px;text-transform:uppercase;color:#666}
        th:last-child{text-align:right}
        td{padding:7px 0;border-bottom:1px solid #eee;vertical-align:top}
        td.amount{text-align:right;white-space:nowrap;padding-left:8px}
        .item-name{font-weight:600}
        .item-meta{margin-top:2px;color:#777;font-size:10px}
        .voucher-box{margin:12px 0;padding:9px;border:1px solid #e4b34c;border-radius:6px;background:#fff9e8}
        .section-label{margin-bottom:4px;color:#8a5a00;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
        .voucher-title{font-weight:700}
        .voucher-code{margin:3px 0 7px;color:#555;font-size:10px}
        .voucher-row{display:flex;justify-content:space-between;gap:8px;font-size:10px}
        .voucher-row.applied{margin-top:3px;color:#13803d;font-weight:700}
        .summary{border-top:1px solid #333;padding-top:8px}
        .summary-row{display:flex;justify-content:space-between;gap:12px;margin:4px 0}
        .summary-row.discount{color:#13803d}
        .summary-row.total{margin-top:8px;padding-top:7px;border-top:1px dashed #999;font-size:16px;font-weight:700}
        .payment{margin-top:10px;padding-top:8px;border-top:1px dashed #999}
        .status{text-align:center;margin:12px 0 0;font-weight:700;letter-spacing:.08em}
        .footer{margin-top:14px;padding-top:10px;border-top:1px dashed #999;text-align:center;color:#777;font-size:10px}
        @media print{body{width:auto}.no-print{display:none}}
      </style></head><body>
        <header class="header"><h1>${escapeHtml(data.title)}</h1><p class="subtitle">STRUK PEMBAYARAN</p></header>
        <section class="meta">
          <div class="meta-row"><span>No. transaksi</span><span>${escapeHtml(data.transactionNumber)}</span></div>
          <div class="meta-row"><span>Tanggal</span><span>${escapeHtml(new Date(data.date).toLocaleString("id-ID"))}</span></div>
          <div class="meta-row"><span>Kasir</span><span>${escapeHtml(data.cashierName)}</span></div>
          <div class="meta-row"><span>Member</span><span>${escapeHtml(data.customerName)}</span></div>
        </section>
        <table><thead><tr><th>Item</th><th>Total</th></tr></thead><tbody>${itemRows}</tbody></table>
        ${voucherDetails}
        <section class="summary">
          <div class="summary-row"><span>Subtotal</span><span>${escapeHtml(money(data.subtotal))}</span></div>
          ${data.discountAmount > 0 ? `<div class="summary-row discount"><span>Potongan voucher</span><span>-${escapeHtml(money(data.discountAmount))}</span></div>` : ""}
          <div class="summary-row total"><span>Total</span><span>${escapeHtml(money(data.total))}</span></div>
        </section>
        <section class="payment">
          <div class="summary-row"><span>Metode pembayaran</span><span>${escapeHtml(paymentLabel)}</span></div>
          <div class="summary-row"><span>Dibayar</span><span>${escapeHtml(money(data.paidAmount))}</span></div>
          <div class="summary-row"><span>Kembalian</span><span>${escapeHtml(money(data.changeAmount))}</span></div>
        </section>
        <div class="status">${escapeHtml(statusLabel)}</div>
        <footer class="footer">Terima kasih sudah berbelanja di Marica.id</footer>
        <script>window.print();</script>
      </body></html>`,
    );
    popup.document.close();
  }

  async function submitCheckIn(event: React.FormEvent) {
    event.preventDefault();
    const token = checkInToken.trim();
    if (!token) return;
    const endpoint =
      checkInMode === "EVENT"
        ? "/api/event-tickets/check-in"
        : checkInMode === "PLAYPASS"
          ? "/api/cashier/playpasses/check-in"
          : "/api/cashier/table-reservations/check-in";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrToken: token }),
    });
    const data = await res.json();
    setNotice({
      type: res.ok ? "success" : "error",
      text: res.ok
        ? `${data.message ?? "Check-in berhasil"}${data.ticket?.participantName ? `: ${data.ticket.participantName}` : data.ticket?.ticketNumber ? `: ${data.ticket.ticketNumber}` : ""}`
        : (data.error ?? "Check-in gagal"),
    });
    if (res.ok) setCheckInToken("");
  }

  return (
    <div className="mx-auto min-h-full max-w-[1600px] pb-8">
      <header className="mb-4 flex flex-col gap-3 rounded-[1.75rem] border border-marica-amber/25 bg-white/80 p-4 shadow-[0_12px_30px_rgba(120,60,10,0.06)] backdrop-blur sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-body text-[10px] font-bold uppercase tracking-[0.2em] text-marica-amber-text">
            Marica · Point of Sale
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-marica-ink sm:text-3xl">
            Kasir Marica
          </h1>
          <p className="mt-1 font-body text-xs text-marica-ink-soft sm:text-sm">
            Kelola transaksi produk, aktivitas, dan akses pengunjung.
          </p>
        </div>
        <div
          className={`flex items-center gap-3 self-start rounded-2xl border px-4 py-2.5 lg:self-auto ${shift ? "border-marica-green/30 bg-marica-green/10" : "border-marica-rose-deep/20 bg-marica-rose-deep/5"}`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${shift ? "bg-marica-green" : "bg-marica-rose-deep"}`}
          />
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-marica-ink-soft">
              Status shift
            </p>
            <p className="font-body text-sm font-bold text-marica-ink">
              {shift
                ? `Aktif sejak ${new Date(shift.openedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
                : "Belum dibuka"}
            </p>
          </div>
        </div>
      </header>

      {notice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-marica-ink/35 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-live="assertive"
        >
          <div className="w-full max-w-sm rounded-3xl border border-black/5 bg-white p-6 text-center shadow-[0_24px_80px_rgba(28,27,27,0.22)]">
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${notice.type === "error" ? "bg-marica-rose-deep/10 text-marica-rose-deep" : "bg-marica-green/10 text-green-700"}`}
            >
              {notice.type === "error" ? (
                <AlertCircle className="h-7 w-7" />
              ) : (
                <CheckCircle2 className="h-7 w-7" />
              )}
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold text-marica-ink">
              {notice.type === "error" ? "Ada masalah" : "Berhasil"}
            </h2>
            <p className="mt-2 font-body text-sm leading-relaxed text-marica-ink-soft">
              {notice.text}
            </p>
            {notice.type === "success" && lastSaleId && (
              <button
                type="button"
                onClick={() => void printReceipt(lastSaleId)}
                className="mt-5 w-full rounded-xl border border-marica-amber-dark py-3 font-body text-sm font-bold text-marica-amber-text"
              >
                Cetak struk
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setNotice(null);
                setLastSaleId(null);
              }}
              className={`mt-3 w-full rounded-xl py-3 font-body text-sm font-bold text-white ${notice.type === "error" ? "bg-marica-rose-deep hover:brightness-105" : "bg-marica-amber-dark hover:brightness-105"}`}
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {!shift ? (
        <form
          onSubmit={openShift}
          className="mb-4 flex flex-col gap-3 rounded-2xl border border-marica-amber/30 bg-linear-to-r from-marica-amber/20 via-white to-marica-rose/15 p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="font-body text-xs font-bold uppercase tracking-[0.16em] text-marica-amber-text">
              Mulai operasional
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-marica-ink">
              Buka shift kasir
            </h2>
            <p className="mt-1 font-body text-sm text-marica-ink-soft">
              Masukkan uang modal/kembalian yang disiapkan di laci.
            </p>
            <details className="group relative mt-2 max-w-lg text-sm">
              <summary className="w-fit cursor-pointer list-none font-body text-xs font-semibold text-marica-amber-text underline decoration-dotted underline-offset-4">
                Panduan kas awal
              </summary>
              <div className="absolute left-0 top-full z-20 mt-2 w-[min(20rem,calc(100vw-3rem))] rounded-2xl border border-marica-amber/30 bg-white p-4 text-left shadow-xl">
                <p className="font-body text-xs leading-relaxed text-marica-ink-soft">
                  Kas awal adalah uang tunai modal di laci untuk membantu
                  memberi kembalian. Masukkan jumlah uang yang benar-benar
                  disiapkan, misalnya Rp200.000. Kas awal Rp0 tetap
                  diperbolehkan, tetapi siapkan uang pecahan atau minta
                  pembayaran pas/non-tunai jika belum ada uang untuk
                  kembalian.
                </p>
              </div>
            </details>
          </div>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="opening-cash">
              Kas awal
            </label>
            <input
              id="opening-cash"
              required
              min="0"
              inputMode="numeric"
              type="text"
              value={openingCash}
              onChange={(event) =>
                setOpeningCash(formatAmountInput(event.target.value))
              }
              placeholder="Kas awal"
              className="w-36 rounded-xl border border-black/10 bg-white px-3 py-3 font-body text-sm outline-none focus:border-marica-amber-dark focus:ring-4 focus:ring-marica-amber/15"
            />
            <button className="rounded-xl bg-marica-amber-dark px-5 py-3 font-body text-sm font-bold text-white shadow-sm transition hover:brightness-105">
              Buka shift
            </button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={closeShift}
          className="mb-4 flex flex-col gap-3 rounded-2xl border border-marica-green/25 bg-marica-green/10 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <p className="font-body text-xs font-bold uppercase tracking-[0.16em] text-green-700">
              Shift aktif
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-marica-ink">
              Kas awal {money(shift.openingCash)}
            </h2>
            <p className="mt-1 font-body text-sm text-marica-ink-soft">
              Dibuka {new Date(shift.openedAt).toLocaleString("id-ID")}. Tutup
              shift setelah kas dihitung.
            </p>
            <details className="group relative mt-2 max-w-lg text-sm">
              <summary className="w-fit cursor-pointer list-none font-body text-xs font-semibold text-green-700 underline decoration-dotted underline-offset-4">
                Panduan kas akhir
              </summary>
              <div className="absolute left-0 top-full z-20 mt-2 w-[min(20rem,calc(100vw-3rem))] rounded-2xl border border-marica-green/25 bg-white p-4 text-left shadow-xl">
                <p className="font-body text-xs leading-relaxed text-marica-ink-soft">
                  Hitung uang tunai fisik di laci, lalu masukkan jumlah
                  sebenarnya. Perkiraan sistem = kas awal + penjualan tunai
                  (transaksi QRIS/kartu tidak dihitung). Contoh: kas awal
                  Rp200.000 dan penjualan tunai Rp150.000 berarti perkiraan
                  kas akhir Rp350.000. Selisih menunjukkan perbedaan hitungan
                  fisik dengan perkiraan.
                </p>
              </div>
            </details>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="closing-cash">
              Kas akhir
            </label>
            <input
              id="closing-cash"
              required
              min="0"
              inputMode="numeric"
              type="text"
              value={closingCash}
              onChange={(event) =>
                setClosingCash(formatAmountInput(event.target.value))
              }
              placeholder="Kas akhir"
              className="w-36 rounded-xl border border-black/10 bg-white px-3 py-3 font-body text-sm outline-none focus:border-marica-green focus:ring-4 focus:ring-marica-green/15"
            />
            <button
              disabled={isClosing}
              className="rounded-xl bg-marica-ink px-5 py-3 font-body text-sm font-bold text-white shadow-sm transition hover:bg-black/80"
            >
              {isClosing ? "Menutup..." : "Akhiri shift"}
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <section
          id="kasir-transaksi"
          className="min-w-0 rounded-[1.75rem] border border-marica-amber/20 bg-white/85 p-4 shadow-[0_12px_30px_rgba(120,60,10,0.06)] sm:p-5"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-body text-[10px] font-bold uppercase tracking-[0.16em] text-marica-amber-text">
                Katalog penjualan
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold text-marica-ink sm:text-2xl">
                Pilih item
              </h2>
            </div>
            <div className="relative w-full md:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-marica-ink-soft/60" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCatalogPage(1);
                }}
                placeholder="Cari produk atau paket..."
                className="w-full rounded-xl border border-marica-amber/25 bg-marica-cream/35 py-2.5 pl-9 pr-3 font-body text-sm outline-none transition focus:border-marica-amber-dark focus:bg-white focus:ring-4 focus:ring-marica-amber/15"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-1 overflow-x-auto rounded-2xl bg-marica-cream/70 p-1">
            {(
              [
                ["PRODUCT", "Produk", Package],
                ["PLAYPASS", "Playpass", Ticket],
                ["TABLE_FEE", "Table Fee", LayoutGrid],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setTab(value);
                  setCatalogPage(1);
                }}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 font-body text-xs font-bold transition sm:text-sm ${tab === value ? "bg-marica-amber-dark text-white shadow-sm" : "text-marica-ink-soft hover:bg-white/80"}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
          {tab === "TABLE_FEE" && (
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-marica-amber/10 p-3">
              <LayoutGrid className="h-5 w-5 text-marica-amber-text" />
              <label
                className="flex-1 font-body text-sm font-semibold text-marica-ink"
                htmlFor="table-number"
              >
                Nomor meja
              </label>
              <input
                id="table-number"
                value={tableNumber}
                onChange={(event) => {
                  const value = event.target.value;
                  setTableNumber(value);
                  setCart((current) =>
                    current.map((item) =>
                      item.type === "TABLE_FEE"
                        ? { ...item, tableNumber: value }
                        : item,
                    ),
                  );
                }}
                placeholder="A01"
                className="w-28 rounded-lg border border-marica-amber/30 bg-white px-3 py-2 font-body text-sm outline-none focus:border-marica-amber-dark"
              />
            </div>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {isLoading ? (
              <p className="col-span-full py-12 text-center font-body text-sm text-marica-ink-soft">
                Memuat katalog...
              </p>
            ) : (
              visibleCatalog.map((item) => {
                const imageUrl =
                  tab === "PRODUCT" && "images" in item
                    ? normalizeProductImageUrl(item.images?.[0]?.url)
                    : null;

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={
                      "stock" in item && (item.stock <= 0 || !item.isActive)
                    }
                    onClick={() => addItem(item)}
                    className="group overflow-hidden rounded-2xl border border-marica-amber/15 bg-white text-left transition hover:-translate-y-0.5 hover:border-marica-amber/60 hover:shadow-[0_10px_24px_rgba(120,60,10,0.1)] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <div className="relative flex h-32 items-center justify-center overflow-hidden bg-linear-to-br from-marica-cream via-white to-marica-amber/10 p-3 sm:h-36">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                            event.currentTarget.nextElementSibling?.classList.remove(
                              "hidden",
                            );
                          }}
                          className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <span className="flex h-full w-full flex-col items-center justify-center rounded-2xl bg-linear-to-br from-marica-amber/15 via-marica-cream to-marica-rose/20 px-4 text-center text-marica-amber-text">
                          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 font-display text-3xl font-semibold shadow-sm">
                            {item.name.trim().charAt(0).toUpperCase()}
                          </span>
                          <span className="mt-3 line-clamp-2 font-display text-sm font-semibold uppercase tracking-wide">
                            {item.name}
                          </span>
                        </span>
                      )}
                      {imageUrl && (
                        <span className="hidden h-full w-full flex-col items-center justify-center rounded-2xl bg-linear-to-br from-marica-amber/15 via-marica-cream to-marica-rose/20 px-4 text-center text-marica-amber-text">
                          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 font-display text-3xl font-semibold shadow-sm">
                            {item.name.trim().charAt(0).toUpperCase()}
                          </span>
                          <span className="mt-3 line-clamp-2 font-display text-sm font-semibold uppercase tracking-wide">
                            {item.name}
                          </span>
                        </span>
                      )}
                      <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-marica-amber-text shadow-sm">
                        <Plus className="h-4 w-4 transition group-hover:scale-110" />
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 min-h-10 font-body text-sm font-bold text-marica-ink">
                        {item.name}
                      </p>
                      <p className="mt-1 font-display text-base font-semibold text-marica-amber-text">
                        {money(item.price)}
                      </p>
                      {"stock" in item && (
                        <p className="mt-1 font-body text-xs text-marica-ink-soft">
                          {item.stock > 0 ? `Tersedia ${item.stock} stok` : "Stok habis"}
                        </p>
                      )}
                      {"durationMinutes" in item && (
                        <p className="mt-1 font-body text-xs text-marica-ink-soft">
                          {item.durationMinutes} menit
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          {!isLoading && catalogPageCount > 1 && (
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setCatalogPage((page) => Math.max(1, page - 1))}
                disabled={catalogPage === 1}
                aria-label="Produk sebelumnya"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-marica-ink-soft disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from(
                { length: catalogPageCount },
                (_, index) => index + 1,
              ).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCatalogPage(page)}
                  className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-3 font-body text-sm font-bold transition ${catalogPage === page ? "bg-marica-amber-dark text-white" : "border border-black/10 text-marica-ink-soft hover:bg-marica-amber/10"}`}
                  aria-label={`Halaman katalog ${page}`}
                  aria-current={catalogPage === page ? "page" : undefined}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  setCatalogPage((page) => Math.min(catalogPageCount, page + 1))
                }
                disabled={catalogPage === catalogPageCount}
                aria-label="Produk berikutnya"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-marica-ink-soft disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>

        <aside className="flex min-h-[36rem] flex-col rounded-[1.75rem] border border-marica-amber/25 bg-white shadow-[0_16px_40px_rgba(120,60,10,0.1)] xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem)]">
          <div className="border-b border-marica-amber/15 bg-linear-to-br from-marica-amber/20 via-marica-cream/80 to-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-body text-xs font-bold uppercase tracking-[0.14em] text-marica-amber-text">
                  Pesanan aktif
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold text-marica-ink">
                  Ringkasan pesanan
                </h2>
              </div>
              <span className="rounded-full bg-white/80 px-2.5 py-1 font-body text-xs font-bold text-marica-amber-text shadow-sm">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} item
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            <div className="space-y-2.5">
              {cart.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-marica-amber/25 bg-marica-cream/25 py-10 text-center">
                  <ShoppingCart className="mx-auto h-8 w-8 text-marica-ink-soft/25" />
                  <p className="mt-3 font-body text-sm text-marica-ink-soft">
                    Keranjang masih kosong
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-xl border border-marica-amber/15 bg-marica-cream/20 p-3"
                  >
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-body text-sm font-semibold text-marica-ink">
                          {item.name}
                        </p>
                        <p className="mt-1 font-body text-xs text-marica-ink-soft">
                          {money(item.price)}
                          {item.tableNumber
                            ? ` · Meja ${item.tableNumber}`
                            : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCart((current) =>
                            current.filter((line) => line.key !== item.key),
                          )
                        }
                        aria-label={`Hapus ${item.name}`}
                        className="text-marica-rose-deep"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.key, -1)}
                          aria-label="Kurangi jumlah"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-marica-amber/15 bg-white text-marica-ink-soft transition hover:bg-marica-amber/10"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-5 text-center font-body text-sm font-bold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.key, 1)}
                          aria-label="Tambah jumlah"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-marica-amber/15 bg-white text-marica-ink-soft transition hover:bg-marica-amber/10"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="font-body text-sm font-bold text-marica-ink">
                        {money(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 border-t border-marica-amber/15 pt-4">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-marica-amber-text" />
                <p className="font-body text-sm font-bold text-marica-ink">
                  Member
                </p>
                {member && (
                  <button
                    type="button"
                    onClick={() => {
                      setMember(null);
                      setSelectedVoucherId(null);
                      setMemberQuery("");
                    }}
                    className="ml-auto text-xs font-semibold text-marica-rose-deep"
                  >
                    Hapus
                  </button>
                )}
              </div>
              {member ? (
                <div className="mt-2 rounded-xl bg-marica-green/10 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-body text-sm font-bold text-marica-ink">
                        {member.name ?? member.email}
                      </p>
                      <p className="font-body text-xs text-green-700">
                        {member.pointsBalance.toLocaleString("id-ID")} poin
                      </p>
                    </div>
                    <Check className="h-5 w-5 text-green-700" />
                  </div>
                  {member.vouchers && member.vouchers.length > 0 && (
                    <div className="mt-3 border-t border-green-700/10 pt-3">
                      <p className="font-body text-[11px] font-bold uppercase tracking-wide text-green-800">
                        Voucher tersedia
                      </p>
                      {member.vouchers.map((voucher) => (
                        <button
                          type="button"
                          key={voucher.id}
                          onClick={() =>
                            setSelectedVoucherId((current) =>
                              current === voucher.id ? null : voucher.id,
                            )
                          }
                          className={`mt-1 flex w-full items-center justify-between rounded-lg px-2 py-1 text-left font-body text-xs text-green-800 ${selectedVoucherId === voucher.id ? "bg-white ring-2 ring-green-600/30" : "hover:bg-white/60"}`}
                        >
                          <span>
                            {selectedVoucherId === voucher.id ? "✓ " : ""}
                            {voucher.voucher.code} · {voucher.voucher.title}
                          </span>
                          <span>{money(voucher.voucher.discountAmount)}</span>
                        </button>
                      ))}
                      <p className="mt-2 font-body text-[10px] text-green-800/70">
                        Klik voucher untuk menerapkan diskon transaksi.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative mt-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-marica-ink-soft/50" />
                  <input
                    value={memberQuery}
                    onChange={(event) => setMemberQuery(event.target.value)}
                    placeholder="Cari nama, email, WhatsApp"
                    className="w-full rounded-xl border border-black/10 py-2.5 pl-9 pr-3 font-body text-xs outline-none focus:border-marica-amber-dark"
                  />
                  {isSearchingMembers && (
                    <div className="absolute inset-x-0 top-full z-10 mt-1 rounded-xl border border-black/5 bg-white px-3 py-2.5 font-body text-xs text-marica-ink-soft shadow-xl">
                      Mencari member...
                    </div>
                  )}
                  {!isSearchingMembers && members.length > 0 && (
                    <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-black/5 bg-white shadow-xl">
                      {members.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => {
                            setMember(item);
                            setSelectedVoucherId(null);
                            setMembers([]);
                            setMemberQuery("");
                          }}
                          className="flex w-full items-center justify-between border-b border-black/5 px-3 py-2.5 text-left last:border-0 hover:bg-marica-sky-light/50"
                        >
                          <span>
                            <span className="block font-body text-xs font-bold text-marica-ink">
                              {item.name ?? item.email}
                            </span>
                            <span className="block font-body text-[11px] text-marica-ink-soft">
                              {item.whatsapp ?? item.email}
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 text-marica-ink-soft/50" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {selectedVoucher && (
              <div className="mt-2 flex justify-between font-body text-sm text-green-700">
                <span>Diskon {selectedVoucher.voucher.code}</span>
                <span>-{money(voucherDiscount)}</span>
              </div>
            )}
          </div>
          <form
            onSubmit={submitSale}
            className="border-t border-marica-amber/15 bg-marica-cream/25 p-4 sm:p-5"
          >
            <div className="mb-3 flex items-end justify-between">
              <span className="font-body text-sm font-semibold text-marica-ink-soft">
                Total pembayaran
              </span>
              <strong className="font-display text-2xl text-marica-amber-text sm:text-3xl">
                {money(total)}
              </strong>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["CASH", "Tunai", Banknote],
                ["QRIS", "QRIS", QrCode],
              ] as const).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaymentMethod(value)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 font-body text-xs font-bold transition ${
                    paymentMethod === value
                      ? "border-marica-amber-dark bg-marica-amber/10 text-marica-amber-text"
                      : "border-black/10 bg-white text-marica-ink-soft"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
            <label
              className="mt-3 block font-body text-xs font-semibold text-marica-ink-soft"
              htmlFor="paid-amount"
            >
              Nominal dibayar
            </label>
            <input
              id="paid-amount"
              required
              min={total}
              inputMode="numeric"
              type="text"
              value={paidAmount}
              onChange={(event) =>
                setPaidAmount(formatAmountInput(event.target.value))
              }
              placeholder="Masukkan nominal pembayaran"
              className="mt-1 w-full rounded-xl border border-marica-amber/50 px-3 py-3 font-body text-base font-bold outline-none focus:ring-4 focus:ring-marica-amber/15"
            />
            <div className="mt-3 flex justify-between font-body text-sm">
              <span className="text-marica-ink-soft">Kembalian</span>
              <span className="font-bold text-marica-green">
                {money(change)}
              </span>
            </div>
            <button
              disabled={isSubmitting || !shift || cart.length === 0}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-marica-amber-dark py-3.5 font-body text-sm font-bold text-white shadow-[0_8px_18px_rgba(222,143,12,0.25)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isSubmitting ? (
                "Memproses..."
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Selesaikan pembayaran
                </>
              )}
            </button>
          </form>
        </aside>
      </div>

      <section
        id="kasir-checkin"
        className="mt-6 rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-body text-xs font-bold uppercase tracking-[0.14em] text-marica-amber-text">
              Validasi akses
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-marica-ink">
              Check-in QR
            </h2>
            <p className="mt-1 font-body text-sm text-marica-ink-soft">
              Scan tiket workshop atau Playpass sebelum pengunjung masuk.
            </p>
          </div>
          <div className="flex gap-2">
            {(
              [
                ["EVENT", "Event / Workshop"],
                ["PLAYPASS", "Playpass"],
                ["TABLE_RESERVATION", "Reservasi meja"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setCheckInMode(value)}
                className={`rounded-xl px-3 py-2 font-body text-xs font-bold ${checkInMode === value ? "bg-marica-amber-dark text-white" : "bg-marica-sky-light/50 text-marica-ink-soft"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <form
          onSubmit={submitCheckIn}
          className="mt-5 flex flex-col gap-3 lg:flex-row"
        >
          <div className="flex flex-1 gap-2">
            <label className="sr-only" htmlFor="kasir-qr-token">
              Kode QR
            </label>
            <input
              id="kasir-qr-token"
              value={checkInToken}
              onChange={(event) => setCheckInToken(event.target.value)}
              placeholder="Scan atau masukkan kode QR"
              className="min-w-0 flex-1 rounded-xl border border-black/10 px-3 py-3 font-body text-sm outline-none focus:border-marica-amber-dark focus:ring-4 focus:ring-marica-amber/15"
            />
            <button
              type="submit"
              disabled={!checkInToken.trim()}
              className="rounded-xl bg-marica-amber-dark px-5 py-3 font-body text-sm font-bold text-white disabled:opacity-40"
            >
              Check-in
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsCameraActive((active) => !active)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-marica-amber-dark px-4 py-3 font-body text-sm font-bold text-marica-amber-text"
          >
            <QrCode className="h-4 w-4" />
            {isCameraActive ? "Tutup kamera" : "Buka kamera"}
          </button>
        </form>
        {isCameraActive && (
          <div
            id="kasir-qr-reader"
            className="mt-4 max-w-sm overflow-hidden rounded-2xl border border-black/10"
          />
        )}
      </section>

      <section
        id="kasir-meja"
        className="mt-6 rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-body text-xs font-bold uppercase tracking-[0.14em] text-marica-amber-text">
              Operasional area
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-marica-ink">
              Table Fee aktif
            </h2>
          </div>
          <span className="rounded-full bg-marica-amber/15 px-3 py-1 font-body text-xs font-bold text-marica-amber-text">
            {activeTables.length} meja
          </span>
        </div>
        {activeTables.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-black/10 py-8 text-center font-body text-sm text-marica-ink-soft">
            Belum ada sesi meja aktif.
          </p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeTables.map((table) => (
              <div
                key={table.id}
                className="rounded-2xl bg-marica-amber/10 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-display text-xl font-semibold text-marica-amber-text">
                    Meja {table.tableNumber}
                  </p>
                  <LayoutGrid className="h-5 w-5 text-marica-amber-text" />
                </div>
                <p className="mt-2 font-body text-sm font-semibold text-marica-ink">
                  {table.package.name}
                </p>
                <p className="mt-1 font-body text-xs text-marica-ink-soft">
                  Selesai{" "}
                  {new Date(table.endsAt).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={isUpdatingTable === table.id}
                    onClick={() =>
                      void updateTableSession(table.id, "complete")
                    }
                    className="flex-1 rounded-lg bg-marica-amber-dark px-3 py-2 font-body text-xs font-bold text-white transition hover:bg-marica-amber-text disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Selesaikan
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingTable === table.id}
                    onClick={() => void updateTableSession(table.id, "cancel")}
                    className="rounded-lg border border-marica-amber/30 px-3 py-2 font-body text-xs font-bold text-marica-amber-text transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {false && <section
        id="kasir-riwayat-transaksi"
        className="mt-6 rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-body text-xs font-bold uppercase tracking-[0.14em] text-marica-amber-text">
              Kontrol transaksi
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-marica-ink">
              Riwayat transaksi
            </h2>
          </div>
          <span className="rounded-full bg-marica-sky-light/60 px-3 py-1 font-body text-xs font-bold text-marica-ink-soft">
            {salesSummary.completedTransactions} transaksi selesai
          </span>
        </div>
        <div className="relative mt-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-marica-ink-soft/60" />
          <input
            value={salesQuery}
            onChange={(event) => {
              setSalesQuery(event.target.value);
              setSalesPage(1);
            }}
            placeholder="Cari kode transaksi..."
            className="w-full rounded-xl border border-black/10 bg-marica-sky-light/20 py-2.5 pl-9 pr-3 font-body text-sm outline-none focus:border-marica-amber-dark focus:ring-4 focus:ring-marica-amber/15"
          />
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-240 text-left">
            <thead>
              <tr className="border-b border-black/5 font-body text-xs uppercase tracking-wide text-marica-ink-soft/60">
                <th className="pb-3">Transaksi</th>
                <th className="pb-3">Yang dibeli</th>
                <th className="pb-3">Member</th>
                <th className="pb-3">Pembayaran</th>
                <th className="pb-3">Total</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visibleSales.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-10 text-center font-body text-sm text-marica-ink-soft"
                  >
                    Belum ada transaksi pada akun ini.
                  </td>
                </tr>
              ) : (
                visibleSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="border-b border-black/5 last:border-0"
                  >
                    <td className="py-4">
                      <p className="font-body text-sm font-bold text-marica-ink">
                        {sale.transactionNumber}
                      </p>
                      <p className="font-body text-xs text-marica-ink-soft">
                        {new Date(sale.createdAt).toLocaleString("id-ID")}
                      </p>
                    </td>
                    <td className="max-w-80 py-3">
                      <div className="space-y-1.5">
                        {sale.items.map((item, index) => (
                          <div
                            key={`${item.itemName}-${index}`}
                            className="flex items-center justify-between gap-4 rounded-lg bg-marica-sky-light/40 px-2.5 py-1.5 font-body text-xs"
                          >
                            <span className="min-w-0 truncate font-semibold text-marica-ink">
                              {item.itemName}
                            </span>
                            <span className="shrink-0 text-marica-ink-soft">
                              x{item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="min-w-52 py-3">
                      {sale.customer ? (
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-marica-amber/20 text-marica-amber-text">
                            <UserRound className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0 font-body text-xs">
                            <p className="truncate font-bold text-marica-ink">
                              {sale.customer.name ?? "Member Marica"}
                            </p>
                            <p className="truncate text-marica-ink-soft">
                              {sale.customer.email ?? sale.customer.whatsapp ?? "Akun member"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="font-body text-xs text-marica-ink-soft">
                          Non-member
                        </span>
                      )}
                    </td>
                    <td className="py-4 font-body text-sm text-marica-ink-soft">
                      {sale.paymentMethod}
                    </td>
                    <td className="py-4 font-body text-sm font-bold text-marica-ink">
                      {money(sale.total)}
                    </td>
                    <td className="py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 font-body text-xs font-bold ${sale.status === "VOIDED" ? "bg-marica-rose-deep/10 text-marica-rose-deep" : "bg-marica-green/10 text-green-700"}`}
                      >
                        {sale.status === "VOIDED" ? "Void" : "Selesai"}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void printReceipt(sale.id)}
                          title="Cetak struk"
                          aria-label="Cetak struk"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 text-marica-ink-soft hover:bg-marica-sky-light/50"
                        >
                          <ReceiptText className="h-4 w-4" />
                        </button>
                        {sale.status === "COMPLETED" && (
                          <button
                            type="button"
                            disabled={isVoiding === sale.id}
                            onClick={() => void voidSale(sale)}
                            className="rounded-lg border border-marica-rose-deep/30 px-2.5 py-1.5 font-body text-xs font-bold text-marica-rose-deep hover:bg-marica-rose-deep/10 disabled:opacity-50"
                          >
                            {isVoiding === sale.id ? "..." : "Void"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {salesPageCount > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setSalesPage((page) => Math.max(1, page - 1))}
              disabled={salesPage === 1}
              aria-label="Transaksi sebelumnya"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-marica-ink-soft disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from(
              { length: salesPageCount },
              (_, index) => index + 1,
            ).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setSalesPage(page)}
                aria-current={salesPage === page ? "page" : undefined}
                className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-3 font-body text-sm font-bold ${salesPage === page ? "bg-marica-amber-dark text-white" : "border border-black/10 text-marica-ink-soft"}`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                setSalesPage((page) => Math.min(salesPageCount, page + 1))
              }
              disabled={salesPage === salesPageCount}
              aria-label="Transaksi berikutnya"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-marica-ink-soft disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>}
    </div>
  );
}
