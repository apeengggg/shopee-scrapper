# Debugging

## Aktifkan Browser Mode (Headless Off)

Edit `scraper.py` — ubah `headless=True` menjadi `headless=False` untuk melihat browser terbuka:

```python
# scraper.py baris 84
browser = await pw.chromium.launch(headless=False)  # ubah ke False
```

Browser Chromium akan tampil saat scraping sehingga bisa dilihat apa yang terjadi secara visual.

---

## Cek Database Secara Manual

```bash
python -c "
import sqlite3, pandas as pd
conn = sqlite3.connect('data/shopee.db')
df = pd.read_sql_query('SELECT * FROM products ORDER BY scraped_at DESC LIMIT 20', conn)
print(df.to_string())
conn.close()
"
```

## Cek Jumlah Produk Per Keyword

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

---

## Test Scraper Tanpa UI

Berguna untuk isolasi masalah — jalankan scraper langsung tanpa Streamlit:

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

---

## Cek Struktur JSON dari Shopee

Jika scraping menghasilkan 0 produk, kemungkinan format API Shopee berubah. Tambahkan sementara di `scraper.py` dalam fungsi `handle_response`:

```python
async def handle_response(response: Response):
    if SEARCH_API_PATTERN in response.url:
        try:
            data = await response.json()
            print("RESPONSE KEYS:", list(data.keys()))
            items = data.get("items", [])
            if items:
                print("ITEM KEYS:", list(items[0].keys()))
                raw = items[0].get("item", items[0])
                print("RAW ITEM KEYS:", list(raw.keys()))
        except Exception as e:
            print("PARSE ERROR:", e)
```

Jalankan test scraper tanpa UI (lihat di atas) untuk melihat output-nya di terminal.

---

## Log Streamlit Lebih Detail

```bash
python -m streamlit run app.py --logger.level debug
```

---

## Cek Versi Package

```bash
python -c "
import playwright, streamlit, openpyxl, pandas
print('streamlit :', streamlit.__version__)
print('openpyxl  :', openpyxl.__version__)
print('pandas    :', pandas.__version__)
"
pip show playwright | findstr Version
```
