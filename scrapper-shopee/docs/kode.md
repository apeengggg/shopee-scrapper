# Struktur Kode

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

## Alur Data

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

## Hubungan Antar File

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

Semua dependency satu arah — hanya `app.py` yang mengimpor modul lain.

---

## `database.py`

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

## `scraper.py`

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

## `exporter.py`

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

## `app.py`

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
