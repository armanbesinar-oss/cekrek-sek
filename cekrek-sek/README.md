# 📸 Cekrek Sek — Kasir Photobooth

Sistem kasir modern untuk usaha photobooth, berbasis Vanilla JS + Supabase.

---

## 📁 Struktur Folder

```
cekrek-sek/
├── index.html    → Struktur HTML utama (SPA)
├── style.css     → Semua styling, dark mode, animasi
├── app.js        → Logic utama: transaksi, dashboard, export
├── config.js     → Konfigurasi Supabase (URL & API key)
└── README.md     → Panduan ini
```

---

## 🗄️ Setup Database Supabase

### Langkah 1 — Buat Akun & Project

1. Buka **https://supabase.com** → klik **Start for free**
2. Login dengan GitHub atau email
3. Klik **New Project**
4. Isi:
   - **Name**: `cekrek-sek`
   - **Database Password**: buat password kuat
   - **Region**: pilih `Southeast Asia (Singapore)` untuk latency rendah
5. Tunggu project selesai dibuat (~1-2 menit)

---

### Langkah 2 — Buat Tabel

1. Di sidebar Supabase, klik **SQL Editor**
2. Klik **New Query**
3. Copy-paste SQL berikut, lalu klik **Run**:

```sql
-- Buat tabel transaksi
CREATE TABLE transaksi (
  id             BIGSERIAL PRIMARY KEY,
  nama_pembeli   TEXT NOT NULL,
  jumlah_sesi    INTEGER NOT NULL CHECK (jumlah_sesi >= 1),
  harga_per_sesi INTEGER NOT NULL DEFAULT 3000,
  total_bayar    INTEGER NOT NULL,
  status         TEXT NOT NULL DEFAULT 'LUNAS',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Aktifkan Row Level Security (penting untuk keamanan!)
ALTER TABLE transaksi ENABLE ROW LEVEL SECURITY;

-- Policy: izinkan semua operasi dari anon key
-- (cocok untuk kasir internal — ubah jika butuh lebih aman)
CREATE POLICY "Allow all for anon"
  ON transaksi
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Index untuk performa query filter tanggal
CREATE INDEX idx_transaksi_created_at ON transaksi(created_at DESC);
```

4. Setelah berhasil, verifikasi di **Table Editor** → tabel `transaksi` sudah muncul

---

### Langkah 3 — Ambil API Keys

1. Di sidebar, klik **Settings** → **API**
2. Copy dua nilai ini:
   - **Project URL** → contoh: `https://abcdefgh.supabase.co`
   - **anon public** key → string panjang diawali `eyJ...`

---

### Langkah 4 — Isi config.js

Buka file `config.js` dan isi:

```javascript
const SUPABASE_URL      = 'https://NAMAPROJECT.supabase.co'; // ← ganti ini
const SUPABASE_ANON_KEY = 'eyJhbGci...PASTE_KEY_DISINI';     // ← ganti ini
const TABLE_NAME        = 'transaksi';
const HARGA_PER_SESI    = 3000;
```

---

## 🚀 Cara Menjalankan Lokal

### Opsi A — Live Server (VS Code)
1. Install extension **Live Server** di VS Code
2. Klik kanan `index.html` → **Open with Live Server**
3. Browser otomatis terbuka

### Opsi B — Python HTTP Server
```bash
cd cekrek-sek
python3 -m http.server 8080
# Buka http://localhost:8080
```

### Opsi C — Node.js
```bash
npx serve .
```

> ⚠️ **Jangan buka langsung** dengan `file://` karena CORS akan memblokir request ke Supabase.

---

## ☁️ Deploy Gratis

### Deploy ke Netlify (Paling Mudah)

1. Buka **https://netlify.com** → login
2. Drag & drop folder `cekrek-sek` ke area deploy
3. Selesai! Netlify otomatis memberi URL gratis

Atau via CLI:
```bash
npm install -g netlify-cli
netlify deploy --dir=. --prod
```

### Deploy ke Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```
2. Di dalam folder project:
```bash
vercel
```
3. Ikuti instruksi, pilih `No framework`
4. Selesai, dapat URL gratis

### Deploy ke GitHub Pages

1. Push folder ke repository GitHub
2. Buka Settings → Pages
3. Set Source: `Deploy from branch → main → / (root)`
4. URL akan aktif dalam beberapa menit

---

## 📊 Cara Export Excel Bekerja

Export menggunakan library **SheetJS (xlsx)** yang sudah di-include via CDN di `index.html`:

```html
<script src="https://cdnjs.cloudflare.com/.../xlsx.full.min.js"></script>
```

**Flow export:**
1. Klik tombol **⬇ Excel** di section Riwayat Transaksi
2. `app.js` mengambil data dari `state.filtered` (atau semua jika tidak ada filter)
3. Data diformat jadi array of objects dengan kolom: No, Nama, Sesi, Harga, Total, Status, Waktu
4. SheetJS convert ke format `.xlsx` dengan lebar kolom otomatis
5. File langsung terdownload di browser — **tanpa server!**

---

## 🎨 Fitur Lengkap

| Fitur | Status |
|-------|--------|
| Form transaksi + validasi | ✅ |
| Harga realtime otomatis | ✅ |
| Simpan ke Supabase | ✅ |
| Dashboard statistik (hari ini + total) | ✅ |
| Riwayat transaksi (tabel) | ✅ |
| Search nama pembeli | ✅ |
| Filter tanggal | ✅ |
| Hapus transaksi (dengan konfirmasi) | ✅ |
| Export CSV | ✅ |
| Export Excel (.xlsx) | ✅ |
| Print struk/receipt | ✅ |
| Dark mode toggle | ✅ |
| Toast notifikasi | ✅ |
| Loading animation | ✅ |
| Empty state | ✅ |
| Mobile responsive | ✅ |
| Koneksi status indicator | ✅ |
| Keyboard shortcuts (ESC, Enter) | ✅ |
| Anti double submit | ✅ |
| XSS protection | ✅ |

---

## 🔒 Keamanan

- **Anon Key** Supabase aman dipakai di frontend selama RLS aktif
- **Row Level Security** sudah diaktifkan via SQL setup
- **XSS** dicegah dengan `escapeHtml()` di semua output user
- **Untuk produksi lebih aman**: batasi policy RLS agar hanya user terautentikasi yang bisa hapus

---

## 🛠️ Kustomisasi

### Ubah harga per sesi
Di `config.js`:
```javascript
const HARGA_PER_SESI = 5000; // ganti ke harga yang kamu mau
```

### Ubah nama bisnis
Di `index.html`, cari dan ganti semua `Cekrek Sek`.

### Ubah warna tema
Di `style.css`, ubah nilai pada `:root` → `--accent-pink`, `--accent-purple`, dll.

---

## 📞 Troubleshooting

**Transaksi gagal disimpan?**
- Pastikan URL & key di `config.js` sudah benar
- Cek apakah tabel `transaksi` sudah dibuat di Supabase
- Cek console browser (F12) untuk pesan error detail

**Halaman kosong setelah deploy?**
- Pastikan semua file (index.html, style.css, app.js, config.js) sudah ikut ter-upload
- Cek apakah ada typo di SUPABASE_URL (tidak boleh ada trailing slash)

**Export tidak berjalan?**
- Pastikan ada koneksi internet (SheetJS di-load dari CDN)
- Coba reload halaman dan export ulang
