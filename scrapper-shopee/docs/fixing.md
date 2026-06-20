# Fixing Masalah Umum

## 1. `playwright: command not found`

**Penyebab:** Playwright belum diinstall atau PATH tidak ditemukan.

**Fix:**
```bash
pip install playwright
python -m playwright install chromium
```

---

## 2. `ModuleNotFoundError: No module named 'playwright'`

**Penyebab:** Library belum terinstall.

**Fix:**
```bash
pip install -r requirements.txt
```

---

## 3. Tidak ada produk yang berhasil di-scrape (hasil 0)

**Penyebab A:** Shopee memblokir request atau timeout.

**Fix:**
1. Ubah `headless=False` di `scraper.py` untuk melihat apa yang terjadi di browser
2. Coba jalankan ulang — Shopee terkadang timeout sesaat
3. Kurangi jumlah halaman (coba 1–2 dulu)
4. Tunggu beberapa menit sebelum scraping lagi

**Penyebab B:** Format API response Shopee berubah.

**Fix:** Lihat [debugging.md](debugging.md) bagian "Cek Struktur JSON dari Shopee" untuk melihat field yang tersedia saat ini.

---

## 4. `asyncio.run()` error — "This event loop is already running"

**Penyebab:** Conflict event loop antara Streamlit dan asyncio.

**Fix:** Install `nest_asyncio` dan tambahkan di `app.py`:

```bash
pip install nest_asyncio
```

```python
# Tambahkan di bagian atas app.py, setelah baris import:
import nest_asyncio
nest_asyncio.apply()
```

---

## 5. Error Excel — `PermissionError: [Errno 13] Permission denied`

**Penyebab:** File Excel sebelumnya masih terbuka di Excel atau aplikasi lain.

**Fix:** Tutup file Excel yang sedang terbuka, lalu scrape ulang.

---

## 6. Database corrupt atau ingin reset

**Reset semua data:**
```bash
del data\shopee.db
python -m streamlit run app.py
```
App akan otomatis membuat database baru saat dijalankan.

**Reset per keyword:**
```bash
python -c "
import sqlite3
conn = sqlite3.connect('data/shopee.db')
keyword = 'sepatu'  # ganti dengan keyword yang mau dihapus
conn.execute('DELETE FROM products WHERE keyword = ?', (keyword,))
conn.commit()
print(f'Produk dengan keyword \"{keyword}\" dihapus')
conn.close()
"
```

---

## 7. Scraping sangat lambat

**Penyebab:** Delay 2.5–5 detik antar halaman adalah desain sengaja untuk menghindari block Shopee.

**Jika ingin lebih cepat** (risiko block lebih tinggi), edit `scraper.py`:

```python
# Ubah dari:
delay = random.uniform(2.5, 5.0)
# Menjadi:
delay = random.uniform(1.0, 2.5)
```

---

## 8. Harga tampil dalam angka sangat besar (misal 35000000000)

**Penyebab:** Shopee menyimpan harga dalam satuan 1/100000 IDR. Konversi sudah dilakukan otomatis.

Jika masih bermasalah, cek fungsi `_parse_item` di `scraper.py`:

```python
price_min = item.get("price_min", item.get("price", 0)) / 100000
```

Pastikan pembagi adalah `100000`.

---

## 9. Port 8501 sudah dipakai

```bash
# Jalankan di port lain
python -m streamlit run app.py --server.port 8502
```

Atau matikan proses yang memakai port 8501:
```bash
netstat -ano | findstr :8501
taskkill /PID <PID_NUMBER> /F
```
