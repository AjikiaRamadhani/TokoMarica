# Matriks Role dan Marica Points

## Role aplikasi

| Role | Cakupan utama |
| --- | --- |
| `ADMIN` | Katalog, inventaris, event, CMS, printable, analytics, CRM, dan pengaturan poin. |
| `KASIR` | POS toko fisik, tiket area bermain, table fee, pencarian member, transaksi poin/voucher di toko, dan validasi check-in. |
| `USER` | Akun orang tua: belanja, booking event, printable, edugames, riwayat transaksi, e-ticket, dan saldo poin. |

Role disimpan di enum Prisma `Role`. Akun baru tetap dibuat sebagai `USER`. Endpoint back-office yang sudah ada tetap khusus `ADMIN`; guard `requireRole` disiapkan agar endpoint POS dapat dibatasi ke `ADMIN` atau `KASIR` saat modul kasir dibuat.

## Marica Points

Target bisnis:

- Poin reward diperoleh dari aktivitas pembelian yang berhasil dibayar.
- Poin juga dapat diberikan dari aktivitas gamifikasi sesuai kebijakan produk.
- Poin ditukarkan menjadi voucher belanja, bukan menjadi saldo tunai.
- Kasir dapat mencari member berdasarkan email/nomor WhatsApp untuk menambah atau memakai voucher.
- Admin mengatur aturan perolehan poin, katalog voucher, masa berlaku, dan penyesuaian manual.

## Status implementasi

Yang sudah tersedia:

- Saldo dan riwayat poin user.
- Earn dari order produk dan booking event yang sudah `PAID`.
- Download printable tidak memberikan poin; printable hanya berfungsi sebagai lead magnet.
- Idempotency webhook dan reversal saat order dibatalkan.
- Katalog voucher admin dengan status `DRAFT`, `ACTIVE`, dan `INACTIVE`.
- Penukaran poin menjadi voucher melalui wallet voucher user.
- Validasi voucher milik user saat checkout produk dan transaksi POS kasir.
- Pembatalan/reversal poin saat transaksi yang memberi poin dibatalkan.

Poin digunakan untuk menukar voucher. Nilai diskon dan biaya penukaran diatur pada katalog voucher oleh admin.
Checkout masih menerima `redeemPoints` sebagai kompatibilitas dengan alur lama (`1 poin = Rp1`); alur baru yang direkomendasikan adalah menukar poin menjadi voucher terlebih dahulu. Field lama dapat dihapus setelah seluruh client lama tidak lagi mengirimkannya.
