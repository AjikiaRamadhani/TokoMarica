import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CalendarDays } from "lucide-react";
import Navbar from "../../components/Navbar";
import ArticleComments from "../../components/Articlecomments";
import Footer from "../../components/Footer";
import NewsletterForm from "../../components/Newsletterform";
import ShareButton from "../../components/ShareButton";
import VideoEmbed from "../../components/VideoEmbed";
import { auth } from "@/lib/auth";
import { categoryBadgeStyle, resolveCategoryColor } from "@/lib/category-color";
import { prisma } from "@/lib/prisma";

// Sebelumnya halaman ini pakai data statis dari `lib/artikel-data.ts`
// (getArticleBySlug/getRelatedArticles). Sekarang datanya diambil dari
// /api/articles/[slug] (yang query ke Postgres Supabase via Prisma, dan
// sekalian nambah view count di server), jadi artikel yang tampil beneran
// artikel yang ada row-nya di database, bukan dummy data lagi.

const FALLBACK_COVER = "/images/article-placeholder.svg";

type ApiCategory = {
  id: string;
  name: string;
  slug: string;
  colorTag: string | null; // hex color, diisi via /admin/kategori — lihat lib/category-color.ts
};

type ApiArticleDetail = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
  videoUrl: string | null;
  videoProvider: string | null;
  publishedAt: string | null;
  updatedAt: string;
  views: number;
  category: ApiCategory | null;
  author: { id: string; name: string | null } | null;
  productPlacements: {
    product: {
      id: string;
      name: string;
      slug: string;
      price: number;
      images: { url: string }[];
    };
  }[];
};

type ApiArticleListItem = {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  category: ApiCategory | null;
};

type ArticlesListResponse = { articles: ApiArticleListItem[] };

type Params = Promise<{ slug: string }>;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.marica.id";

async function getArticleMetadata(slug: string) {
  return prisma.article.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      coverImageUrl: true,
      publishedAt: true,
      updatedAt: true,
      author: { select: { name: true } },
      category: { select: { name: true } },
    },
  });
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function truncateDescription(value: string) {
  const description = stripHtml(value);
  return description.length > 160 ? `${description.slice(0, 157).trimEnd()}...` : description;
}

export async function generateMetadata(
  { params }: { params: Params },
): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleMetadata(slug);

  if (!article) {
    return {
      title: "Artikel tidak ditemukan",
      robots: { index: false, follow: true },
    };
  }

  const description = truncateDescription(article.excerpt || article.content);
  const canonicalUrl = `${siteUrl}/artikel/${article.slug}`;
  const image = article.coverImageUrl || "/images/og-image.png";

  return {
    title: article.title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "article",
      url: canonicalUrl,
      title: article.title,
      description,
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      authors: article.author?.name ? [article.author.name] : undefined,
      section: article.category?.name,
      images: [{ url: image, alt: article.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: [image],
    },
  };
}

// Server Component butuh URL absolut untuk fetch ke API sendiri (fetch
// relatif seperti "/api/..." tidak bisa dipakai di server). Base URL
// dibangun dari header request yang sedang berjalan, jadi otomatis benar
// baik di localhost, preview, maupun production — tidak perlu env var.
async function getBaseUrl() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

async function getArticle(slug: string, baseUrl: string): Promise<ApiArticleDetail | null> {
  const res = await fetch(`${baseUrl}/api/articles/${slug}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Gagal memuat artikel");
  return res.json();
}

async function getRelatedArticles(categorySlug: string | undefined, excludeSlug: string, baseUrl: string) {
  if (!categorySlug) return [];
  const params = new URLSearchParams({ category: categorySlug, limit: "4" });
  const res = await fetch(`${baseUrl}/api/articles?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) return [];
  const body = (await res.json()) as ArticlesListResponse;
  return body.articles.filter((a) => a.slug !== excludeSlug).slice(0, 3);
}

export default async function ArtikelDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const baseUrl = await getBaseUrl();

  const article = await getArticle(slug, baseUrl);
  if (!article) notFound();

  const session = await auth();
  const commentUser = session?.user?.name ? { name: session.user.name } : null;

  const related = await getRelatedArticles(article.category?.slug, article.slug, baseUrl);
  const articleUrl = `${siteUrl}/artikel/${article.slug}`;
  const articleImage = article.coverImageUrl
    ? new URL(article.coverImageUrl, siteUrl).toString()
    : `${siteUrl}${FALLBACK_COVER}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": articleUrl,
    headline: article.title,
    description: truncateDescription(article.excerpt || article.content),
    image: [articleImage],
    mainEntityOfPage: articleUrl,
    datePublished: article.publishedAt ?? undefined,
    dateModified: article.updatedAt,
    author: {
      "@type": "Person",
      name: article.author?.name || "Marica",
    },
    publisher: {
      "@type": "Organization",
      name: "Marica",
      url: siteUrl,
    },
  };

  return (
    <div className="min-h-screen bg-marica-cream">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {/* Keyframe animasi dipakai lewat Tailwind arbitrary value
          animate-[fadeInUp_...]. CSS animation jalan otomatis begitu
          elemen ini di-paint, jadi tetap berfungsi walau halaman ini
          Server Component (tidak butuh JS di client). */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <Navbar />

      <div className="mx-auto max-w-5xl px-6 pb-6 pt-6 lg:px-10">
        <nav className="animate-[fadeInUp_0.4s_ease-out_backwards] font-body text-sm text-marica-ink-soft">
          <Link href="/artikel" className="transition hover:text-marica-ink">
            Artikel
          </Link>
          <span className="mx-2">/</span>
          {article.category && <span>{article.category.name}</span>}
        </nav>
      </div>

      <div className="mx-auto grid max-w-5xl gap-10 px-6 pb-20 lg:grid-cols-[1fr_300px] lg:px-10">
        {/* Main article column */}
        <article
          style={{ animationDelay: "80ms" }}
          className="animate-[fadeInUp_0.5s_ease-out_backwards]"
        >
          {article.category && (
            <span
              className="inline-block rounded-full px-3 py-1 font-body text-xs font-semibold"
              style={categoryBadgeStyle(article.category.colorTag, article.category.slug)}
            >
              {article.category.name}
            </span>
          )}

          <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-marica-ink sm:text-4xl">
            {article.title}
          </h1>

          <div className="mt-4 flex items-center justify-between border-b border-marica-ink/10 pb-5">
            <span className="inline-flex items-center gap-2 font-body text-sm text-marica-ink-soft">
              <CalendarDays className="h-4 w-4" />
              {formatDate(article.publishedAt)}
            </span>
            <ShareButton title={article.title} />
          </div>

          <div
            style={{ animationDelay: "160ms" }}
            className="relative mt-6 aspect-[16/9] w-full animate-[fadeInUp_0.5s_ease-out_backwards] overflow-hidden rounded-2xl"
          >
            <Image
              src={article.coverImageUrl || FALLBACK_COVER}
              alt={article.title}
              fill
              sizes="(min-width: 1024px) 720px, 100vw"
              className="object-cover"
              priority
            />
          </div>

          {article.videoUrl && (
            <div className="mt-8">
              <VideoEmbed
                videoUrl={article.videoUrl}
                videoProvider={article.videoProvider}
                title={article.title}
              />
            </div>
          )}

          {/* `content` di database disimpan sebagai satu string (hasil rich
              text editor di admin), beda dari data statis lama yang
              berbentuk array section {heading, body, list}. Di bawah ini
              di-render sebagai HTML. KALAU ternyata editor admin kamu
              menyimpan Markdown (bukan HTML), ganti bagian ini pakai
              react-markdown, jangan dangerouslySetInnerHTML mentah-mentah. */}
          <div
            className="prose prose-neutral mt-8 max-w-none font-body text-marica-ink"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {article.productPlacements.length > 0 && (
            <section className="mt-10 rounded-3xl bg-white p-5 shadow-sm sm:p-7" aria-labelledby="article-products-heading">
              <h2 id="article-products-heading" className="font-display text-xl font-bold text-marica-ink">
                Produk terkait
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {article.productPlacements.map(({ product }) => (
                  <Link
                    key={product.id}
                    href={`/belanja/${product.slug}`}
                    className="group flex gap-4 rounded-2xl border border-marica-ink/10 p-3 transition hover:border-marica-amber/50 hover:shadow-sm"
                  >
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-marica-cream">
                      <Image
                        src={product.images[0]?.url ?? FALLBACK_COVER}
                        alt={product.name}
                        fill
                        sizes="80px"
                        className="object-cover transition group-hover:scale-105"
                      />
                    </div>
                    <div className="min-w-0 self-center">
                      <h3 className="line-clamp-2 font-body text-sm font-semibold text-marica-ink">{product.name}</h3>
                      <p className="mt-1 font-body text-sm font-bold text-marica-amber-text">
                        {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(product.price)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Komentar sudah fetch langsung ke /api/articles/[slug]/comments
              (data DB asli) — komponen ini tidak diubah. */}
          <ArticleComments slug={slug} user={commentUser} />
        </article>

        {/* Sidebar */}
        <aside
          style={{ animationDelay: "200ms" }}
          className="animate-[fadeInUp_0.5s_ease-out_backwards] space-y-4"
        >
          <h3 className="font-display text-base font-bold text-marica-ink">Artikel Lainnya</h3>
          {related.length === 0 ? (
            <p className="font-body text-sm text-marica-ink-soft">Belum ada artikel terkait.</p>
          ) : (
            related.map((item, i) => (
              <Link
                key={item.slug}
                href={`/artikel/${item.slug}`}
                style={{ animationDelay: `${240 + i * 80}ms` }}
                className="flex animate-[fadeInUp_0.5s_ease-out_backwards] gap-3 rounded-2xl bg-white p-3 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                  <Image
                    src={item.coverImageUrl || FALLBACK_COVER}
                    alt={item.title}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <div>
                  {item.category && (
                    <span
                      className="font-body text-xs font-semibold"
                      style={{ color: resolveCategoryColor(item.category.colorTag, item.category.slug) }}
                    >
                      {item.category.name}
                    </span>
                  )}
                  <p className="line-clamp-2 font-body text-sm font-medium leading-snug text-marica-ink">
                    {item.title}
                  </p>
                </div>
              </Link>
            ))
          )}
        </aside>
      </div>

      {/* Newsletter CTA — sebelumnya <form> ini statis (tidak ada
          onSubmit), padahal /api/newsletter sudah ada dan tidak dipakai
          sama sekali. Sekarang dipindah ke komponen client NewsletterForm
          yang benar-benar POST ke endpoint itu. */}
      <section className="bg-marica-amber px-6 py-14 lg:px-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center">
          <h2 className="font-display text-2xl font-bold text-marica-ink sm:text-3xl">
            Jangan Ketinggalan Info Seru!
          </h2>
          <p className="max-w-md font-body text-sm text-marica-ink/80">
            Dapatkan update artikel terbaru, tips parenting, dan info event langsung di inbox Anda.
          </p>
          <NewsletterForm />
        </div>
      </section>

      <Footer />
    </div>
  );
}
