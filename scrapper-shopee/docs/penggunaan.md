# Cara Penggunaan

## Prasyarat
- Python 3.11 atau lebih baru
- Koneksi internet aktif

---

## Setup Pertama Kali

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Install browser Chromium untuk Playwright
python -m playwright install chromium

# 3. Jalankan app
python -m streamlit run app.py
```

Buka browser ke: **http://localhost:8501**

---

## Menjalankan Ulang (setelah setup)

```bash
python -m streamlit run app.py
```

## Menjalankan di Port Berbeda

```bash
python -m streamlit run app.py --server.port 8502
```

## Menghentikan App

Tekan `Ctrl + C` di terminal.

---

## Cara Scraping

1. Ketik keyword di kolom **Keyword Pencarian** (contoh: `sepatu nike`, `laptop gaming`)
2. Pilih **Jumlah Halaman** — 1 halaman ≈ 60 produk
3. Atur filter di sidebar kiri jika diperlukan (opsional)
4. Klik tombol **▶ Mulai Scraping**
5. Tunggu progress bar selesai
6. Hasil muncul di tabel bawah
7. Klik **📥 Download Excel** untuk unduh file laporan

---

## Filter yang Tersedia

| Filter | Lokasi | Keterangan |
|---|---|---|
| Harga Min / Max | Sidebar | Range harga dalam IDR |
| Rating Minimum | Sidebar | Slider bintang 0.0–5.0 |
| Terjual Minimum | Sidebar | Produk dengan minimal X terjual |
| Lokasi Toko | Sidebar | Nama kota penjual (misal: `Jakarta`) |
| Tampilkan semua data | Sidebar | Lihat seluruh riwayat scraping dari database |

---

## Tips

| Situasi | Rekomendasi |
|---|---|
| Keyword umum (banyak produk) | Mulai dengan 2–3 halaman dulu |
| Ingin data lengkap | Gunakan 5–10 halaman, biarkan berjalan |
| Scraping sering kena block | Jalankan di jam tidak ramai (malam/pagi) |
| Duplikat dari keyword berbeda | Normal — dedup hanya per `item_id`, bukan per keyword |
| Tombol download tidak muncul | Refresh halaman, data masih tersimpan di database |
