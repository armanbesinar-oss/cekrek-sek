/**
 * config.js — Konfigurasi Supabase
 * ============================================================
 * CARA SETUP:
 * 1. Buka https://supabase.com → Login / Buat akun
 * 2. Buat project baru
 * 3. Buka Settings → API
 * 4. Copy "Project URL" → isi di SUPABASE_URL
 * 5. Copy "anon public" key → isi di SUPABASE_ANON_KEY
 *
 * KEAMANAN:
 * - File ini tidak boleh di-commit ke GitHub jika key sudah diisi
 * - Untuk production, gunakan environment variable
 * - Anon key aman dipakai di frontend asalkan Row Level Security (RLS)
 *   sudah diaktifkan di Supabase
 * ============================================================
 */

const SUPABASE_URL = "sb_publishable_6mEeuyTLIlFIIJWbTvO_Lw_MhcfPgnr"; // ← Ganti dengan URL project kamu
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Y2dvaGV6cmpoaHJ2bHJpcGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzU1NzcsImV4cCI6MjA5NjUxMTU3N30.HTpOm_UCYQs-x05vVsxuEe8rZ13ODmFex4ENOaAMx4Q"; // ← Ganti dengan anon key kamu
const TABLE_NAME = "transaksi"; // Nama tabel di Supabase
const HARGA_PER_SESI = 3000; // Harga per sesi (Rupiah)
