"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  Star,
  BookOpen,
  Sparkles,
  CalendarDays,
  ArrowRight,
  LayoutDashboard,
  ShoppingCart,
  Bell,
  PackageSearch,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { landingCompany } from "@/lib/landing-content";

type NavMenu = "shop" | "activity" | "edugames" | "event" | "blog" | "more";
type NavLink = { label: string; href: string; menu?: NavMenu };

const navLinks: NavLink[] = [
  { label: "Beranda", href: "/" },
  { label: "Belanja", href: "/belanja" },
  { label: "Aktivitas", href: "/event", menu: "activity" },
  { label: "Edugames", href: "/edugames" },
  { label: "Blog", href: "/artikel", menu: "blog" },
  { label: "Printable", href: "/printable" },
  { label: "Lainnya", href: "#lainnya", menu: "more" },
];

type ApiUserProfile = {
  name: string | null;
  email: string | null;
  image: string | null;
  role?: string;
};

function ProfileAvatar({
  src,
  className,
  iconClassName,
}: {
  src: string | null | undefined;
  className: string;
  iconClassName: string;
}) {
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-marica-amber/20 text-marica-amber-dark ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <User className={iconClassName} />
      )}
    </span>
  );
}

type ApiProductCategory = {
  id: string;
  name: string;
  slug: string;
  children: { id: string; name: string; slug: string }[];
};

type ApiArticleCategory = {
  id: string;
  name: string;
  slug: string;
};

type ApiNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string | null;
  isRead: boolean;
  createdAt: string;
};

const simpleMenus = {
  activity: [
    { label: "Event", href: "/event" },
    { label: "Booking Playpass", href: "/playpass" },
    { label: "Reservasi Meja", href: "/reservasi" },
  ],
  more: [
    { label: "Subscription Edu-Kit", href: "/subscription" },
    { label: "Video Showcase", href: "/video" },
    { label: "Rilis Eksklusif", href: "/preorder" },
    { label: "Sekolah & Bisnis", href: "/b2b" },
  ],
} as const;

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";
  const isShoppingPage =
    pathname === "/belanja" || pathname?.startsWith("/belanja/");

  const [isOpen, setIsOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [productCategories, setProductCategories] = useState<
    ApiProductCategory[]
  >([]);
  const [articleCategories, setArticleCategories] = useState<
    ApiArticleCategory[]
  >([]);
  const [points, setPoints] = useState(0);
  const [profile, setProfile] = useState<ApiUserProfile | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const solidHeader = scrolled || isShoppingPage;

  // Session yang sudah terlanjur terbuka bisa belum membawa role terbaru di
  // client. Profil API membaca role langsung dari database, jadi dipakai
  // sebagai fallback agar menu khusus kasir tetap muncul.
  const sessionRole = (session?.user as { role?: string } | undefined)?.role;
  const currentRole = profile?.role ?? sessionRole;
  const isAdmin = currentRole === "ADMIN";
  const isKasir = currentRole === "KASIR";

  // Menu aktif mengikuti route saat ini. startsWith dipakai supaya halaman
  // detail (mis. /artikel/slug-nya) tetap menyorot menu "Blog" sebagai induknya.
  const activeHref =
    navLinks.find(
      (link) =>
        pathname === link.href ||
        (link.href !== "/" && pathname?.startsWith(`${link.href}/`)),
    )?.href ??
    pathname ??
    "/";

  useEffect(() => {
    Promise.all([
      fetch("/api/product-categories").then((res) => res.json()),
      fetch("/api/article-categories").then((res) => res.json()),
    ])
      .then(([products, articles]) => {
        setProductCategories(Array.isArray(products) ? products : []);
        setArticleCategories(Array.isArray(articles) ? articles : []);
      })
      .catch(() => {
        setProductCategories([]);
        setArticleCategories([]);
      });
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setProfile(null);
      setCartCount(0);
      return;
    }

    Promise.all([
      fetch("/api/points", { cache: "no-store" }),
      fetch("/api/user/profile", { cache: "no-store" }),
    ])
      .then(async ([pointsResponse, profileResponse]) => {
        const pointsData = pointsResponse.ok
          ? await pointsResponse.json().catch(() => null)
          : null;
        const profileData = profileResponse.ok
          ? await profileResponse.json().catch(() => null)
          : null;

        setPoints(
          typeof pointsData?.balance === "number" ? pointsData.balance : 0,
        );
        if (profileData && !profileData.error) {
          setProfile(profileData as ApiUserProfile);
        }
      })
      .catch(() => {
        setPoints(0);
        setProfile(null);
      });
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setCartCount(0);
      return;
    }

    const loadCartCount = async () => {
      const response = await fetch("/api/cart", { cache: "no-store" });
      if (!response.ok) {
        setCartCount(0);
        return;
      }

      const data = await response.json().catch(() => null);
      const total = Array.isArray(data?.items)
        ? data.items.reduce(
            (sum: number, item: { quantity?: number }) =>
              sum + (Number(item.quantity) || 0),
            0,
          )
        : 0;
      setCartCount(total);
    };

    void loadCartCount();
    const handleCartUpdated = () => void loadCartCount();
    window.addEventListener("marica:cart-updated", handleCartUpdated);
    return () =>
      window.removeEventListener("marica:cart-updated", handleCartUpdated);
  }, [isLoggedIn, pathname]);

  useEffect(() => {
    if (!isLoggedIn) {
      setNotifications([]);
      setUnreadNotificationCount(0);
      return;
    }

    const loadNotifications = async () => {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json().catch(() => null);
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
      setUnreadNotificationCount(
        typeof data?.unreadCount === "number" ? data.unreadCount : 0,
      );
    };

    void loadNotifications();
  }, [isLoggedIn, pathname]);

  const markNotificationRead = async (notification: ApiNotification) => {
    if (notification.isRead) return;
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, isRead: true } : item,
      ),
    );
    setUnreadNotificationCount((current) => Math.max(0, current - 1));
    await fetch(`/api/notifications/${notification.id}`, { method: "PATCH" });
  };

  const markAllNotificationsRead = async () => {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, isRead: true })),
    );
    setUnreadNotificationCount(0);
    await fetch("/api/notifications", { method: "PATCH" });
  };

  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  // Tutup dropdown profil kalau user klik di luar area dropdown-nya.
  useEffect(() => {
    if (!profileOpen) return;
    const handleClickOutside = (e: PointerEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
  }, [profileOpen]);

  // Header sticky: begitu halaman digeser turun, background gradient-transparan
  // diganti jadi putih solid + blur + shadow supaya tetap terbaca rapi di atas
  // section apa pun yang lewat di belakangnya.
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Semua item nav sekarang route halaman asli (bukan hash section di
  // satu halaman panjang), jadi klik di mobile tinggal set active lalu
  // tutup menu — navigasinya sendiri ditangani default <a href>.
  const handleMobileNavClick = () => {
    setIsOpen(false);
    setOpenMenu(null);
  };

  const menuItems = (menu: NavMenu) => {
    if (menu === "shop") {
      return (
        <div className="grid min-w-132.5 grid-cols-[180px_1fr] gap-6 p-5">
          <div>
            <p className="mb-3 font-body text-[11px] font-bold uppercase tracking-[0.16em] text-marica-ink-soft/70">
              Belanja
            </p>
            <Link
              href="/belanja"
              className="group flex items-center gap-3 rounded-xl bg-marica-cream/70 p-3"
              onClick={() => setOpenMenu(null)}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-marica-amber/25 text-marica-amber-text">
                <ShoppingCart className="h-4 w-4" />
              </span>
              <span>
                <span className="block font-body text-sm font-bold text-marica-ink">
                  Semua produk
                </span>
                <span className="block font-body text-xs text-marica-ink-soft">
                  Mainan, buku, dan lainnya
                </span>
              </span>
            </Link>
            <Link
              href="/belanja"
              className="mt-3 inline-flex items-center gap-1 font-body text-xs font-bold text-marica-amber-text"
              onClick={() => setOpenMenu(null)}
            >
              Lihat semua <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div>
            <p className="mb-3 font-body text-[11px] font-bold uppercase tracking-[0.16em] text-marica-ink-soft/70">
              Kategori
            </p>
            <div className="grid grid-cols-2 gap-x-5 gap-y-3">
              {productCategories.length ? (
                productCategories.map((category) => (
                  <div key={category.id}>
                    <Link
                      href={`/belanja?category=${category.slug}`}
                      onClick={() => setOpenMenu(null)}
                      className="font-body text-sm font-bold text-marica-ink hover:text-marica-amber-text"
                    >
                      {category.name}
                    </Link>
                    {category.children.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {category.children.map((child) => (
                          <Link
                            key={child.id}
                            href={`/belanja?category=${child.slug}`}
                            onClick={() => setOpenMenu(null)}
                            className="block font-body text-xs text-marica-ink-soft hover:text-marica-ink"
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="font-body text-sm text-marica-ink-soft">
                  Kategori sedang dimuat...
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (menu === "blog") {
      return (
        <div className="w-70 p-5">
          <p className="mb-3 font-body text-[11px] font-bold uppercase tracking-[0.16em] text-marica-ink-soft/70">
            Topik artikel
          </p>
          <Link
            href="/artikel"
            onClick={() => setOpenMenu(null)}
            className="mb-2 flex items-center gap-2 rounded-lg px-2 py-2 font-body text-sm font-semibold text-marica-ink hover:bg-marica-cream"
          >
            Semua artikel <ArrowRight className="ml-auto h-3.5 w-3.5" />
          </Link>
          {articleCategories.length ? (
            articleCategories.map((category) => (
              <Link
                key={category.id}
                href={`/artikel?category=${category.slug}`}
                onClick={() => setOpenMenu(null)}
                className="block rounded-lg px-2 py-2 font-body text-sm text-marica-ink-soft hover:bg-marica-cream hover:text-marica-ink"
              >
                {category.name}
              </Link>
            ))
          ) : (
            <p className="px-2 font-body text-sm text-marica-ink-soft">
              Kategori sedang dimuat...
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="w-62.5 p-4">
        {simpleMenus[menu as keyof typeof simpleMenus]?.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpenMenu(null)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 font-body text-sm font-semibold text-marica-ink-soft hover:bg-marica-cream hover:text-marica-ink"
          >
            {item.href === "/event" ? (
              <CalendarDays className="h-4 w-4 text-marica-blue" />
            ) : menu === "activity" ? (
              <Sparkles className="h-4 w-4 text-marica-rose-deep" />
            ) : menu === "event" ? (
              <CalendarDays className="h-4 w-4 text-marica-blue" />
            ) : (
              <BookOpen className="h-4 w-4 text-marica-violet-deep" />
            )}
            {item.label}
          </Link>
        ))}
      </div>
    );
  };

  // Versi mobile dari menuItems() di atas: bukan panel hover, tapi daftar
  // link datar yang ditaruh di bawah tombol induknya saat accordion dibuka.
  const mobileMenuItems = (menu: NavMenu) => {
    if (menu === "shop") {
      return (
        <div className="mt-1 space-y-0.5 border-l-2 border-marica-amber/20 pl-3">
          <Link
            href="/belanja"
            onClick={handleMobileNavClick}
            className="block rounded-lg px-3 py-2 font-body text-sm font-semibold text-marica-ink hover:bg-marica-cream"
          >
            Semua produk
          </Link>
          {productCategories.length ? (
            productCategories.map((category) => (
              <Link
                key={category.id}
                href={`/belanja?category=${category.slug}`}
                onClick={handleMobileNavClick}
                className="block rounded-lg px-3 py-2 font-body text-sm text-marica-ink-soft hover:bg-marica-cream hover:text-marica-ink"
              >
                {category.name}
              </Link>
            ))
          ) : (
            <p className="px-3 py-2 font-body text-xs text-marica-ink-soft">
              Kategori sedang dimuat...
            </p>
          )}
        </div>
      );
    }

    if (menu === "blog") {
      return (
        <div className="mt-1 space-y-0.5 border-l-2 border-marica-amber/20 pl-3">
          <Link
            href="/artikel"
            onClick={handleMobileNavClick}
            className="block rounded-lg px-3 py-2 font-body text-sm font-semibold text-marica-ink hover:bg-marica-cream"
          >
            Semua artikel
          </Link>
          {articleCategories.length ? (
            articleCategories.map((category) => (
              <Link
                key={category.id}
                href={`/artikel?category=${category.slug}`}
                onClick={handleMobileNavClick}
                className="block rounded-lg px-3 py-2 font-body text-sm text-marica-ink-soft hover:bg-marica-cream hover:text-marica-ink"
              >
                {category.name}
              </Link>
            ))
          ) : (
            <p className="px-3 py-2 font-body text-xs text-marica-ink-soft">
              Kategori sedang dimuat...
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="mt-1 space-y-0.5 border-l-2 border-marica-amber/20 pl-3">
        {simpleMenus[menu as keyof typeof simpleMenus]?.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleMobileNavClick}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 font-body text-sm text-marica-ink-soft hover:bg-marica-cream hover:text-marica-ink"
          >
            {item.href === "/event" ? (
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-marica-blue" />
            ) : menu === "activity" ? (
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-marica-rose-deep" />
            ) : menu === "event" ? (
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-marica-blue" />
            ) : (
              <BookOpen className="h-3.5 w-3.5 shrink-0 text-marica-violet-deep" />
            )}
            {item.label}
          </Link>
        ))}
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-30 isolate">
      {/* layer 1: cream-to-transparent gradient, blends into Hero at the top of the page */}
      <motion.div
        aria-hidden
        animate={{ opacity: solidHeader ? 0 : 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-marica-cream via-marica-cream/70 to-transparent"
      />

      {/* layer 2: solid, blurred, with shadow — fades in once the page is scrolled so the header stays readable over any section */}
      <motion.div
        aria-hidden
        animate={{ opacity: solidHeader ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="pointer-events-none absolute inset-0 -z-10 bg-white/90 shadow-[0_8px_24px_rgba(120,60,10,0.1)] backdrop-blur-md"
      />
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5 lg:px-10">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <Image
            src="/images/logo.png"
            alt="Marica"
            width={434}
            height={145}
            priority
            className="h-8 w-auto object-contain sm:h-9"
          />
        </Link>

        {/* Desktop navigation */}
        <div
          className="hidden min-w-0 flex-1 items-center justify-center gap-1 font-body text-[13px] font-semibold text-marica-ink-soft lg:flex xl:gap-1.5"
          onMouseLeave={() => {
            setHoveredIndex(null);
            setOpenMenu(null);
          }}
        >
          {navLinks.map((link, i) => {
            const isHighlighted =
              hoveredIndex === i ||
              (hoveredIndex === null && link.href === activeHref);
            const hasMenu = Boolean(link.menu);
            return (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => {
                  setHoveredIndex(i);
                  if (link.menu) setOpenMenu(link.menu);
                }}
              >
                <Link
                  href={link.href}
                  onClick={(event) => {
                    if (link.menu) {
                      event.preventDefault();
                      setOpenMenu(link.menu);
                    } else {
                      setOpenMenu(null);
                    }
                  }}
                  className={`relative flex items-center gap-1 rounded-full px-3 py-2 transition-colors xl:px-3.5 ${
                    isHighlighted
                      ? "text-white"
                      : "hover:text-marica-amber-dark"
                  }`}
                >
                  {isHighlighted && (
                    <motion.span
                      layoutId="nav-hover-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-marica-amber-dark shadow-[0_6px_16px_rgba(222,143,12,0.28)]"
                      transition={{
                        type: "spring",
                        stiffness: 460,
                        damping: 30,
                      }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                  {hasMenu && (
                    <ChevronDown
                      className={`relative z-10 h-3 w-3 transition-transform ${openMenu === link.menu ? "rotate-180" : ""}`}
                    />
                  )}
                </Link>
                {link.menu && openMenu === link.menu && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute left-1/2 top-full z-50 -translate-x-1/2 overflow-hidden rounded-2xl border border-marica-ink/5 bg-white shadow-[0_18px_45px_rgba(120,60,10,0.16)]"
                    onMouseEnter={() => setOpenMenu(link.menu ?? null)}
                  >
                    {menuItems(link.menu)}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right side: auth pills (desktop) + mobile menu button */}
        <div className="flex shrink-0 items-center gap-3">
          {isLoggedIn && (
            <Link
              href="/profil/poin"
              aria-label={`${points.toLocaleString("id-ID")} Marica Points`}
              className="hidden items-center gap-1.5 rounded-full border border-marica-amber/60 bg-marica-amber/15 px-3 py-2 font-body text-xs font-bold text-marica-amber-text lg:flex"
            >
              <Star className="h-3.5 w-3.5 fill-marica-amber text-marica-amber-dark" />
              {points.toLocaleString("id-ID")}
            </Link>
          )}
          {isLoggedIn && (
            <div className="relative">
              <button
                type="button"
                aria-label="Notifikasi"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((current) => !current)}
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-marica-ink-soft transition hover:bg-marica-cream hover:text-marica-ink"
              >
                <Bell className="h-5 w-5" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-body text-[10px] font-bold leading-none text-white">
                    {unreadNotificationCount > 99
                      ? "99+"
                      : unreadNotificationCount}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl bg-white shadow-[0_14px_35px_rgba(120,60,10,0.15)]"
                  >
                    <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
                      <p className="font-body text-sm font-bold text-marica-ink">
                        Notifikasi
                      </p>
                      {unreadNotificationCount > 0 && (
                        <button
                          type="button"
                          onClick={() => void markAllNotificationsRead()}
                          className="font-body text-xs font-semibold text-marica-amber-text hover:underline"
                        >
                          Tandai semua dibaca
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-8 text-center font-body text-sm text-marica-ink-soft">
                          Belum ada notifikasi.
                        </p>
                      ) : (
                        notifications.map((notification) => {
                          const content = (
                            <div
                              className={`border-b border-black/5 px-4 py-3 text-left transition hover:bg-marica-cream/50 ${notification.isRead ? "" : "bg-marica-amber/10"}`}
                            >
                              <div className="flex items-start gap-2">
                                {!notification.isRead && (
                                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                                )}
                                <div>
                                  <p className="font-body text-sm font-semibold text-marica-ink">
                                    {notification.title}
                                  </p>
                                  <p className="mt-0.5 font-body text-xs leading-5 text-marica-ink-soft">
                                    {notification.message}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );

                          return notification.href ? (
                            <Link
                              key={notification.id}
                              href={notification.href}
                              onClick={() => {
                                void markNotificationRead(notification);
                                setNotificationsOpen(false);
                              }}
                            >
                              {content}
                            </Link>
                          ) : (
                            <button
                              key={notification.id}
                              type="button"
                              className="block w-full"
                              onClick={() => void markNotificationRead(notification)}
                            >
                              {content}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          {isLoggedIn ? (
            <Link
              href="/belanja/keranjang"
              aria-label="Keranjang"
              className="relative hidden text-marica-ink-soft transition hover:text-marica-ink lg:block"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-body text-[10px] font-bold leading-none text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
          ) : (
            <button
              type="button"
              aria-label="Buka keranjang"
              onClick={() => setAuthPromptOpen(true)}
              className="hidden text-marica-ink-soft transition hover:text-marica-ink lg:block"
            >
              <ShoppingCart className="h-5 w-5" />
            </button>
          )}
          {status === "loading" ? (
            // Skeleton kecil biar tidak "flash" antara logged-out -> logged-in saat sesi masih dicek
            <div className="hidden h-9 w-24 animate-pulse rounded-full bg-marica-ink/5 lg:block" />
          ) : isLoggedIn ? (
            <div className="relative hidden lg:block" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                aria-expanded={profileOpen}
                className="flex items-center gap-2 rounded-full border border-marica-ink/10 bg-white py-1.5 pl-1.5 pr-3.5 shadow-sm transition hover:bg-marica-cream"
              >
                <ProfileAvatar
                  src={profile?.image}
                  className="h-7 w-7"
                  iconClassName="h-4 w-4"
                />
                <span className="max-w-30 truncate font-body text-sm font-semibold text-marica-ink">
                  {(profile?.name ?? session?.user?.name)?.split(" ")[0] || "Akun"}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-marica-ink-soft transition-transform ${profileOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-2xl bg-white shadow-[0_14px_35px_rgba(120,60,10,0.15)]"
                  >
                    <div className="flex items-center gap-3 border-b border-black/5 px-4 py-3.5">
                      <ProfileAvatar
                        src={profile?.image}
                        className="h-10 w-10"
                        iconClassName="h-5 w-5"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-body text-sm font-semibold text-marica-ink">
                          {profile?.name ?? session?.user?.name ?? "Pengguna"}
                        </p>
                        <p className="truncate font-body text-xs text-marica-ink-soft">
                          {profile?.email ?? session?.user?.email}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/profil"
                      onClick={() => setProfileOpen(false)}
                      className="flex w-full items-center gap-2.5 border-b border-black/5 px-4 py-3 font-body text-sm font-medium text-marica-ink-soft transition hover:bg-marica-cream hover:text-marica-ink"
                    >
                      <User className="h-4 w-4" />
                      Profil &amp; Keluarga
                    </Link>
                    <Link
                      href="/belanja/pesanan-saya"
                      onClick={() => setProfileOpen(false)}
                      className="flex w-full items-center gap-2.5 border-b border-black/5 px-4 py-3 font-body text-sm font-medium text-marica-ink-soft transition hover:bg-marica-cream hover:text-marica-ink"
                    >
                      <PackageSearch className="h-4 w-4" />
                      Pesanan Saya
                    </Link>
                    {isKasir && (
                      <Link
                        href="/kasir"
                        onClick={() => setProfileOpen(false)}
                        className="flex w-full items-center gap-2.5 border-b border-black/5 px-4 py-3 font-body text-sm font-semibold text-marica-amber-text transition hover:bg-marica-cream"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Kasir
                      </Link>
                    )}
                    {isAdmin && (
                      <a
                        href="/admin"
                        onClick={() => setProfileOpen(false)}
                        className="flex w-full items-center gap-2.5 border-b border-black/5 px-4 py-3 font-body text-sm font-medium text-marica-ink-soft transition hover:bg-marica-cream hover:text-marica-ink"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard Admin
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-3 font-body text-sm font-medium text-marica-ink-soft transition hover:bg-marica-cream hover:text-marica-ink"
                    >
                      <LogOut className="h-4 w-4" />
                      Keluar
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <a
                href="/login"
                className="hidden items-center justify-center rounded-full border border-marica-ink/10 bg-white px-5 py-2 font-body text-sm font-semibold text-marica-ink shadow-sm transition hover:bg-marica-cream lg:inline-flex"
              >
                Masuk
              </a>

              <a
                href="/daftar"
                className="hidden items-center justify-center rounded-full bg-marica-amber-dark px-5 py-2 font-body text-sm font-semibold text-white shadow-sm transition hover:brightness-105 lg:inline-flex"
              >
                Daftar Sekarang
              </a>
            </>
          )}

          {isLoggedIn ? (
            <Link
              href="/belanja/keranjang"
              aria-label="Keranjang"
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-marica-ink lg:hidden"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-body text-[10px] font-bold leading-none text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label={isOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={isOpen}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-marica-ink lg:hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isOpen ? (
                <motion.span
                  key="close"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <X className="h-6 w-6" />
                </motion.span>
              ) : (
                <motion.span
                  key="menu"
                  initial={{ opacity: 0, rotate: 90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: -90 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Menu className="h-6 w-6" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </nav>

      {/* Mobile menu panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="relative z-20 overflow-hidden lg:hidden"
          >
            <motion.div
              initial={{ y: -8 }}
              animate={{ y: 0 }}
              exit={{ y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="mx-6 mb-5 flex flex-col gap-1 rounded-2xl bg-white p-3 shadow-[0_14px_35px_rgba(120,60,10,0.15)]"
            >
              {navLinks.map((link, i) =>
                link.menu ? (
                  <motion.div
                    key={link.label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.05 }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenu((prev) =>
                          prev === link.menu ? null : (link.menu ?? null),
                        )
                      }
                      className={
                        link.href === activeHref
                          ? "flex w-full items-center justify-between rounded-xl bg-marica-amber-dark px-4 py-2.5 font-body text-[15px] font-semibold text-white shadow-sm"
                          : "flex w-full items-center justify-between rounded-xl px-4 py-2.5 font-body text-[15px] font-semibold text-marica-ink-soft transition hover:bg-marica-amber/10 hover:text-marica-amber-dark"
                      }
                    >
                      {link.label}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${openMenu === link.menu ? "rotate-180" : ""}`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {openMenu === link.menu && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="overflow-hidden px-1"
                        >
                          {mobileMenuItems(link.menu)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <motion.a
                    key={link.label}
                    href={link.href}
                    onClick={handleMobileNavClick}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.05 }}
                    className={
                      link.href === activeHref
                        ? "rounded-xl bg-marica-amber-dark px-4 py-2.5 font-body text-[15px] font-semibold text-white shadow-sm"
                        : "rounded-xl px-4 py-2.5 font-body text-[15px] font-semibold text-marica-ink-soft transition hover:bg-marica-amber/10 hover:text-marica-amber-dark"
                    }
                  >
                    {link.label}
                  </motion.a>
                ),
              )}

              <div className="mt-2 flex flex-col gap-2">
                {isLoggedIn ? (
                  <motion.div
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.25,
                      delay: navLinks.length * 0.05,
                    }}
                    className="rounded-xl bg-marica-cream/60 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <ProfileAvatar
                        src={profile?.image}
                        className="h-9 w-9"
                        iconClassName="h-4 w-4"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-body text-sm font-semibold text-marica-ink">
                          {profile?.name ?? session?.user?.name ?? "Pengguna"}
                        </p>
                        <p className="truncate font-body text-xs text-marica-ink-soft">
                          {profile?.email ?? session?.user?.email}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/profil"
                      onClick={() => setIsOpen(false)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-marica-amber/30 bg-marica-amber/10 py-2 font-body text-sm font-semibold text-marica-amber-text"
                    >
                      <User className="h-4 w-4" />
                      Profil &amp; Keluarga
                    </Link>
                    <Link
                      href="/belanja/pesanan-saya"
                      onClick={() => setIsOpen(false)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-marica-amber/30 bg-marica-amber/10 py-2 font-body text-sm font-semibold text-marica-amber-text"
                    >
                      <PackageSearch className="h-4 w-4" />
                      Pesanan Saya
                    </Link>
                    {isKasir && (
                      <Link
                        href="/kasir"
                        onClick={() => setIsOpen(false)}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-marica-amber/30 bg-marica-amber/10 py-2 font-body text-sm font-semibold text-marica-amber-text"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Kasir
                      </Link>
                    )}
                    {isAdmin && (
                      <a
                        href="/admin"
                        onClick={() => setIsOpen(false)}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-marica-ink/10 bg-white py-2 font-body text-sm font-semibold text-marica-ink-soft"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard Admin
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-marica-ink/10 bg-white py-2 font-body text-sm font-semibold text-marica-ink-soft"
                    >
                      <LogOut className="h-4 w-4" />
                      Keluar
                    </button>
                  </motion.div>
                ) : (
                  <>
                    <motion.a
                      href="/login"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.25,
                        delay: navLinks.length * 0.05,
                      }}
                      className="rounded-xl border border-marica-ink/10 bg-white px-4 py-2.5 text-center font-body text-[15px] font-semibold text-marica-ink"
                    >
                      Masuk
                    </motion.a>
                    <motion.a
                      href="/register"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.25,
                        delay: (navLinks.length + 1) * 0.05,
                      }}
                      className="rounded-xl bg-marica-amber-dark px-4 py-2.5 text-center font-body text-[15px] font-semibold text-white"
                    >
                      Daftar Sekarang
                    </motion.a>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {authPromptOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-marica-ink/35 px-4 backdrop-blur-sm"
            onClick={() => setAuthPromptOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="cart-auth-title"
              onClick={(event) => event.stopPropagation()}
              className="relative w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-[0_24px_80px_rgba(28,27,27,0.22)]"
            >
              <button
                type="button"
                onClick={() => setAuthPromptOpen(false)}
                aria-label="Tutup"
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-marica-ink-soft transition hover:bg-marica-cream"
              >
                <X className="h-4 w-4" />
              </button>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-marica-amber/15 text-marica-amber-dark">
                <ShoppingCart className="h-6 w-6" />
              </span>
              <h2
                id="cart-auth-title"
                className="mt-4 font-display text-xl font-semibold text-marica-ink"
              >
                Masuk untuk melihat keranjang
              </h2>
              <p className="mt-2 font-body text-sm leading-relaxed text-marica-ink-soft">
                Silakan masuk atau daftar terlebih dahulu untuk menyimpan dan
                melanjutkan belanja.
              </p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                <Link
                  href="/login"
                  onClick={() => setAuthPromptOpen(false)}
                  className="rounded-xl border border-black/10 px-4 py-3 font-body text-sm font-bold text-marica-ink transition hover:bg-marica-cream"
                >
                  Masuk
                </Link>
                <Link
                  href="/daftar"
                  onClick={() => setAuthPromptOpen(false)}
                  className="rounded-xl bg-marica-amber-dark px-4 py-3 font-body text-sm font-bold text-white transition hover:brightness-105"
                >
                  Daftar
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
