# Kaii OTP

**Kaii OTP** — _Your Number. Your Code. Your Control._

Platform penyewaan nomor virtual untuk menerima SMS OTP. Proyek ini bukan mockup: katalog, pesanan, OTP, saldo provider, dan pembatalan terhubung ke **JasaOTP API v2** melalui proxy server; autentikasi, database, RLS, ledger saldo, dan pesanan memakai Supabase.

> Bahasa antarmuka: Bahasa Indonesia. Mata uang: Rupiah (IDR). Nama produk harus tetap ditulis **Kaii OTP**.

---

## 1. Ringkasan fitur

- Landing page premium dark mode dengan statistik **live** dari provider (bukan angka rekaan).
- Registrasi, login, logout, ganti kata sandi, dan proteksi dashboard dengan Supabase Auth berbasis cookie.
- Dashboard dengan saldo, pesanan aktif, total pesanan, OTP diterima, navigasi cepat, dan polling pesanan terbaru.
- Katalog Beli OTP: pencarian negara, operator dinamis, pencarian layanan, filter stok, sortir harga, kartu layanan, konfirmasi harga sebelum beli.
- Detail pesanan: nomor besar, salin nomor/ID, status pesanan, kode OTP, salin OTP, pemeriksaan manual, polling efisien, countdown **hanya jika provider mengirim expiry**, dan pembatalan dengan dialog konfirmasi.
- Riwayat transaksi ledger, deposit manual yang diverifikasi admin, profil, pengaturan lokal, pesan kontak, dan panel admin.
- Saldo provider hanya untuk admin, dengan tombol refresh dan penjelasan bahwa itu **bukan saldo pengguna**.
- Loading skeleton, toast, empty state, error state, animasi halus, sidebar desktop, dan navigasi ringkas mobile.

---

## 2. Teknologi

| Bagian | Teknologi |
| --- | --- |
| Frontend | Next.js 15 App Router, TypeScript, Tailwind CSS |
| UI | shadcn/ui-style components (Radix UI), Lucide Icons, Sonner |
| Backend | Next.js Route Handlers, service layer terpisah |
| Auth & Database | Supabase Auth, PostgreSQL, Row Level Security |
| Provider OTP | `https://api.jasaotp.id/v2/` |
| Deployment | Vercel |
| Pengujian | Vitest |

Font Plus Jakarta Sans dibundel lokal lewat `@fontsource/plus-jakarta-sans`, sehingga build tidak bergantung pada Google Fonts.

---

## 3. Struktur proyek

```text
src/
├── app/
│   ├── api/                    # Route handlers internal
│   ├── auth/callback/          # Email verification / magic-link callback
│   ├── dashboard/              # Dashboard, beli, pesanan, transaksi, deposit, profil, pengaturan, admin
│   ├── dokumentasi/            # Dokumentasi teknis
│   ├── kebijakan-privasi/
│   ├── ketentuan-layanan/
│   ├── kontak/
│   ├── konfigurasi/            # Status environment variable tanpa membocorkan nilai
│   ├── login/, register/
│   ├── layout.tsx, page.tsx, globals.css
├── components/                 # UI primitives, landing, dashboard, catalog, orders, wallet, admin
├── lib/
│   ├── api/                    # Response, error, CSRF/origin, rate limit, request parsing
│   ├── auth/                   # Session, page guards, zod validation
│   ├── db/                     # Repository + RPC helpers
│   ├── orders/                 # Status, mapper, business service
│   ├── provider/               # Fixed client, response parsers, caching service
│   ├── supabase/               # Server/admin clients, config
│   └── hooks/                  # Polling dan preferensi lokal
├── middleware.ts               # Refresh session + proteksi /dashboard
supabase/migrations/            # SQL skema, RLS, fungsi atomik
public/openapi.json             # Deskripsi endpoint internal
.env.example                    # Template environment variable
vercel.json                     # Cron cleanup
```

---

## 4. Kontrak API JasaOTP v2

Dokumentasi publik yang dipakai: [API Dokumentasi v2](https://www.ditznesia.id/api-v2).

Base URL **tetap** dan hanya ada di `src/lib/provider/client.ts`:

```text
https://api.jasaotp.id/v2/
```

| Endpoint | Parameter | Catatan implementasi |
| --- | --- | --- |
| `GET /negara.php` | — | Tidak memakai `api_key`. Envelope `success` + `data[]`. |
| `GET /layanan.php?negara={id}` | `negara` | Tidak memakai `api_key`. Respons dokumentasi berupa map negara → kode layanan → `harga`, `stok`, `layanan`. |
| `GET /operator.php?negara={id}` | `negara` | Tidak memakai `api_key`. `any` dipilih pertama **hanya jika provider menyediakannya**. |
| `GET /order.php` | `api_key`, `negara`, `layanan`, `operator` | `api_key` ditambahkan hanya di server. Wajib `success: true`, `order_id`, dan `number`. |
| `GET /sms.php` | `api_key`, `id` | Parsing `data.otp`/field terkait. Respons mentah tidak ditampilkan. |
| `GET /balance.php` | `api_key` | Admin only di Kaii OTP. `data.saldo` ditampilkan sebagai IDR. |
| `GET /cancel.php` | `api_key`, `id` | Refund hanya diproses jika `data.refunded_amount` resmi tersedia. |

Jika provider mengubah struktur JSON, cukup sesuaikan `src/lib/provider/parse.ts` dan `src/lib/provider/service.ts`. UI dan skema database tidak perlu mengetahui format mentah provider.

### Batas kontrak yang dipegang aplikasi

- Dokumentasi order v2 hanya menjanjikan `order_id` dan `number`. Karena itu **tidak ada countdown rekaan**. Jika provider kelak mengirim `expired_at`/`expires_at` yang jelas, parser akan menyimpannya dan UI otomatis menampilkan countdown.
- Dokumentasi tidak menyediakan endpoint deposit/pembayaran pengguna. Karena itu Kaii OTP memakai **permintaan deposit manual yang diverifikasi admin**, bukan klaim pembayaran otomatis.
- Dokumentasi saldo tidak menyertakan field mata uang. Karena harga layanan memakai Rupiah, saldo ditampilkan sebagai IDR dengan catatan pada UI. Sesuaikan label di service layer jika provider Anda menyatakan satuan lain.
- Timeout atau respons tidak valid pada `order.php`/`cancel.php` dianggap **hasil belum pasti**: pesanan ditandai `needs_review`, pengguna diminta tidak mengulang, dan tidak ada refund palsu.

---

## 5. Keamanan

- `JASAOTP_API_KEY` hanya dibaca oleh kode server. Tidak ada di browser, JavaScript klien, localStorage, database user, log, atau repository.
- `SUPABASE_SERVICE_ROLE_KEY` juga server-only dan tidak diberi prefix `NEXT_PUBLIC_`.
- Endpoint provider memakai URL tetap dan union endpoint tertutup; tidak ada URL bebas dari pengguna.
- Semua request provider memakai timeout 10 detik, `no-store`, dan sanitasi pesan error.
- Kesuksesan tidak ditentukan dari HTTP 200 saja: `success`, struktur `data`, ID order, nomor, dan nominal refund divalidasi.
- Harga diambil ulang dari provider di server sebelum debit. Browser tidak dapat mengirim `user_id`, `status`, `price`, atau saldo.
- Setiap order memakai `Idempotency-Key`. Fungsi SQL `reserve_order` melakukan debit dan insert order dalam satu transaksi.
- Pembatalan memakai klaim atomik `request_order_cancel`. Klik kedua tidak memanggil provider lagi.
- Refund hanya terjadi setelah `cancel.php` mengonfirmasi `success: true` dan `refunded_amount`. Nominal dibatasi maksimal harga pesanan.
- Route state-changing memakai pemeriksaan same-origin/CSRF, validasi zod, dan rate limiting.
- Rate limiter utama memakai fungsi SQL atomik `consume_rate_limit`; ada fallback lokal per instance untuk development.
- RLS Supabase membatasi pembacaan `profiles`, `orders`, `transactions`, dan `deposit_requests` hanya untuk pemiliknya.
- Fungsi `SECURITY DEFINER` diberikan hanya ke `service_role`, dicabut dari `anon` dan `authenticated`.
- Kode OTP disimpan maksimal 15 menit lalu dihapus otomatis. Respons SMS mentah tidak disimpan dan OTP tidak ditulis ke log.
- Status `needs_review` menghentikan polling/aksi berulang sampai administrator meninjau.
- Saldo provider dan saldo dompet pengguna sengaja dipisahkan.

---

## 6. Variabel environment

Salin `.env.example` menjadi `.env.local` untuk lokal. Jangan commit file `.env*`.

| Variabel | Wajib | Tempat | Keterangan |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Ya | Server + browser | URL proyek Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ya | Server + browser | Anon key Supabase, aman dipublikasikan. |
| `SUPABASE_SERVICE_ROLE_KEY` | Ya | **Server only** | Kunci privileged untuk RPC/ledger. Jangan pakai `NEXT_PUBLIC_`. |
| `JASAOTP_API_KEY` | Ya | **Server only** | API key JasaOTP v2. |
| `ADMIN_EMAILS` | Opsional | Server | Daftar email admin dipisah koma. Tetap wajib `profiles.role = 'admin'`. |
| `CRON_SECRET` | Opsional | Server | Bearer token untuk `/api/cron/cleanup`. |
| `NEXT_PUBLIC_APP_URL` | Opsional | Server + browser | Origin kanonik untuk redirect dan cek same-origin. |
| `NEXT_PUBLIC_DEPOSIT_INSTRUCTIONS` | Opsional | Browser | Teks instruksi transfer manual. Jangan mengarang rekening; isi sesuai bisnis Anda. |

Halaman `/konfigurasi` menampilkan variabel mana yang sudah terisi **tanpa menampilkan nilainya**. Endpoint `/api/health` memberi status boolean untuk monitoring.

---

## 7. Menjalankan lokal

Prasyarat: Node.js 20.9+ dan npm.

```bash
git clone https://github.com/HOOOOOOQ/otpotp.git
cd otpotp
npm install
cp .env.example .env.local
# isi .env.local dengan kredensial Supabase dan JASAOTP_API_KEY
npm run dev
```

Buka `http://localhost:3000`.

Perintah lain:

```bash
npm run typecheck   # TypeScript strict
npm run lint        # ESLint / Next.js rules
npm test            # 40 unit & integration tests
npm run build       # Production build
npm start           # Jalankan hasil build
npm run check       # Semua pemeriksaan di atas
```

Tanpa kredensial, landing page dan halaman legal tetap dapat dibuka. Statistik katalog akan menampilkan `—` dan dashboard akan diarahkan ke `/konfigurasi` sampai variabel wajib terisi. Aplikasi tidak mengisi kekosongan itu dengan data palsu.

---

## 8. Menyiapkan Supabase

1. Buat proyek baru di [Supabase](https://supabase.com/).
2. Ambil **Project URL**, **anon/public key**, dan **service_role key** dari Project Settings → API.
3. Buka **SQL Editor**, jalankan seluruh isi:

   ```text
   supabase/migrations/202610270001_initial.sql
   ```

   Migrasi membuat `profiles`, `orders`, `transactions`, `order_requests`, `cancel_attempts`, `deposit_requests`, `support_messages`, `rate_limits`, trigger profil, RLS, dan semua fungsi atomik.

4. Buka **Authentication → Providers**, aktifkan **Email/Password**.
5. Jika email confirmation aktif, daftarkan redirect URL:

   ```text
   http://localhost:3000/auth/callback
   https://DOMAIN_ANDA/auth/callback
   ```

   pada **Authentication → URL Configuration → Redirect URLs**.

6. Untuk produksi, siapkan SMTP Supabase agar email verifikasi benar-benar terkirim.
7. Daftarkan akun pertama lewat `/register`, lalu jadikan admin dari SQL Editor:

   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'email-admin-anda@example.com';
   ```

   Ganti email di atas dengan email akun Anda. Jika memakai `ADMIN_EMAILS`, masukkan email yang sama ke environment variable tersebut.

8. Isi `NEXT_PUBLIC_DEPOSIT_INSTRUCTIONS` dengan instruksi transfer resmi Anda. Jangan memakai nomor rekening contoh.

### Deposit manual

1. Pengguna membuka `/dashboard/deposit`, mengisi nominal dan referensi pembayaran.
2. Status permintaan menjadi `pending`; saldo **belum** berubah.
3. Admin membuka `/dashboard/admin/deposit`, memverifikasi pembayaran di luar aplikasi, lalu menyetujui atau menolak.
4. Fungsi SQL `approve_deposit_request` mengkredit saldo dan menulis ledger dalam satu transaksi dengan idempotency key `deposit:<request_id>`. Klik ganda tidak menambah saldo dua kali.

Tanpa langkah verifikasi admin, fitur beli tidak dapat dipakai karena saldo awal pengguna adalah `0`. Ini disengaja: tidak ada saldo gratis dan tidak ada kredit otomatis palsu.

---

## 9. Alur pembelian dan OTP

1. Browser memilih `negara`, `layanan`, `operator` dan mengirim `POST /api/orders` dengan header `Idempotency-Key`.
2. Server mengambil ulang negara, layanan, operator, **harga**, dan stok terbaru dari provider.
3. Fungsi SQL `reserve_order` mengecek saldo, mendebit, membuat order `processing`, dan menulis transaksi `debit`.
4. Server memanggil `order.php` dengan API key. Jika respons definitif gagal, `refund_unfilled_order` mengembalikan saldo. Jika timeout/format tidak dapat dipastikan, order menjadi `needs_review` tanpa refund otomatis.
5. Jika berhasil, `finalize_order_creation` menyimpan `provider_order_id`, nomor, dan status `waiting_otp`.
6. Halaman detail memanggil `GET /api/orders/{id}/otp`. Polling berhenti saat kode diterima atau status akhir; tab tersembunyi tidak melakukan request.
7. Kode disimpan 15 menit. Fungsi `purge_expired_otp` dan cron `/api/cron/cleanup` menghapusnya.
8. Pembatalan memakai `POST /api/orders/{id}/cancel` + `Idempotency-Key`. Hanya status `waiting_otp` yang dapat dibatalkan; refund mengikuti `refunded_amount` resmi provider.

Semua detail, OTP, dan pembatalan memvalidasi `user_id` dari sesi server, sehingga IDOR dicegah.

---

## 10. Endpoint internal

Ringkasan lengkap ada di `public/openapi.json` dan halaman `/dokumentasi`.

- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/password`.
- Katalog: `/api/countries`, `/api/services?negara=`, `/api/operators?negara=`.
- Pesanan: `/api/orders`, `/api/orders/{id}`, `/api/orders/{id}/otp`, `/api/orders/{id}/cancel`.
- Dompet: `/api/wallet/summary`, `/api/wallet/transactions`, `/api/wallet/deposits`.
- Dashboard: `/api/dashboard/summary`.
- Profil: `/api/profile`.
- Admin: `/api/provider/balance`, `/api/admin/deposits`, `/api/admin/deposits/{id}`, `/api/admin/support/messages`, `/api/admin/support/messages/{id}`.
- Utilitas: `/api/health`, `/api/support/messages`, `/api/cron/cleanup`.

Semua respons mengikuti envelope:

```json
{ "success": true, "data": {} }
```

atau

```json
{ "success": false, "error": { "code": "STRING", "message": "Pesan ramah" } }
```

Pesan error provider disanitasi; respons mentah tidak dikirim ke browser.

---

## 11. Deployment ke Vercel

1. Push repository ini ke GitHub.
2. Di Vercel, pilih **Add New → Project** dan import repository.
3. Framework otomatis terdeteksi sebagai **Next.js**.
4. Biarkan Build Command `npm run build` dan Output default Next.js.
5. Tambahkan environment variable pada **Project Settings → Environment Variables** untuk Production, Preview, dan Development sesuai kebutuhan:

   ```text
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   JASAOTP_API_KEY
   ADMIN_EMAILS
   NEXT_PUBLIC_APP_URL
   CRON_SECRET
   NEXT_PUBLIC_DEPOSIT_INSTRUCTIONS
   ```

   **Peringatan:** tiga kunci rahasia (`SUPABASE_SERVICE_ROLE_KEY`, `JASAOTP_API_KEY`, `CRON_SECRET`) jangan pernah diberi prefix `NEXT_PUBLIC_`.

6. Set `NEXT_PUBLIC_APP_URL` ke origin produksi, misalnya `https://kaii-otp.vercel.app` (ganti dengan domain Anda).
7. Tambahkan URL callback produksi ke Supabase Authentication → Redirect URLs:

   ```text
   https://DOMAIN_ANDA/auth/callback
   ```

8. Deploy. Setelah deploy, buka:
   - `/` — landing page dengan katalog live.
   - `/api/health` — status konfigurasi.
   - `/konfigurasi` — checklist environment tanpa nilai rahasia.
9. Jalankan SQL migrasi jika belum dijalankan, buat akun, jadikan admin, lalu isi instruksi deposit.
10. Uji alur: register → deposit manual → admin setujui → beli nomor → cek OTP → batalkan (jika masih menunggu) → cek riwayat transaksi.

### Cron cleanup

`vercel.json` menjadwalkan:

```json
{ "path": "/api/cron/cleanup", "schedule": "0 * * * *" }
```

Vercel Cron mengirim header `Authorization: Bearer <CRON_SECRET>`. Jika paket Vercel Anda membatasi cron harian, ubah jadwal menjadi misalnya `0 3 * * *`. Pembersihan juga terjadi saat detail/daftar pesanan dibaca, sehingga kode OTP kedaluwarsa tidak menunggu cron untuk dihapus dari tampilan.

---

## 12. Pengujian

`npm test` menjalankan 40 pengujian yang mencakup:

- Parsing kontrak negara, layanan, operator, order, OTP, cancel, dan saldo provider.
- Validasi `success` dan struktur JSON; penolakan order tanpa nomor/ID.
- Tidak adanya `api_key` pada endpoint katalog publik; API key hanya pada endpoint server.
- Statistik landing dihitung dari response provider, bukan angka statis.
- Pembelian: harga diverifikasi ulang, debit atomik, duplikasi idempoten, stok nol, kegagalan definitif, dan timeout yang tidak boleh direfund otomatis.
- OTP: kode diterima, status menunggu, status terminal, dan pencegahan akses pesanan orang lain.
- Pembatalan: refund resmi provider, pencegahan klik ganda, dan timeout yang ditandai untuk ditinjau.
- CSRF/same-origin, rate limiting, sanitasi redirect, idempotency key, dan invariant keamanan repository.
- SQL migrasi mengandung RLS, grant `service_role`, dan pembersihan OTP.

`npm run check` menjalankan typecheck, lint, test, dan production build sekaligus.

---

## 13. Troubleshooting

| Gejala | Penyebab umum | Tindakan |
| --- | --- | --- |
| Dashboard redirect ke `/konfigurasi` | Supabase/service role/provider key belum lengkap | Isi environment variable, redeploy, cek `/api/health`. |
| Statistik landing `—` | Provider tidak dapat dijangkau atau respons tidak valid | Cek koneksi server ke `api.jasaotp.id`; tidak ada fallback angka palsu. |
| `PROVIDER_NOT_CONFIGURED` | `JASAOTP_API_KEY` kosong | Isi hanya di server/Vercel env. |
| `DATABASE_NOT_READY` | Migrasi SQL belum dijalankan | Jalankan `supabase/migrations/202610270001_initial.sql`. |
| `INSUFFICIENT_BALANCE` | Saldo pengguna kurang | Ajukan deposit dan tunggu verifikasi admin. |
| `CANCEL_IN_PROGRESS` | Pembatalan sudah diklaim | Jangan klik ulang; tunggu atau minta admin tinjau. |
| `PROVIDER_RESULT_UNKNOWN` / `CANCEL_RESULT_UNKNOWN` | Timeout/respons provider tidak dapat dipastikan | Jangan ulangi; hubungi dukungan dengan ID pesanan. |
| Email verifikasi tidak masuk | SMTP/redirect Supabase belum disetel | Konfigurasi SMTP dan Redirect URLs. |
| `/api/cron/cleanup` 503 | `CRON_SECRET` belum diisi | Isi variabel environment yang sama di Vercel. |

---

## 14. Catatan produksi

- Ganti identitas dan kontak contoh pada halaman legal dengan identitas operator sah sebelum produksi.
- Gunakan SMTP dan domain sendiri untuk email verifikasi.
- Simpan cadangan API key dan service role key di secret manager, bukan repository.
- Pantau status `needs_review`; provider tidak menyediakan endpoint status pesanan dalam dokumentasi v2, jadi rekonsiliasi kasus timeout harus dilakukan manual.
- Audit log harus tetap hanya mencatat kode error, status, dan ID; jangan menambahkan logger yang mencetak body provider, OTP, atau kredensial.
- Uji ulang parser bila provider merilis perubahan kontrak API.

---

**Kaii OTP** dibangun untuk siap diuji dan di-deploy, dengan prioritas pada keamanan API key, integritas saldo, validasi kepemilikan pesanan, dan pengalaman pengguna yang premium.
