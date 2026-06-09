/**
 * app.js — Cekrek Sek Kasir Photobooth
 * ============================================================
 * Fitur:
 *   ✅ Transaksi baru dengan validasi
 *   ✅ Harga realtime otomatis
 *   ✅ Simpan ke Supabase
 *   ✅ Dashboard statistik (hari ini & semua waktu)
 *   ✅ Riwayat transaksi dengan search & filter tanggal
 *   ✅ Hapus transaksi dengan konfirmasi modal
 *   ✅ Export Excel & CSV
 *   ✅ Print receipt/struk
 *   ✅ Dark mode toggle
 *   ✅ Toast notification
 *   ✅ Loading overlay
 *   ✅ Mobile-first responsive
 * ============================================================
 */

'use strict';

/* ============================================================
   SUPABASE CLIENT (REST API langsung, tanpa library berat)
   ============================================================ */

/**
 * Wrapper sederhana untuk request ke Supabase REST API.
 * Supabase mengekspos REST API standar sehingga kita tidak
 * perlu library supabase-js yang besar.
 */
const db = {
  /**
   * Buat headers standar untuk setiap request Supabase
   */
  headers() {
    return {
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation',
    };
  },

  /**
   * Base URL untuk tabel transaksi
   */
  url(query = '') {
    return `${SUPABASE_URL}/rest/v1/${TABLE_NAME}${query}`;
  },

  /**
   * INSERT — simpan transaksi baru
   * @param {Object} data
   * @returns {Array} data yang disimpan
   */
  async insert(data) {
    const res = await fetch(this.url(), {
      method:  'POST',
      headers: this.headers(),
      body:    JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  /**
   * SELECT — ambil semua transaksi, urutkan terbaru dulu
   * @returns {Array}
   */
  async selectAll() {
    const res = await fetch(
      this.url('?select=*&order=created_at.desc'),
      { headers: this.headers() }
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  /**
   * DELETE — hapus transaksi berdasarkan ID
   * @param {number|string} id
   */
  async delete(id) {
    const res = await fetch(this.url(`?id=eq.${id}`), {
      method:  'DELETE',
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(await res.text());
  },
};

/* ============================================================
   STATE APLIKASI
   ============================================================ */
const state = {
  transactions:  [],   // Array semua transaksi dari DB
  filtered:      [],   // Array setelah filter/search
  isSubmitting:  false,
  deleteTargetId: null,
  printTarget:   null,
};

/* ============================================================
   FORMAT HELPER
   ============================================================ */

/**
 * Format angka ke format Rupiah
 * @param {number} amount
 * @returns {string} "Rp 3.000"
 */
function formatRupiah(amount) {
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

/**
 * Format tanggal ke format Indonesia
 * @param {string} isoString
 * @returns {string} "12 Jun 2025, 14:30"
 */
function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('id-ID', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  }) + ', ' + d.toLocaleTimeString('id-ID', {
    hour:   '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format tanggal singkat untuk tabel
 * @param {string} isoString
 * @returns {string}
 */
function formatDateShort(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString('id-ID', {
    hour:   '2-digit',
    minute: '2-digit',
  }) + ' · ' + d.toLocaleDateString('id-ID', {
    day:   '2-digit',
    month: 'short',
  });
}

/**
 * Cek apakah tanggal termasuk hari ini
 * @param {string} isoString
 * @returns {boolean}
 */
function isToday(isoString) {
  const d    = new Date(isoString);
  const now  = new Date();
  return (
    d.getDate()     === now.getDate() &&
    d.getMonth()    === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

/* ============================================================
   TOAST NOTIFICATION
   ============================================================ */

/**
 * Tampilkan toast notifikasi
 * @param {string} message - Pesan yang ditampilkan
 * @param {'success'|'error'|'info'} type - Tipe toast
 * @param {number} duration - Durasi dalam ms (default 3000)
 */
function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.style.animation = 'toast-out 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ============================================================
   LOADING OVERLAY
   ============================================================ */

function showLoading() {
  document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading-overlay').classList.add('hidden');
}

/* ============================================================
   KONEKSI STATUS
   ============================================================ */

function setConnectionStatus(status) {
  const dot = document.getElementById('connection-dot');
  dot.classList.remove('connected', 'error');
  if (status === 'connected') {
    dot.classList.add('connected');
    dot.title = 'Database terhubung ✓';
  } else if (status === 'error') {
    dot.classList.add('error');
    dot.title = 'Gagal terhubung ke database';
  }
}

/* ============================================================
   DASHBOARD STATISTIK
   ============================================================ */

function updateDashboard() {
  const txns = state.transactions;

  const todayTxns   = txns.filter(t => isToday(t.created_at));
  const todayIncome = todayTxns.reduce((sum, t) => sum + Number(t.total_bayar), 0);
  const totalIncome = txns.reduce((sum, t) => sum + Number(t.total_bayar), 0);

  // Update dengan animasi counter sederhana
  animateCounter('stat-today-trx',    todayTxns.length,  false);
  animateCounter('stat-today-income', todayIncome,        true);
  animateCounter('stat-total-trx',    txns.length,        false);
  animateCounter('stat-total-income', totalIncome,        true);
}

/**
 * Animasi angka naik saat diupdate
 */
function animateCounter(elementId, targetValue, isRupiah) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const current = isRupiah
    ? parseInt(el.textContent.replace(/\D/g, '')) || 0
    : parseInt(el.textContent) || 0;

  const diff     = targetValue - current;
  const steps    = 20;
  const duration = 400;
  let step       = 0;

  const timer = setInterval(() => {
    step++;
    const progress = step / steps;
    const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const value    = Math.round(current + diff * eased);
    el.textContent = isRupiah ? formatRupiah(value) : value;

    if (step >= steps) {
      clearInterval(timer);
      el.textContent = isRupiah ? formatRupiah(targetValue) : targetValue;
    }
  }, duration / steps);
}

/* ============================================================
   RENDER TABEL TRANSAKSI
   ============================================================ */

function renderTable(data) {
  const wrapper = document.getElementById('table-wrapper');

  if (!data || data.length === 0) {
    wrapper.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-title">Belum ada transaksi</div>
        <div class="empty-state-sub">Isi form di atas untuk mencatat transaksi pertama!</div>
      </div>
    `;
    return;
  }

  // Buat tabel
  const rows = data.map(trx => `
    <tr data-id="${trx.id}">
      <td class="td-name" title="${escapeHtml(trx.nama_pembeli)}">${escapeHtml(trx.nama_pembeli)}</td>
      <td class="td-sesi">${trx.jumlah_sesi}x</td>
      <td class="td-total">${formatRupiah(trx.total_bayar)}</td>
      <td><span class="badge-lunas">LUNAS</span></td>
      <td class="td-time">${formatDateShort(trx.created_at)}</td>
      <td>
        <div class="td-actions">
          <button class="btn-table-action btn-table-print" data-id="${trx.id}" title="Print struk">🖨️</button>
          <button class="btn-table-action btn-table-delete" data-id="${trx.id}" title="Hapus transaksi">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');

  wrapper.innerHTML = `
    <table class="trx-table">
      <thead>
        <tr>
          <th>Pembeli</th>
          <th>Sesi</th>
          <th>Total</th>
          <th>Status</th>
          <th>Waktu</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  // Pasang event listener tombol hapus & print di tabel
  wrapper.querySelectorAll('.btn-table-delete').forEach(btn => {
    btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
  });
  wrapper.querySelectorAll('.btn-table-print').forEach(btn => {
    btn.addEventListener('click', () => openReceiptModal(btn.dataset.id));
  });
}

/**
 * Escape HTML untuk mencegah XSS
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ============================================================
   LOAD DATA DARI SUPABASE
   ============================================================ */

async function loadTransactions() {
  try {
    const data = await db.selectAll();
    state.transactions = data;
    state.filtered     = data;
    setConnectionStatus('connected');
    updateDashboard();
    applyFilter(); // render tabel dengan filter aktif saat ini
  } catch (err) {
    console.error('Load error:', err);
    setConnectionStatus('error');

    // Cek apakah URL masih placeholder
    if (SUPABASE_URL.includes('xxxx')) {
      showConfigWarning();
    } else {
      showToast('Gagal memuat data dari database', 'error');
    }
  }
}

/**
 * Tampilkan peringatan jika config belum diisi
 */
function showConfigWarning() {
  document.getElementById('table-wrapper').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">⚙️</div>
      <div class="empty-state-title">Setup diperlukan</div>
      <div class="empty-state-sub">
        Isi <strong>SUPABASE_URL</strong> dan <strong>SUPABASE_ANON_KEY</strong>
        di file <code>config.js</code> terlebih dahulu.<br/><br/>
        Lihat README.md untuk panduan lengkap.
      </div>
    </div>
  `;
}

/* ============================================================
   FORM TRANSAKSI — KALKULASI REALTIME
   ============================================================ */

const inputSesi    = document.getElementById('input-sesi');
const displayTotal = document.getElementById('display-total');

function updateTotal() {
  const sesi  = parseInt(inputSesi.value) || 0;
  const total = sesi * HARGA_PER_SESI;
  displayTotal.textContent = formatRupiah(total);
}

// Update total saat nilai sesi berubah
inputSesi.addEventListener('input', updateTotal);

// Tombol +/-
document.getElementById('btn-plus').addEventListener('click', () => {
  const val = parseInt(inputSesi.value) || 0;
  if (val < 99) { inputSesi.value = val + 1; updateTotal(); }
});

document.getElementById('btn-minus').addEventListener('click', () => {
  const val = parseInt(inputSesi.value) || 1;
  if (val > 1) { inputSesi.value = val - 1; updateTotal(); }
});

/* ============================================================
   VALIDASI FORM
   ============================================================ */

function validateForm() {
  let valid = true;

  const name = document.getElementById('input-name').value.trim();
  const sesi = parseInt(inputSesi.value);

  // Reset error
  document.getElementById('error-name').textContent = '';
  document.getElementById('error-sesi').textContent = '';
  document.getElementById('input-name').classList.remove('is-error');
  inputSesi.classList.remove('is-error');

  if (!name) {
    document.getElementById('error-name').textContent = 'Nama pembeli wajib diisi';
    document.getElementById('input-name').classList.add('is-error');
    document.getElementById('input-name').focus();
    valid = false;
  }

  if (!sesi || sesi < 1) {
    document.getElementById('error-sesi').textContent = 'Jumlah sesi minimal 1';
    inputSesi.classList.add('is-error');
    if (valid) inputSesi.focus();
    valid = false;
  }

  return valid;
}

/* ============================================================
   SUBMIT TRANSAKSI
   ============================================================ */

document.getElementById('btn-pay').addEventListener('click', async () => {
  if (state.isSubmitting) return;
  if (!validateForm()) return;

  // Ambil data form
  const namaPembeli = document.getElementById('input-name').value.trim();
  const jumlahSesi  = parseInt(inputSesi.value);
  const totalBayar  = jumlahSesi * HARGA_PER_SESI;

  // Cek config
  if (SUPABASE_URL.includes('xxxx') || SUPABASE_ANON_KEY.includes('eyJhbGciOi...')) {
    showToast('Harap isi config Supabase di config.js terlebih dahulu!', 'error', 5000);
    return;
  }

  // Hindari double submit
  state.isSubmitting = true;
  const btnPay = document.getElementById('btn-pay');
  btnPay.disabled = true;
  showLoading();

  try {
    const payload = {
      nama_pembeli:  namaPembeli,
      jumlah_sesi:   jumlahSesi,
      harga_per_sesi: HARGA_PER_SESI,
      total_bayar:   totalBayar,
      status:        'LUNAS',
    };

    await db.insert(payload);

    showToast(`Transaksi ${namaPembeli} berhasil disimpan! 🎉`, 'success');
    resetForm();
    await loadTransactions();

  } catch (err) {
    console.error('Submit error:', err);
    showToast('Gagal menyimpan transaksi. Coba lagi.', 'error');
    setConnectionStatus('error');
  } finally {
    state.isSubmitting = false;
    btnPay.disabled    = false;
    hideLoading();
  }
});

/* ============================================================
   RESET FORM
   ============================================================ */

function resetForm() {
  document.getElementById('input-name').value = '';
  inputSesi.value = 1;
  updateTotal();
  document.getElementById('error-name').textContent = '';
  document.getElementById('error-sesi').textContent = '';
  document.getElementById('input-name').classList.remove('is-error');
  inputSesi.classList.remove('is-error');
  document.getElementById('input-name').focus();
}

document.getElementById('btn-reset').addEventListener('click', () => {
  resetForm();
  showToast('Form direset', 'info', 1500);
});

/* ============================================================
   SEARCH & FILTER
   ============================================================ */

function applyFilter() {
  const search = document.getElementById('input-search').value.trim().toLowerCase();
  const date   = document.getElementById('filter-date').value; // format: YYYY-MM-DD

  state.filtered = state.transactions.filter(trx => {
    const matchName = trx.nama_pembeli.toLowerCase().includes(search);
    const matchDate = date
      ? trx.created_at.startsWith(date)
      : true;
    return matchName && matchDate;
  });

  renderTable(state.filtered);
}

document.getElementById('input-search').addEventListener('input', applyFilter);
document.getElementById('filter-date').addEventListener('change', applyFilter);

document.getElementById('btn-clear-filter').addEventListener('click', () => {
  document.getElementById('input-search').value = '';
  document.getElementById('filter-date').value  = '';
  applyFilter();
  showToast('Filter dihapus', 'info', 1500);
});

/* ============================================================
   MODAL KONFIRMASI HAPUS
   ============================================================ */

function openDeleteModal(id) {
  state.deleteTargetId = id;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeDeleteModal() {
  state.deleteTargetId = null;
  document.getElementById('modal-overlay').classList.add('hidden');
}

document.getElementById('modal-cancel').addEventListener('click', closeDeleteModal);

// Klik di luar modal untuk tutup
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) closeDeleteModal();
});

document.getElementById('modal-confirm').addEventListener('click', async () => {
  if (!state.deleteTargetId) return;

  showLoading();
  closeDeleteModal();

  try {
    await db.delete(state.deleteTargetId);
    showToast('Transaksi berhasil dihapus', 'success');
    await loadTransactions();
  } catch (err) {
    console.error('Delete error:', err);
    showToast('Gagal menghapus transaksi', 'error');
  } finally {
    hideLoading();
  }
});

/* ============================================================
   RECEIPT / STRUK
   ============================================================ */

function openReceiptModal(id) {
  const trx = state.transactions.find(t => String(t.id) === String(id));
  if (!trx) return;

  state.printTarget = trx;

  document.getElementById('receipt-body').innerHTML = `
    <div class="receipt-row">
      <span class="label">Nama Pembeli</span>
      <span class="value">${escapeHtml(trx.nama_pembeli)}</span>
    </div>
    <div class="receipt-row">
      <span class="label">Jumlah Sesi</span>
      <span class="value">${trx.jumlah_sesi} sesi</span>
    </div>
    <div class="receipt-row">
      <span class="label">Harga/Sesi</span>
      <span class="value">${formatRupiah(trx.harga_per_sesi)}</span>
    </div>
    <div class="receipt-row">
      <span class="label">Status</span>
      <span class="value" style="color:#059669;font-weight:700;">LUNAS ✓</span>
    </div>
    <div class="receipt-row">
      <span class="label">Waktu</span>
      <span class="value" style="font-size:12px">${formatDate(trx.created_at)}</span>
    </div>
    <div class="receipt-divider"></div>
    <div class="receipt-row total">
      <span class="label">TOTAL</span>
      <span class="value">${formatRupiah(trx.total_bayar)}</span>
    </div>
  `;

  document.getElementById('receipt-modal').classList.remove('hidden');
}

document.getElementById('btn-close-receipt').addEventListener('click', () => {
  document.getElementById('receipt-modal').classList.add('hidden');
});

document.getElementById('receipt-modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('receipt-modal')) {
    document.getElementById('receipt-modal').classList.add('hidden');
  }
});

document.getElementById('btn-do-print').addEventListener('click', () => {
  window.print();
});

/* ============================================================
   DARK MODE
   ============================================================ */

const darkToggle = document.getElementById('dark-mode-toggle');
const html       = document.documentElement;

// Load preferensi dari localStorage
const savedTheme = localStorage.getItem('cekrek-theme') || 'light';
html.setAttribute('data-theme', savedTheme);

darkToggle.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  const next    = current === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  localStorage.setItem('cekrek-theme', next);
  showToast(next === 'dark' ? 'Mode gelap aktif 🌙' : 'Mode terang aktif ☀️', 'info', 1800);
});

/* ============================================================
   EXPORT DATA
   ============================================================ */

/**
 * Siapkan data yang sudah diformat untuk export
 */
function prepareExportData() {
  const data = state.filtered.length > 0 ? state.filtered : state.transactions;
  return data.map((trx, i) => ({
    'No':              i + 1,
    'Nama Pembeli':    trx.nama_pembeli,
    'Jumlah Sesi':     trx.jumlah_sesi,
    'Harga/Sesi':      trx.harga_per_sesi,
    'Total Bayar':     trx.total_bayar,
    'Status':          trx.status || 'LUNAS',
    'Waktu Transaksi': formatDate(trx.created_at),
  }));
}

/* ---- Export CSV ---- */
document.getElementById('btn-export-csv').addEventListener('click', () => {
  const rows = prepareExportData();
  if (!rows.length) { showToast('Tidak ada data untuk diekspor', 'info'); return; }

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => `"${String(row[h]).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, `transaksi-cekrek-sek-${getDateFileName()}.csv`);
  showToast('Export CSV berhasil! 📄', 'success');
});

/* ---- Export Excel (.xlsx) ---- */
document.getElementById('btn-export-excel').addEventListener('click', () => {
  const rows = prepareExportData();
  if (!rows.length) { showToast('Tidak ada data untuk diekspor', 'info'); return; }

  // Gunakan SheetJS (sudah di-include di index.html)
  if (typeof XLSX === 'undefined') {
    showToast('Library Excel tidak tersedia', 'error');
    return;
  }

  const worksheet  = XLSX.utils.json_to_sheet(rows);
  const workbook   = XLSX.utils.book_new();

  // Style lebar kolom
  worksheet['!cols'] = [
    { wch: 5  }, // No
    { wch: 25 }, // Nama
    { wch: 14 }, // Jumlah Sesi
    { wch: 12 }, // Harga/Sesi
    { wch: 14 }, // Total
    { wch: 10 }, // Status
    { wch: 24 }, // Waktu
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transaksi');
  XLSX.writeFile(workbook, `transaksi-cekrek-sek-${getDateFileName()}.xlsx`);
  showToast('Export Excel berhasil! 📊', 'success');
});

/**
 * Download file helper
 */
function downloadFile(blob, filename) {
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate nama file dengan tanggal hari ini
 */
function getDateFileName() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}

/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */
document.addEventListener('keydown', (e) => {
  // ESC: tutup modal
  if (e.key === 'Escape') {
    closeDeleteModal();
    document.getElementById('receipt-modal').classList.add('hidden');
  }

  // Enter pada input nama → fokus ke sesi
  if (e.key === 'Enter' && document.activeElement.id === 'input-name') {
    inputSesi.focus();
    inputSesi.select();
  }
});

/* ============================================================
   INISIALISASI APLIKASI
   ============================================================ */
(async function init() {
  // Set tanggal hari ini sebagai default filter
  const today = new Date().toISOString().split('T')[0];
  // Jangan set default filter agar semua data tampil saat load
  // document.getElementById('filter-date').value = today;

  // Update total awal
  updateTotal();

  // Load data dari Supabase
  await loadTransactions();

  // Fokus ke input nama untuk kenyamanan operator
  document.getElementById('input-name').focus();
})();
