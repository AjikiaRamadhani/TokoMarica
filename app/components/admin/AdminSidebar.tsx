"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  Newspaper,
  ShoppingBag,
  Warehouse,
  FileDown,
  ClipboardList,
  CalendarDays,
  CalendarRange,
  BarChart3,
  TicketPercent,
  BriefcaseBusiness,
  Settings,
  Lock,
  Menu,
  X,
  LogOut,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  History,
  WalletCards,
  Sparkles,
} from "lucide-react";

// Struktur daftar navigasi utama
const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, enabled: true },
  {
    label: "Kasir",
    href: "/kasir",
    icon: ShoppingBag,
    enabled: true,
  },
  // Group Artikel dan submenu utilitas ditangani secara khusus di komponen Nav
  {
    label: "Produk",
    href: "/admin/belanja",
    icon: ShoppingBag,
    enabled: true,
  },
  {
    label: "Inventaris",
    href: "/admin/inventory",
    icon: Warehouse,
    enabled: true,
  },
  {
    label: "Pesanan",
    href: "/admin/pesanan",
    icon: ClipboardList,
    enabled: true,
  },
  {
    label: "Booking",
    href: "/admin/bookings",
    icon: CalendarRange,
    enabled: true,
  },
  {
    label: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    enabled: true,
  },
  {
    label: "Voucher",
    href: "/admin/vouchers",
    icon: TicketPercent,
    enabled: true,
  },
  {
    label: "B2B",
    href: "/admin/b2b",
    icon: BriefcaseBusiness,
    enabled: true,
  },
  {
    label: "Rilis Eksklusif",
    href: "/admin/preorders",
    icon: Sparkles,
    enabled: true,
  },
  {
    label: "Subscriptions",
    href: "/admin/subscriptions",
    icon: CalendarDays,
    enabled: true,
  },
  {
    label: "Pengaturan",
    href: "/admin/pengaturan",
    icon: Settings,
    enabled: true,
  },
];

function AccountMenu({
  name,
  email,
  onNavigate,
}: {
  name?: string | null;
  email?: string | null;
  onNavigate?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initial = (name ?? email ?? "A").trim().charAt(0).toUpperCase();

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className="relative border-t border-black/5 px-3 py-3"
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-full left-3 right-3 mb-2 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-xl"
          >
            <Link
              href="/"
              onClick={() => {
                setIsOpen(false);
                onNavigate?.();
              }}
              className="flex items-center gap-3 px-4 py-3 font-body text-sm font-medium text-marica-ink-soft transition-colors hover:bg-marica-sky-light/60 hover:text-marica-ink"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke situs
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-3 border-t border-black/5 px-4 py-3 font-body text-sm font-semibold text-marica-rose-deep transition-colors hover:bg-marica-rose-deep/10"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marica-amber/25 ${
          isOpen ? "bg-marica-sky-light/60" : "hover:bg-marica-sky-light/60"
        }`}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-marica-amber-dark font-body text-sm font-semibold text-white ring-2 ring-white"
        >
          {initial}
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-body text-sm font-semibold leading-tight text-marica-ink">
            {name ?? "Admin"}
          </p>
          <p className="truncate font-body text-xs leading-tight text-marica-ink-soft/70">
            {email}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-marica-ink-soft/50 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
    </div>
  );
}

function SidebarContent({
  name,
  email,
  role,
  onNavigate,
}: {
  name?: string | null;
  email?: string | null;
  role?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const [isArticlesExpanded, setIsArticlesExpanded] = useState(true);

  const isArtikelActive =
    pathname === "/admin/artikel" ||
    pathname.startsWith("/admin/artikel/") ||
    pathname === "/admin/kategori" ||
    pathname.startsWith("/admin/kategori/");
  const isPrintableActive =
    pathname === "/admin/printables" ||
    pathname.startsWith("/admin/printables/");
  const isEventActive =
    pathname === "/admin/event" || pathname.startsWith("/admin/event/");

  return (
    <>
      <div className="flex items-center gap-2 px-6 py-4 md:py-6">
        <Image
          src="/images/logo.png"
          alt="Marica"
          width={160}
          height={40}
          className="h-7 w-auto"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <span className="rounded-full bg-marica-ink px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wide text-white">
          {role === "KASIR" ? "Kasir" : "Admin"}
        </span>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-1">
        {/* Dashboard */}
        {role !== "KASIR" && (
          <Link href="/admin" onClick={onNavigate} className="relative">
            {pathname === "/admin" && (
              <motion.span
                layoutId="admin-nav-active"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="absolute inset-0 rounded-xl bg-marica-amber-dark shadow-sm"
              />
            )}
            <span
              className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-body text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marica-amber/25 ${
                pathname === "/admin"
                  ? "text-white"
                  : "text-marica-ink-soft hover:bg-marica-sky-light/60 hover:text-marica-ink"
              }`}
            >
              <LayoutDashboard className="h-4.5 w-4.5" />
              Dashboard
            </span>
          </Link>
        )}

        {/* --- GROUP MENU ARTIKEL + SUBMENU KATEGORI --- */}
        {role !== "KASIR" && (
          <div className="flex flex-col gap-1">
            <div className="relative flex items-center">
              {/* Link ke Halaman Artikel */}
              <Link
                href="/admin/artikel"
                onClick={onNavigate}
                className="relative flex-1"
              >
                {isArtikelActive && (
                  <motion.span
                    layoutId="admin-nav-active"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="absolute inset-0 rounded-xl bg-marica-amber-dark shadow-sm"
                  />
                )}
                <span
                  className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-body text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marica-amber/25 ${
                    isArtikelActive
                      ? "text-white"
                      : "text-marica-ink-soft hover:bg-marica-sky-light/60 hover:text-marica-ink"
                  }`}
                >
                  <Newspaper className="h-4.5 w-4.5" />
                  Artikel
                </span>
              </Link>
              {/* Tombol Toggle Bergulir (Dropdown Arrow) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsArticlesExpanded((prev) => !prev);
                }}
                aria-label="Toggle submenu Artikel"
                className={`absolute right-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg transition-transform ${
                  isArtikelActive
                    ? "text-white/80 hover:text-white"
                    : "text-marica-ink-soft/60 hover:text-marica-ink"
                }`}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    isArticlesExpanded ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>
            </div>

            {/* Submenu artikel dengan animasi gulir */}
            <AnimatePresence initial={false}>
              {isArticlesExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <Link
                    href="/admin/printables"
                    onClick={onNavigate}
                    className="relative block"
                  >
                    {isPrintableActive && (
                      <motion.span
                        layoutId="admin-nav-active"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 32,
                        }}
                        className="absolute inset-0 rounded-xl bg-marica-amber-dark shadow-sm"
                      />
                    )}
                    <span
                      className={`relative flex items-center gap-3 rounded-xl py-2.5 pl-9 pr-3.5 font-body text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marica-amber/25 ${
                        isPrintableActive
                          ? "text-white"
                          : "text-marica-ink-soft hover:bg-marica-sky-light/60 hover:text-marica-ink"
                      }`}
                    >
                      <FileDown className="h-4.5 w-4.5" />
                      Printable
                    </span>
                  </Link>
                  <Link
                    href="/admin/event"
                    onClick={onNavigate}
                    className="relative block"
                  >
                    {isEventActive && (
                      <motion.span
                        layoutId="admin-nav-active"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 32,
                        }}
                        className="absolute inset-0 rounded-xl bg-marica-amber-dark shadow-sm"
                      />
                    )}
                    <span
                      className={`relative flex items-center gap-3 rounded-xl py-2.5 pl-9 pr-3.5 font-body text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marica-amber/25 ${
                        isEventActive
                          ? "text-white"
                          : "text-marica-ink-soft hover:bg-marica-sky-light/60 hover:text-marica-ink"
                      }`}
                    >
                      <CalendarDays className="h-4.5 w-4.5" />
                      Event
                    </span>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Sisa Menu Navigasi */}
        {navItems
          .slice(1)
          .filter((item) =>
            role === "KASIR" ? item.href === "/kasir" : item.href !== "/kasir",
          )
          .map((item) => {
            const isActive =
              item.enabled &&
              (item.href === "/kasir"
                ? pathname === "/kasir"
                : pathname.startsWith(item.href) && item.href !== "/admin")
                ? true
                : pathname === item.href;
            const Icon = item.icon;

            if (!item.enabled) {
              return (
                <div
                  key={item.label}
                  aria-disabled
                  title="Segera hadir"
                  className="flex cursor-not-allowed items-center justify-between rounded-xl px-3.5 py-2.5 font-body text-sm text-marica-ink-soft/40"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4.5 w-4.5" />
                    {item.label}
                  </span>
                  <Lock className="h-3 w-3" />
                </div>
              );
            }

            return (
              <div key={item.label} className="grid gap-1">
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className="relative"
                >
                {isActive && (
                  <motion.span
                    layoutId="admin-nav-active"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="absolute inset-0 rounded-xl bg-marica-amber-dark shadow-sm"
                  />
                )}
                <span
                  className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-body text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marica-amber/25 ${
                    isActive
                      ? "text-white"
                      : "text-marica-ink-soft hover:bg-marica-sky-light/60 hover:text-marica-ink"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {item.label}
                </span>
                </Link>
                {role === "KASIR" && item.href === "/kasir" && (
                  <>
                    <Link
                      href="/kasir/riwayat"
                      onClick={onNavigate}
                      className="relative"
                    >
                      {pathname === "/kasir/riwayat" && (
                        <motion.span
                          layoutId="admin-nav-active"
                          className="absolute inset-0 rounded-xl bg-marica-amber-dark shadow-sm"
                        />
                      )}
                      <span className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-body text-sm font-medium ${pathname === "/kasir/riwayat" ? "text-white" : "text-marica-ink-soft hover:bg-marica-sky-light/60 hover:text-marica-ink"}`}>
                        <History className="h-4.5 w-4.5" />
                        Riwayat penjaga
                      </span>
                    </Link>
                    <Link
                      href="/kasir/pembelian"
                      onClick={onNavigate}
                      className="relative"
                    >
                      {pathname === "/kasir/pembelian" && (
                        <motion.span
                          layoutId="admin-nav-active"
                          className="absolute inset-0 rounded-xl bg-marica-amber-dark"
                        />
                      )}
                      <span className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-body text-sm font-medium ${pathname === "/kasir/pembelian" ? "text-white" : "text-marica-ink-soft hover:bg-marica-sky-light/60 hover:text-marica-ink"}`}>
                        <ShoppingBag className="h-4.5 w-4.5" />
                        Riwayat pembelian
                      </span>
                    </Link>
                    <Link
                      href="/kasir/keuangan"
                      onClick={onNavigate}
                      className="relative"
                    >
                      {pathname === "/kasir/keuangan" && (
                        <motion.span
                          layoutId="admin-nav-active"
                          className="absolute inset-0 rounded-xl bg-marica-amber-dark shadow-sm"
                        />
                      )}
                      <span className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-body text-sm font-medium ${pathname === "/kasir/keuangan" ? "text-white" : "text-marica-ink-soft hover:bg-marica-sky-light/60 hover:text-marica-ink"}`}>
                        <WalletCards className="h-4.5 w-4.5" />
                        Keuangan
                      </span>
                    </Link>
                    <Link
                      href="/kasir/bookings"
                      onClick={onNavigate}
                      className="relative"
                    >
                      {pathname === "/kasir/bookings" && (
                        <motion.span
                          layoutId="admin-nav-active"
                          className="absolute inset-0 rounded-xl bg-marica-amber-dark"
                        />
                      )}
                      <span className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-body text-sm font-medium ${pathname === "/kasir/bookings" ? "text-white" : "text-marica-ink-soft hover:bg-marica-sky-light/60 hover:text-marica-ink"}`}>
                        <CalendarRange className="h-4.5 w-4.5" />
                        Booking
                      </span>
                    </Link>
                  </>
                )}
              </div>
            );
          })}
      </nav>

      <AccountMenu
        name={name}
        email={email}
        onNavigate={onNavigate}
      />
    </>
  );
}

export default function AdminSidebar({
  name,
  email,
  role,
  collapsible = false,
  onCollapsedChange,
}: {
  name?: string | null;
  email?: string | null;
  role?: string;
  collapsible?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    onCollapsedChange?.(isCollapsed);
  }, [isCollapsed, onCollapsedChange]);

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <Image
            src="/images/logo.png"
            alt="Marica"
            width={140}
            height={36}
            className="h-6 w-auto"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="rounded-full bg-marica-ink px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wide text-white">
            {role === "KASIR" ? "Kasir" : "Admin"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Buka menu navigasi"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-marica-ink-soft transition hover:bg-marica-sky-light/60 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marica-amber/25"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="admin-sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            />
            <motion.aside
              key="admin-sidebar-drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 flex h-dvh w-72 max-w-[85vw] flex-col bg-white shadow-2xl lg:hidden"
            >
              <div className="flex items-center justify-end px-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Tutup menu navigasi"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-marica-ink-soft transition hover:bg-marica-sky-light/60 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marica-amber/25"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SidebarContent
                name={name}
                email={email}
                role={role}
                onNavigate={() => setIsOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <aside className={`fixed inset-y-0 left-0 z-30 hidden h-dvh shrink-0 flex-col border-r border-black/5 bg-white shadow-sm lg:flex ${collapsible ? "transition-[width] duration-200" : ""} ${collapsible && isCollapsed ? "w-16" : "w-64"}`}>
        {collapsible && (
          <button
            type="button"
            onClick={() => setIsCollapsed((value) => !value)}
            aria-label={isCollapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar ke kiri"}
            title={isCollapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar ke kiri"}
            className="absolute -right-3 top-6 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white text-marica-ink-soft shadow-sm transition hover:bg-marica-amber/10 hover:text-marica-amber-text"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
        <div className={collapsible && isCollapsed ? "flex h-full flex-col items-center pt-5" : "flex h-full flex-col"}>
          {collapsible && isCollapsed && (
            <>
              <Link
                href="/kasir"
                aria-label="Kasir"
                className={`rounded-xl p-2 ${
                  pathname === "/kasir"
                    ? "bg-marica-amber-dark text-white"
                    : "text-marica-ink-soft hover:bg-marica-sky-light/60"
                }`}
              >
                <ShoppingBag className="h-5 w-5" />
              </Link>
              {role === "KASIR" && (
                <>
                  <Link href="/kasir/riwayat" aria-label="Riwayat penjaga" className={`mt-2 rounded-xl p-2 ${pathname === "/kasir/riwayat" ? "bg-marica-amber-dark text-white" : "text-marica-ink-soft hover:bg-marica-sky-light/60"}`}>
                    <History className="h-5 w-5" />
                  </Link>
                  <Link href="/kasir/pembelian" aria-label="Riwayat pembelian" className={`mt-2 rounded-xl p-2 ${pathname === "/kasir/pembelian" ? "bg-marica-amber-dark text-white" : "text-marica-ink-soft hover:bg-marica-sky-light/60"}`}>
                    <ShoppingBag className="h-5 w-5" />
                  </Link>
                </>
              )}
              {role === "KASIR" && (
                <Link href="/kasir/keuangan" aria-label="Keuangan" className={`mt-2 rounded-xl p-2 ${pathname === "/kasir/keuangan" ? "bg-marica-amber-dark text-white" : "text-marica-ink-soft hover:bg-marica-sky-light/60"}`}>
                  <WalletCards className="h-5 w-5" />
                </Link>
              )}
              {role === "KASIR" && (
                <Link href="/kasir/bookings" aria-label="Booking" className={`mt-2 rounded-xl p-2 ${pathname === "/kasir/bookings" ? "bg-marica-amber-dark text-white" : "text-marica-ink-soft hover:bg-marica-sky-light/60"}`}>
                  <CalendarRange className="h-5 w-5" />
                </Link>
              )}
              <div className="mt-auto mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-marica-amber-dark font-body text-sm font-semibold text-white">
                {(name ?? email ?? "A").trim().charAt(0).toUpperCase()}
              </div>
            </>
          )}
          {(!collapsible || !isCollapsed) && (
            <SidebarContent name={name} email={email} role={role} />
          )}
        </div>
      </aside>
    </>
  );
}
