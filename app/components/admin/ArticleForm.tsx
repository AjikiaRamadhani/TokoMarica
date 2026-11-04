"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  UploadCloud,
  ImageIcon,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Loader2,
  X,
} from "lucide-react";

type ApiCategory = { id: string; name: string; slug: string; colorTag: string | null };
type ApiProduct = { id: string; name: string; slug: string; price: number; isActive: boolean; images?: { url: string }[] };

export type ArticleFormInitialData = {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
  videoUrl: string | null;
  videoProvider: string | null;
  videoDurationSeconds: number | null;
  isVideoFeatured: boolean;
  categoryId: string | null;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  productPlacements?: { product: ApiProduct }[];
};

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function ArticleForm({
  initialData,
  mode = "article",
}: {
  initialData?: ArticleFormInitialData;
  mode?: "article" | "video";
}) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? "");
  const [publishedAt, setPublishedAt] = useState(toDateInputValue(initialData?.publishedAt ?? null));
  const [excerpt, setExcerpt] = useState(initialData?.excerpt ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initialData?.coverImageUrl ?? "");
  const [videoUrl, setVideoUrl] = useState(initialData?.videoUrl ?? "");
  const [videoProvider, setVideoProvider] = useState(initialData?.videoProvider ?? "");
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(initialData?.videoDurationSeconds == null ? "" : String(initialData.videoDurationSeconds));
  const [isVideoFeatured, setIsVideoFeatured] = useState(initialData?.isVideoFeatured ?? false);
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState<ApiProduct[]>(
    initialData?.productPlacements?.map((placement) => placement.product) ?? [],
  );
  const [productIds, setProductIds] = useState(
    initialData?.productPlacements?.map((placement) => placement.product.id) ?? [],
  );
  const [productLoadError, setProductLoadError] = useState<string | null>(null);

  const [categories, setCategories] = useState<ApiCategory[]>([]);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const contentImageInputRef = useRef<HTMLInputElement>(null);
  const hasInitializedContent = useRef(false);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"draft" | "publish" | null>(null);

  useEffect(() => {
    fetch("/api/article-categories")
      .then((res) => res.json())
      .then((json: ApiCategory[]) => setCategories(Array.isArray(json) ? json : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setProductLoadError(null);
      try {
        const params = new URLSearchParams({ limit: "50", activeOnly: "true" });
        if (productSearch.trim()) params.set("search", productSearch.trim());
        const response = await fetch(`/api/admin/products?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = (await response.json()) as { products?: ApiProduct[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Gagal memuat produk");
        setProducts((current) => {
          const merged = new Map(current.map((product) => [product.id, product]));
          for (const product of result.products ?? []) merged.set(product.id, product);
          return [...merged.values()];
        });
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setProductLoadError(error.message);
        }
      }
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [productSearch]);

  // contentEditable diisi sekali dari initialData (edit mode) supaya kursor
  // tidak lompat tiap re-render. Perubahan berikutnya dibaca lewat onInput.
  useEffect(() => {
    if (contentRef.current && !hasInitializedContent.current) {
      contentRef.current.innerHTML = initialData?.content ?? "";
      hasInitializedContent.current = true;
    }
  }, [initialData?.content]);

  const uploadFile = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Gagal mengunggah gambar");
    return json.url as string;
  }, []);

  const handleCoverFile = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    setIsUploadingCover(true);
    try {
      const url = await uploadFile(file);
      setCoverImageUrl(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Gagal mengunggah gambar");
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleCoverFile(e.dataTransfer.files?.[0]);
  };

  const exec = (command: string, value?: string) => {
    contentRef.current?.focus();
    document.execCommand(command, false, value);
  };

  const handleInsertLink = () => {
    const url = window.prompt("Masukkan URL tautan:");
    if (url) exec("createLink", url);
  };

  const handleInsertContentImage = async (file: File | undefined) => {
    if (!file) return;
    try {
      const url = await uploadFile(file);
      exec("insertImage", url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Gagal mengunggah gambar");
    }
  };

  const buildPayload = (status: "DRAFT" | "PUBLISHED") => ({
    title: title.trim(),
    excerpt: excerpt.trim() || null,
    content: contentRef.current?.innerHTML ?? "",
    coverImageUrl: coverImageUrl || null,
    videoUrl: videoUrl.trim() || null,
    videoProvider: videoProvider.trim() || null,
    videoDurationSeconds: videoDurationSeconds ? Number(videoDurationSeconds) : null,
    isVideoFeatured,
    categoryId: categoryId || null,
    status,
    publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
    productIds,
  });

  const handleSubmit = async (status: "DRAFT" | "PUBLISHED") => {
    setSubmitError(null);

    const content = contentRef.current?.innerHTML?.trim() ?? "";
    if (!title.trim()) {
      setSubmitError("Judul artikel wajib diisi");
      return;
    }
    if (!content) {
      setSubmitError("Konten artikel wajib diisi");
      return;
    }

    setSubmitting(status === "PUBLISHED" ? "publish" : "draft");
    try {
      const res = await fetch(
        isEdit ? `/api/admin/articles/${initialData!.id}` : "/api/admin/articles",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload(status)),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Gagal menyimpan artikel");

      router.push(mode === "video" ? "/admin/video" : "/admin/artikel");
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Gagal menyimpan artikel");
      setSubmitting(null);
    }
  };

  const toolbarButtons = [
    { icon: Bold, label: "Tebal", command: "bold" },
    { icon: Italic, label: "Miring", command: "italic" },
    { icon: Underline, label: "Garis bawah", command: "underline" },
    { icon: List, label: "Daftar poin", command: "insertUnorderedList" },
    { icon: ListOrdered, label: "Daftar bernomor", command: "insertOrderedList" },
    { icon: Link2, label: "Tautan", command: "link" },
    { icon: ImageIcon, label: "Sisipkan gambar", command: "image" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-3xl"
    >
      <h1 className="font-display text-2xl font-semibold text-marica-ink">
        {isEdit ? (mode === "video" ? "Edit Video" : "Edit Artikel") : mode === "video" ? "Tambah Video Baru" : "Tambah Artikel Baru"}
      </h1>
      <p className="mt-1 font-body text-sm text-marica-ink-soft">
        {isEdit
          ? mode === "video" ? "Perbarui detail video di bawah ini." : "Perbarui isi artikel di bawah ini."
          : mode === "video" ? "Isi detail video yang ingin dipublikasikan." : "Isi detail artikel yang ingin dipublikasikan."}
      </p>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6">
          <div>
            <label htmlFor="title" className="mb-1.5 block font-body text-sm font-medium text-marica-ink">
              {mode === "video" ? "Judul Video" : "Judul Artikel"}
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={mode === "video" ? "Tulis judul video di sini..." : "Tulis judul artikel di sini..."}
              className="w-full rounded-xl border border-black/10 bg-marica-sky-light/30 px-4 py-2.5 font-body text-[15px] text-marica-ink outline-none transition placeholder:text-marica-ink-soft/50 focus:border-marica-amber focus:bg-white focus:ring-4 focus:ring-marica-amber/15"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="category" className="mb-1.5 block font-body text-sm font-medium text-marica-ink">
                Kategori
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-marica-sky-light/30 px-4 py-2.5 font-body text-[15px] text-marica-ink outline-none transition focus:border-marica-amber focus:bg-white focus:ring-4 focus:ring-marica-amber/15"
              >
                <option value="">Pilih kategori</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <section className="rounded-xl border border-black/10 bg-marica-sky-light/20 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-body text-sm font-semibold text-marica-ink">Widget produk artikel</h2>
                  <p className="font-body text-xs text-marica-ink-soft">Produk terpilih akan tampil sebagai rekomendasi di bawah artikel (maksimal 8).</p>
                </div>
                <span className="font-body text-xs text-marica-ink-soft">{productIds.length}/8 dipilih</span>
              </div>
              <input
                type="search"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Cari produk aktif..."
                aria-label="Cari produk untuk widget artikel"
                className="mt-3 w-full rounded-lg border border-black/10 bg-white px-3 py-2 font-body text-sm outline-none focus:border-marica-amber"
              />
              {productLoadError && <p role="alert" className="mt-2 font-body text-xs text-marica-rose-deep">{productLoadError}</p>}
              <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                {products
                  .filter((product) => (product.isActive || productIds.includes(product.id)) && product.name.toLowerCase().includes(productSearch.trim().toLowerCase()))
                  .map((product) => (
                    <label key={product.id} className="flex cursor-pointer items-center gap-3 rounded-lg bg-white px-3 py-2">
                      <input
                        type="checkbox"
                        checked={productIds.includes(product.id)}
                        disabled={!productIds.includes(product.id) && (!product.isActive || productIds.length >= 8)}
                        onChange={(event) => setProductIds((current) => event.target.checked
                          ? [...current, product.id]
                          : current.filter((id) => id !== product.id))}
                        className="h-4 w-4 accent-amber-700"
                      />
                      <span className="min-w-0 flex-1 truncate font-body text-sm text-marica-ink">{product.name}{!product.isActive ? " (nonaktif - hapus dari widget)" : ""}</span>
                      <span className="font-body text-xs text-marica-ink-soft">Rp {product.price.toLocaleString("id-ID")}</span>
                    </label>
                  ))}
              </div>
            </section>

            <div>
              <label htmlFor="publishedAt" className="mb-1.5 block font-body text-sm font-medium text-marica-ink">
                Tanggal Publish
              </label>
              <input
                id="publishedAt"
                type="date"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-marica-sky-light/30 px-4 py-2.5 font-body text-[15px] text-marica-ink outline-none transition focus:border-marica-amber focus:bg-white focus:ring-4 focus:ring-marica-amber/15"
              />
            </div>
          </div>

          <section className="rounded-2xl border border-marica-amber/30 bg-marica-amber/5 p-4">
            <div>
              <h2 className="font-body text-sm font-semibold text-marica-ink">Detail Video</h2>
                <p className="mt-1 font-body text-xs text-marica-ink-soft">Lengkapi sumber video untuk menampilkannya di Video Showcase.</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="videoUrl" className="mb-1.5 block font-body text-sm font-medium text-marica-ink">URL Video</label>
                <input id="videoUrl" type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 font-body text-[15px] text-marica-ink outline-none transition placeholder:text-marica-ink-soft/50 focus:border-marica-amber focus:ring-4 focus:ring-marica-amber/15" />
              </div>
              <div>
                <label htmlFor="videoProvider" className="mb-1.5 block font-body text-sm font-medium text-marica-ink">Provider</label>
                <select id="videoProvider" value={videoProvider} onChange={(e) => setVideoProvider(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 font-body text-[15px] text-marica-ink outline-none focus:border-marica-amber focus:ring-4 focus:ring-marica-amber/15">
                  <option value="">Pilih provider</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Vimeo">Vimeo</option>
                  <option value="Google Drive">Google Drive</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div>
                <label htmlFor="videoDurationSeconds" className="mb-1.5 block font-body text-sm font-medium text-marica-ink">Durasi (detik)</label>
                <input id="videoDurationSeconds" type="number" min="0" value={videoDurationSeconds} onChange={(e) => setVideoDurationSeconds(e.target.value)} placeholder="Contoh: 180" className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 font-body text-[15px] text-marica-ink outline-none focus:border-marica-amber focus:ring-4 focus:ring-marica-amber/15" />
              </div>
              <label className="flex items-center gap-2 text-sm text-marica-ink sm:col-span-2"><input type="checkbox" checked={isVideoFeatured} onChange={(e) => setIsVideoFeatured(e.target.checked)} className="h-4 w-4 accent-amber-700" /> Tampilkan sebagai video unggulan</label>
            </div>
          </section>

          <div>
            <label className="mb-1.5 block font-body text-sm font-medium text-marica-ink">Cover Image</label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative flex min-h-[140px] flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
                isDragging ? "border-marica-amber bg-marica-amber/5" : "border-black/15 bg-marica-sky-light/20"
              }`}
            >
              {coverImageUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImageUrl} alt="Cover artikel" className="h-32 w-full rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => setCoverImageUrl("")}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : isUploadingCover ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-marica-amber-dark" />
                  <span className="font-body text-sm text-marica-ink-soft">Mengunggah gambar...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-6 w-6 text-marica-ink-soft/60" />
                  <p className="font-body text-sm text-marica-ink-soft">
                    Drag &amp; drop gambar di sini, atau
                  </p>
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="font-body text-sm font-semibold text-marica-amber-text underline underline-offset-2"
                  >
                    pilih file
                  </button>
                  <span className="font-body text-xs text-marica-ink-soft/50">JPG, PNG, WEBP, maks. 5MB</span>
                </>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleCoverFile(e.target.files?.[0])}
              />
            </div>
            {uploadError && <p className="mt-1.5 font-body text-xs text-marica-rose-deep">{uploadError}</p>}
          </div>

          <div>
            <label htmlFor="excerpt" className="mb-1.5 block font-body text-sm font-medium text-marica-ink">
              {mode === "video" ? "Deskripsi Video" : "Ringkasan Singkat"}
            </label>
            <textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder={mode === "video" ? "Deskripsi singkat video (opsional)" : "Ringkasan singkat artikel (opsional, tampil di daftar artikel)"}
              className="w-full resize-none rounded-xl border border-black/10 bg-marica-sky-light/30 px-4 py-2.5 font-body text-[15px] text-marica-ink outline-none transition placeholder:text-marica-ink-soft/50 focus:border-marica-amber focus:bg-white focus:ring-4 focus:ring-marica-amber/15"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-body text-sm font-medium text-marica-ink">{mode === "video" ? "Catatan Video" : "Konten Artikel"}</label>
            <div className="overflow-hidden rounded-xl border border-black/10 bg-white focus-within:border-marica-amber focus-within:ring-4 focus-within:ring-marica-amber/15">
              <div className="flex flex-wrap items-center gap-1 border-b border-black/10 bg-marica-sky-light/20 px-2 py-1.5">
                {toolbarButtons.map(({ icon: Icon, label, command }) => (
                  <button
                    key={label}
                    type="button"
                    title={label}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (command === "link") handleInsertLink();
                      else if (command === "image") contentImageInputRef.current?.click();
                      else exec(command);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-marica-ink-soft transition hover:bg-white hover:text-marica-ink active:scale-[0.95] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marica-amber/20"
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
                <input
                  ref={contentImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleInsertContentImage(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>
              <div
                ref={contentRef}
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Mulai menulis artikel kamu di sini..."
                className="prose-content min-h-[240px] px-4 py-3 font-body text-[15px] leading-relaxed text-marica-ink outline-none [&_a]:text-marica-amber-text [&_a]:underline [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-lg [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
              />
            </div>
            <p className="mt-1.5 font-body text-xs text-marica-ink-soft/50">
              Editor sederhana: tebal, miring, garis bawah, daftar, tautan, dan gambar.
            </p>
          </div>

          {submitError && <p className="font-body text-sm text-marica-rose-deep">{submitError}</p>}

          <div className="flex flex-col-reverse gap-3 border-t border-black/5 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push(mode === "video" ? "/admin/video" : "/admin/artikel")}
              className="rounded-full border border-black/10 px-5 py-2.5 font-body text-sm font-semibold text-marica-ink-soft transition hover:bg-black/3 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marica-ink/10"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={submitting !== null}
              onClick={() => handleSubmit("DRAFT")}
              className="flex items-center justify-center gap-2 rounded-full border border-marica-amber-dark px-5 py-2.5 font-body text-sm font-semibold text-marica-amber-text transition hover:bg-marica-amber/10 active:scale-[0.97] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marica-amber/20"
            >
              {submitting === "draft" && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan sebagai Draft
            </button>
            <button
              type="button"
              disabled={submitting !== null}
              onClick={() => handleSubmit("PUBLISHED")}
              className="flex items-center justify-center gap-2 rounded-full bg-marica-amber-dark px-5 py-2.5 font-body text-sm font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[0.97] disabled:opacity-70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-marica-amber/25"
            >
              {submitting === "publish" && <Loader2 className="h-4 w-4 animate-spin" />}
              Publish Sekarang
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
