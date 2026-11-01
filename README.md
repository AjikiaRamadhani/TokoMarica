# Marica Web (toko.marica.id)

Aplikasi web full-stack untuk Marica.id yang menggabungkan **etalase online** dan **sistem operasional toko fisik**. Terdiri dari halaman publik untuk pelanggan, area akun pengguna, dasbor admin, dan modul kasir (POS).

- Situs produksi: https://toko.marica.id
- Desain UI/UX: [Figma - Magang Marica.id](https://www.figma.com/design/1uU2Cp7BFR6lpyEHNyC47P/Magang-Marica.id?node-id=0-1&t=6ipAvxlV1a5zwqgb-1)
- Dokumentasi API (lokal): http://localhost:3000/api-docs

## Fitur Utama

| Kelompok | Fitur |
| --- | --- |
| Toko online | Katalog, kategori, keranjang, checkout, pembayaran, voucher, ulasan, pre-order, pelacakan pengiriman (RajaOngkir/Komerce) |
| Konten | Artikel (kategori dan komentar), video, pengaturan konten landing page (hero, statistik, FAQ, testimoni) |
| Event | Daftar event, pendaftaran, tiket QR, check-in, tiket via email |
| Playpass dan reservasi | Booking Playpass, reservasi meja/space, pre-order F&B |
| Printable dan edugames | Printable wajib login, unduhan via signed URL, kirim via email dan WhatsApp, edugames eksternal |
| Poin dan voucher | Marica Points (perolehan, penukaran, pembatalan), katalog voucher, dompet voucher |
| Langganan | Paket langganan, siklus tagihan, pengiriman berkala, profil anak |
| B2B | Inquiry, item quotation, PDF penawaran |
| POS / kasir | Shift, transaksi toko, pencarian member, tiket Playpass, table fee, pesanan F&B, stok Experience Store |
| Admin | Produk, kategori, inventaris, pesanan, event, artikel, printable, voucher, langganan, B2B, analytics |

## Peran Pengguna

| Peran | Cakupan |
| --- | --- |
| `ADMIN` | Katalog, inventaris, event, CMS, printable, analytics, CRM, pengaturan poin |
| `KASIR` | POS toko fisik, tiket area bermain, table fee, pencarian member, validasi check-in |
| `USER` | Akun orang tua: belanja, booking event, printable, edugames, riwayat transaksi, saldo poin. Akun baru selalu dibuat sebagai `USER` |

Detail matriks peran dan poin ada di [`docs/roles-and-points.md`](docs/roles-and-points.md).

## Teknologi

| Layer | Teknologi |
| --- | --- |
| Framework | Next.js 16 (App Router, output standalone), React 19, TypeScript 5 |
| Styling | Tailwind CSS 4, Framer Motion, Lucide React, React Icons |
| Database | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`) |
| Autentikasi | NextAuth (Auth.js) v5 beta, email/password (bcryptjs) dan Google OAuth |
| Pembayaran | WinPay (bawaan) atau Midtrans, dipilih lewat `PAYMENT_PROVIDER` |
| Pengiriman | RajaOngkir via API Komerce |
| Penyimpanan file | Supabase Storage (bucket `printables`) |
| Email | Nodemailer (SMTP) |
| Notifikasi | WhatsApp Cloud API (opsional) |
| QR code | `qrcode` dan `html5-qrcode` |
| Dokumentasi API | Swagger UI (`/api-docs`, `/api/swagger`) |
| CI/CD | GitHub Actions, deploy ke hosting cPanel via FTP |

## Memulai

### Prasyarat

- Node.js 20 atau lebih baru (CI memakai Node 20)
- PostgreSQL (lokal atau hosted)
- npm

### Instalasi

```bash
git clone https://github.com/AjikiaRamadhani/TokoMarica.git
cd TokoMarica
npm install
```

Buat file `.env` di root proyek (lihat bagian [Environment](#environment)), lalu:

```bash
npx prisma generate
npx prisma migrate deploy
npx prisma db seed        # opsional, data awal
npm run dev
```

Buka http://localhost:3000.

> `prisma db seed` mengisi konten landing page dan membuat akun contoh `admin@marica.id` (`ADMIN`), `kasir@marica.id` (`KASIR`), dan `bunda.rani@gmail.com` (`USER`) **tanpa kata sandi**. Atur kata sandi lewat halaman `/lupa-password` atau ubah peran langsung di tabel `users`. Jangan menjalankan seed pada database produksi tanpa meninjau datanya.

### Script

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Jalankan server development |
| `npm run build` | Build produksi (menjalankan `prisma generate` lalu `next build --webpack`) |
| `npm run lint` | Pemeriksaan ESLint |
| `npx tsc --noEmit` | Pemeriksaan tipe TypeScript |
| `npm run test:points` | Uji logika poin |
| `npm run test:smoke` | Smoke test backend (perlu `SMOKE_TEST=true`) |

## Environment

Salin contoh berikut ke `.env`. **Jangan commit file `.env` dan jangan menaruh nilai asli di README.**

```env
# Database dan auth
DATABASE_URL=
DIRECT_URL=                      # opsional, dipakai untuk migrasi
AUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000 # URL publik aplikasi; dipakai untuk redirect selesai pembayaran
GOOGLE_CLIENT_ID=                # opsional
GOOGLE_CLIENT_SECRET=            # opsional

# Pembayaran
PAYMENT_PROVIDER=winpay          # winpay (bawaan bila kosong) atau midtrans
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false
NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=false
WINPAY_API_KEY=
WINPAY_SECRET_KEY=
WINPAY_CALLBACK_PUBLIC_KEY= # public key WinPay untuk verifikasi X-Signature callback (alternatif: WINPAY_PUBLIC_KEY)
WINPAY_REQUIRE_WEBHOOK_SIGNATURE=false # selalu wajib di production; ubah true di sandbox saat callback sudah menyediakan signature
WINPAY_BASE_URL=
WINPAY_IS_PRODUCTION=false
WINPAY_INVOICE_EXPIRY_MINUTES=
WINPAY_DISABLE_WHATSAPP_FALLBACK=
MARICA_WHATSAPP_NUMBER=

# Storage
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=       # hanya untuk server

# Email SMTP
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
# Cadangan: GMAIL_USER, GMAIL_APP_PASSWORD

# WhatsApp Cloud API (opsional)
WHATSAPP_CLOUD_ACCESS_TOKEN=
WHATSAPP_CLOUD_PHONE_NUMBER_ID=
WHATSAPP_GRAPH_API_VERSION=
WHATSAPP_PRINTABLE_TEMPLATE_NAME=
WHATSAPP_PRINTABLE_TEMPLATE_LANGUAGE=

# Pengiriman
RAJAONGKIR_API_KEY=
RAJAONGKIR_ORIGIN_ID=            # ID kota asal; cari lewat GET /api/shipping/destinations?search=nama-kota

# Cron dan game
SUBSCRIPTION_CRON_SECRET=        # atau CRON_SECRET; untuk melindungi /api/cron/subscriptions
GAME_LAUNCH_TOKEN_SECRET=
```

Daftarkan webhook pembayaran di dasbor penyedia:

- `/api/webhooks/midtrans`
- `/api/webhooks/winpay`

## Struktur Folder

```
app/            Halaman Next.js dan route UI (publik, akun, /admin, /kasir)
app/api/        API route backend (135 route, termasuk webhooks/ dan cron/)
lib/            Logika bisnis: pembayaran, poin, inventaris, email, storage, pengiriman
prisma/         schema.prisma, migration (44), seed
tests/          Unit test dan smoke test
docs/           Dokumentasi tambahan (matriks peran dan poin)
types/          Definisi tipe TypeScript
public/         Aset statis
proxy.ts        Proteksi route /admin (middleware)
vercel.json     Definisi cron job langganan
.github/workflows/deploy.yml   Pipeline deploy
```

## Database

Skema ada di `prisma/schema.prisma` (PostgreSQL, 66 model dan 27 enum). Kelompok utama: akun dan autentikasi, konten landing page, artikel, produk dan toko, keranjang dan pesanan, inventaris, POS dan kasir, Playpass dan reservasi, event, printable, poin dan voucher, langganan, serta B2B.

Stok dipisah dua lokasi: `ONLINE_WAREHOUSE` (checkout website) dan `MARICA_STORE` (POS). Perpindahan stok dilakukan lewat **Admin > Inventaris**; stok gabungan tidak boleh diubah manual. Stok website dikurangi saat pembayaran berhasil (`lib/settle-order-payment.ts`), bukan saat checkout.

Kolom `midtransOrderId`, `midtransTransactionId`, dan `midtransSnapToken` dipakai bersama oleh WinPay dan Midtrans, jadi namanya tidak menunjukkan penyedia yang aktif.

## Pengujian

```bash
npm run lint
npx tsc --noEmit
npm run test:points
SMOKE_TEST=true npm run test:smoke
```

> Smoke test harus dijalankan terhadap **database khusus testing**, bukan production.

### Status verifikasi terakhir

- `npm run build`: berhasil.
- `npx tsc --noEmit`: berhasil.
- `npm run lint`: berhasil tanpa error; tersisa 29 warning non-blocking, terutama pola `set-state-in-effect`, penggunaan `<img>`, dan navigasi internal.
- `npm run test:points`: 5/5 test berhasil.
- Smoke test backend: 3 pass, 4 skip, 0 fail. Skenario yang skip membutuhkan fixture produk, akun admin, event aktif, atau printable aktif.
- Black-box testing: 58 dari 59 skenario sesuai. Skenario `PB-02` (stok berkurang setelah callback WinPay) lulus pada simulasi callback di laporan penjualan online, tetapi belum final karena belum diuji dengan callback WinPay asli. [ISI: konfirmasi status PB-02 dan tanggal uji ulang]

Smoke test yang membuat akun uji harus memakai database testing. Setelah pengujian selesai, hapus akun dan data uji agar tidak tercampur dengan data operasional.

## Deployment

Deploy otomatis lewat GitHub Actions (`Deploy toko.marica.id`) setiap ada push ke branch `main`:

1. Checkout dan setup Node 20
2. `npm ci`, `prisma generate`, dan pemeriksaan model Prisma
3. `npm run build` (output standalone)
4. Siapkan folder deploy dan tulis `tmp/restart.txt` (restart Passenger)
5. Unggah ke hosting cPanel via FTP

Secret yang harus ada di GitHub (Settings > Secrets): `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_SERVER_DIR`. Variabel environment aplikasi (bagian Environment) diatur terpisah di server.

## Catatan untuk Pengembang Berikutnya

- **Cron langganan:** `vercel.json` mendefinisikan cron untuk `/api/cron/subscriptions`, tetapi aplikasi berjalan di cPanel sehingga cron Vercel tidak berjalan. Fitur ini memang dijadwalkan untuk fase pengembangan berikutnya. Saat diaktifkan, panggil endpoint dari Cron Job cPanel menggunakan `SUBSCRIPTION_CRON_SECRET` atau `CRON_SECRET` melalui header `x-cron-secret`. Rute ini membuat tagihan lewat Midtrans Snap secara langsung, bukan lewat `lib/payment-gateway.ts`; periksa perilakunya bila `PAYMENT_PROVIDER=winpay`.
- **Kedaluwarsa pesanan:** `expireStaleOrders` (batas 30 menit) hanya dipanggil saat admin membuka daftar pesanan (`GET /api/admin/orders`), jadi pesanan yang tidak dibayar tidak otomatis menjadi `EXPIRED`. Pertimbangkan memanggilnya dari cron.
- **WinPay:** integrasi checkout sudah memiliki fallback WhatsApp dan endpoint callback. Pengujian pelunasan nyata masih ditahan karena menunggu aktivasi akun serta konfirmasi format callback dan signature dari pihak WinPay. Jangan menguji callback WinPay terhadap database produksi.
- **Fixture smoke test:** checkout, POS, event, dan printable membutuhkan data uji khusus. Jangan mengisi ID fixture produksi ke konfigurasi lokal tanpa memastikan dampak stok, pesanan, dan poin.
- **Autentikasi:** proyek memakai NextAuth/Auth.js v5 `5.0.0-beta.32`. Stable v5 belum tersedia; versi ini dipertahankan karena aplikasi sudah memakai API v5 (`auth()` dan `proxy.ts`). Upgrade hanya dilakukan setelah rilis stabil dan diuji.
- **Keamanan API:** `proxy.ts` melindungi `/admin`, dan API admin memakai `requireAdmin` atau guard admin ekuivalen sebagai lapisan kedua.
- **Poin lama:** checkout masih menerima `redeemPoints` (1 poin = Rp1) demi kompatibilitas. Alur yang direkomendasikan adalah menukar poin menjadi voucher; field lama dapat dihapus setelah tidak ada klien yang memakainya.
- **Dokumentasi API:** endpoint baru wajib ditambahkan ke `lib/swagger.ts`.

## Kontak

Pihak yang melanjutkan projek dapat menghubungi: [ISI: nama dan kontak PIC Marica.id]