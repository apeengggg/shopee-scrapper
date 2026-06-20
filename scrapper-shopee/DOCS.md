# Shopee Scraper — Dokumentasi

## Daftar Isi
1. [Cara Menjalankan](#cara-menjalankan)
2. [Struktur Project](#struktur-project)
3. [Struktur Kode](#struktur-kode)
4. [Debugging](#debugging)
5. [Fixing Masalah Umum](#fixing-masalah-umum)

---

## Cara Menjalankan

### Prasyarat
- Python 3.11 atau lebih baru
- Koneksi internet aktif

### Setup Pertama Kali

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Install browser Chromium untuk Playwright
python -m playwright install chromium

# 3. Jalankan app
python -m streamlit run app.py
```

Buka browser ke: **http://localhost:8501**

### Menjalankan Ulang (setelah setup)

```bash
python -m streamlit run app.py
```

### Menjalankan di Port Berbeda

```bash
python -m streamlit run app.py --server.port 8502
```

### Menghentikan App

Tekan `Ctrl + C` di terminal.

---

## Struktur Project

```
scrapper-shopee/
├── app.py          # UI Streamlit — entry point utama
├── scraper.py      # Logic scraping dengan Playwright
├── database.py     # SQLite CRUD dan deduplication
├── exporter.py     # Generasi file Excel
├── requirements.txt
└── data/
    ├── shopee.db          # Database SQLite (auto-created)
    └── exports/           # File Excel hasil scraping (auto-created)
```

### Alur Data

```
User input keyword
      ↓
scraper.py → buka Chromium → buka shopee.co.id/search
      ↓
Intercept API response /api/v4/search/search_items (JSON)
      ↓
Parse produk (item_id, name, price, rating, sold, location...)
      ↓
database.py → INSERT OR IGNORE ke SQLite (dedup via item_id)
      ↓
exporter.py → generate Excel di data/exports/
      ↓
app.py → tampilkan tabel + tombol Download Excel
```

---

## Struktur Kode

### `database.py`

Bertanggung jawab atas semua operasi SQLite.

```
init_db()
  └── Buat folder data/ jika belum ada
  └── Buat tabel products jika belum ada

insert_products(products: list[dict]) → dict
  ├── Input  : list produk (dari scraper.py)
  ├── Proses : INSERT OR IGNORE per produk (skip jika item_id sudah ada)
  └── Output : { "total": int, "new": int, "duplicates": int }

get_products(keyword, min_price, max_price, min_rating, min_sold, location) → pd.DataFrame
  ├── Semua parameter opsional (None = tidak difilter)
  ├── Bangun WHERE clause secara dinamis
  └── Return DataFrame pandas diurutkan by sold DESC
```

**Schema tabel `products`:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| `item_id` | INTEGER | **PRIMARY KEY** — dari Shopee |
| `shop_id` | INTEGER | ID toko penjual |
| `name` | TEXT | Nama produk |
| `price_min` | REAL | Harga terendah (IDR) |
| `price_max` | REAL | Harga tertinggi (IDR) |
| `rating_star` | REAL | Rating 0.0–5.0 |
| `sold` | INTEGER | Jumlah terjual |
| `liked_count` | INTEGER | Jumlah disukai |
| `shop_location` | TEXT | Kota penjual |
| `image_url` | TEXT | URL foto produk |
| `product_url` | TEXT | Link ke halaman produk |
| `keyword` | TEXT | Keyword yang digunakan saat scraping |
| `scraped_at` | TEXT | Timestamp ISO 8601 |

---

### `scraper.py`

Berisi logic scraping dengan Playwright.

```
scrape_keyword(keyword, max_pages, progress_callback) → list[dict]
  ├── Buka browser Chromium (headless)
  ├── Daftarkan listener: page.on("response", handle_response)
  │
  ├── Loop per halaman (0 → max_pages-1):
  │   ├── Navigasi ke shopee.co.id/search?keyword=...&newest={offset}
  │   ├── Scroll halaman (simulasi manusia)
  │   ├── Tunggu 2 detik (API response datang)
  │   ├── Kumpulkan produk dari intercepted[]
  │   └── Delay acak 2.5–5.0 detik sebelum halaman berikutnya
  │
  └── Return list semua produk

handle_response(response)             [internal coroutine]
  ├── Filter URL yang mengandung "/api/v4/search/search_items"
  ├── Parse JSON response
  ├── Loop tiap item → panggil _parse_item()
  └── Append ke intercepted[]

_parse_item(item: dict, keyword: str) → dict    [internal]
  ├── Ekstrak field dari raw JSON Shopee
  ├── Konversi harga: dibagi 100_000 (satuan Shopee → IDR)
  ├── Build product_url dari shop_id + item_id
  └── Return dict siap masuk database

_scroll_page(page)                    [internal coroutine]
  └── Scroll 4x dengan jarak & delay acak (mimik manusia)
```

**Konstanta penting:**

```python
SEARCH_API_PATTERN = "/api/v4/search/search_items"  # URL yang diintercept
SHOPEE_BASE = "https://shopee.co.id"
```

**Anti-block yang digunakan:**

| Teknik | Implementasi |
|---|---|
| Real browser | Playwright Chromium (bukan requests/httpx) |
| Human-like scroll | `_scroll_page()` — 4x scroll dengan delay acak |
| Delay antar halaman | `random.uniform(2.5, 5.0)` detik |
| Locale Indonesia | `locale="id-ID"`, header `Accept-Language: id-ID` |
| User-agent Chrome | UA string Chrome 124 Windows |

---

### `exporter.py`

Membuat file Excel dengan openpyxl.

```
export_to_excel(df: pd.DataFrame, keyword: str) → str
  ├── Buat folder data/exports/ jika belum ada
  ├── Generate nama file: shopee_{keyword}_{YYYYMMDD_HHMMSS}.xlsx
  ├── Pilih & rename kolom yang relevan (hapus image_url dari tampilan)
  ├── Tulis header row: bold, background merah Shopee (#EE4D2D), teks putih
  ├── Tulis data rows: baris genap warna alternating (#FFF5F3)
  ├── Auto-width tiap kolom (max 60 karakter)
  ├── Freeze row pertama (header tetap terlihat saat scroll)
  ├── Aktifkan AutoFilter di semua kolom
  └── Return path file yang dibuat

_safe_filename(text: str) → str       [internal]
  └── Ganti karakter non-alphanumeric dengan underscore
```

**Kolom yang muncul di Excel** (berurutan):

`ID Produk` → `Nama Produk` → `Harga Min` → `Harga Max` → `Rating` → `Terjual` → `Disukai` → `Lokasi` → `URL Produk` → `Keyword` → `Waktu Scraping`

---

### `app.py`

Streamlit UI — entry point saat `streamlit run app.py`.

```
Inisialisasi:
  └── init_db() dipanggil sekali saat app start

Sidebar (st.sidebar):
  ├── Filter harga min/max (number_input)
  ├── Filter rating minimum (slider 0.0–5.0)
  ├── Filter jumlah terjual minimum (number_input)
  ├── Filter lokasi toko (text_input)
  └── Checkbox: tampilkan semua riwayat scraping

Main area:
  ├── Input keyword (text_input)
  ├── Input jumlah halaman (number_input, 1–20)
  ├── Tombol "▶ Mulai Scraping"
  │
  ├── [Saat tombol diklik]:
  │   ├── Progress bar (diupdate via on_progress callback)
  │   ├── asyncio.run(scrape_keyword(...))
  │   ├── insert_products() → simpan ke SQLite
  │   ├── export_to_excel() → simpan file xlsx
  │   └── Tampilkan metrics: Total / Baru / Duplikat
  │
  ├── Tabel hasil (st.dataframe, height=500)
  └── Tombol "📥 Download Excel" (st.download_button)

Session state yang digunakan:
  ├── st.session_state["last_df"]      — DataFrame hasil scraping terakhir
  ├── st.session_state["last_excel"]   — Path file Excel terakhir
  └── st.session_state["last_keyword"] — Keyword terakhir digunakan
```

**Logika tampilan tabel:**

```
show_history = True  → get_products() dari SQLite (semua keyword, dengan filter)
show_history = False → gunakan last_df dari session_state (filter secara in-memory)
```

---

### Hubungan Antar File

```
app.py
  ├── import scraper.scrape_keyword()      ← Playwright scraping
  ├── import database.insert_products()    ← Simpan ke SQLite
  ├── import database.get_products()       ← Baca dari SQLite
  └── import exporter.export_to_excel()    ← Buat file Excel

scraper.py        (tidak import file project lain)
database.py       (tidak import file project lain)
exporter.py       (tidak import file project lain)
```

Semua dependency satu arah: hanya `app.py` yang mengimpor modul lain.

---

## Debugging

### Aktifkan Log Verbose Playwright

Edit `scraper.py` — ubah `headless=True` menjadi `headless=False` untuk melihat browser terbuka:

```python
# scraper.py baris 84
browser = await pw.chromium.launch(headless=False)  # ubah ke False
```

Browser Chromium akan tampil saat scraping sehingga bisa dilihat apa yang terjadi.

### Cek Database Secara Manual

```bash
# Buka SQLite di terminal
python -c "
import sqlite3, pandas as pd
conn = sqlite3.connect('data/shopee.db')
df = pd.read_sql_query('SELECT * FROM products ORDER BY scraped_at DESC LIMIT 20', conn)
print(df.to_string())
conn.close()
"
```

### Cek Berapa Produk Tersimpan

```bash
python -c "
import sqlite3
conn = sqlite3.connect('data/shopee.db')
count = conn.execute('SELECT COUNT(*) FROM products').fetchone()[0]
keywords = conn.execute('SELECT keyword, COUNT(*) FROM products GROUP BY keyword').fetchall()
print(f'Total produk: {count}')
for kw, cnt in keywords:
    print(f'  {kw}: {cnt} produk')
conn.close()
"
```

### Test Scraper Tanpa UI

```bash
python -c "
import asyncio
from scraper import scrape_keyword

def progress(current, total, items):
    print(f'Halaman {current}/{total} — {items} produk')

products = asyncio.run(scrape_keyword('sepatu', max_pages=1, progress_callback=progress))
print(f'Total: {len(products)} produk')
if products:
    print('Contoh produk pertama:')
    for k, v in list(products[0].items())[:5]:
        print(f'  {k}: {v}')
"
```

### Lihat Log Streamlit Lebih Detail

```bash
python -m streamlit run app.py --logger.level debug
```

---

## Fixing Masalah Umum

### 1. `playwright: command not found`

**Penyebab:** Playwright belum diinstall atau PATH tidak ditemukan.

**Fix:**
```bash
pip install playwright
python -m playwright install chromium
```

### 2. `ModuleNotFoundError: No module named 'playwright'`

**Penyebab:** Library belum terinstall.

**Fix:**
```bash
pip install -r requirements.txt
```

### 3. Tidak ada produk yang berhasil di-scrape (hasil 0)

**Penyebab A:** Shopee memblokir request atau layout berubah.

**Fix:**
1. Ubah `headless=False` di `scraper.py` untuk melihat apa yang terjadi
2. Coba jalankan ulang — Shopee terkadang timeout sesaat
3. Kurangi jumlah halaman (coba 1–2 dulu)
4. Tunggu beberapa menit sebelum scraping lagi

**Penyebab B:** API response Shopee berubah format.

**Fix:** Jalankan debug berikut untuk melihat struktur JSON:

```python
# Tambahkan sementara di scraper.py dalam handle_response:
async def handle_response(response: Response):
    if SEARCH_API_PATTERN in response.url:
        try:
            data = await response.json()
            print("KEYS:", list(data.keys()))          # lihat struktur
            items = data.get("items", [])
            if items:
                print("ITEM SAMPLE:", list(items[0].keys()))  # lihat field tersedia
        except Exception as e:
            print("ERROR:", e)
```

### 4. `asyncio.run()` error — "This event loop is already running"

**Penyebab:** Conflict event loop antara Streamlit dan asyncio.

**Fix:** Install `nest_asyncio` dan tambahkan di `app.py`:

```bash
pip install nest_asyncio
```

```python
# Tambahkan di atas app.py, setelah import:
import nest_asyncio
nest_asyncio.apply()
```

### 5. Error Excel — `PermissionError: [Errno 13] Permission denied`

**Penyebab:** File Excel sebelumnya masih terbuka di Excel/aplikasi lain.

**Fix:** Tutup file Excel yang sedang terbuka, lalu scrape ulang.

### 6. Database corrupt atau ingin reset

**Fix:**
```bash
# Hapus database (semua data hilang)
del data\shopee.db

# App akan otomatis buat database baru saat dijalankan
python -m streamlit run app.py
```

Atau reset per keyword:
```bash
python -c "
import sqlite3
conn = sqlite3.connect('data/shopee.db')
keyword = 'sepatu'  # ganti keyword yang mau dihapus
conn.execute('DELETE FROM products WHERE keyword = ?', (keyword,))
conn.commit()
print(f'Produk dengan keyword \"{keyword}\" dihapus')
conn.close()
"
```

### 7. Scraping sangat lambat

**Penyebab:** Delay antar halaman 2.5–5 detik adalah desain sengaja untuk menghindari block.

**Jika ingin lebih cepat (risiko lebih besar kena block):**

Edit `scraper.py`:

```python
# Baris delay antar halaman — ubah dari:
delay = random.uniform(2.5, 5.0)
# menjadi (lebih cepat tapi lebih berisiko):
delay = random.uniform(1.0, 2.5)
```

### 8. Harga tampil dalam angka sangat besar (misal 35000000)

**Penyebab:** Shopee menyimpan harga dalam satuan 1/100000 IDR. Konversi sudah dilakukan otomatis (`/ 100000`).

Jika masih ada masalah, cek di `scraper.py` fungsi `_parse_item`:
```python
price_min = item.get("price_min", item.get("price", 0)) / 100000
```

Pastikan pembagi adalah `100000`.

### 9. Port 8501 sudah dipakai

```bash
# Jalankan di port lain
python -m streamlit run app.py --server.port 8502
```

Atau cari dan matikan proses yang memakai port 8501:
```bash
netstat -ano | findstr :8501
taskkill /PID <PID_NUMBER> /F
```

---

## Tips Penggunaan

| Situasi | Rekomendasi |
|---|---|
| Keyword umum (banyak produk) | Mulai dengan 2–3 halaman dulu |
| Ingin data lengkap | Gunakan 5–10 halaman, biarkan berjalan |
| Scraping sering kena block | Jalankan di jam tidak ramai (malam/pagi) |
| Duplikat dari keyword berbeda | Normal — dedup hanya per `item_id`, bukan per keyword |
| Excel tidak muncul tombol download | Refresh halaman, data masih ada di database |
