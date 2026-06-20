import asyncio
import importlib
import os
import pandas as pd
import streamlit as st

import scraper as _scraper_mod
importlib.reload(_scraper_mod)
from scraper import scrape_keyword

from database import init_db, insert_products, get_products
from exporter import export_to_excel

init_db()

st.set_page_config(
    page_title="Shopee Scraper",
    page_icon="🛒",
    layout="wide",
)

st.markdown("""
<style>
    .stButton > button {
        background-color: #EE4D2D;
        color: white;
        font-weight: bold;
        border: none;
        padding: 0.5rem 2rem;
        border-radius: 4px;
    }
    .stButton > button:hover {
        background-color: #D43B1E;
        color: white;
    }
    .metric-box {
        background: #FFF5F3;
        border-left: 4px solid #EE4D2D;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        margin-bottom: 0.5rem;
    }
</style>
""", unsafe_allow_html=True)

# ── Sidebar filters ──────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("## 🔧 Filter")

    st.markdown("**Harga (IDR)**")
    col1, col2 = st.columns(2)
    with col1:
        min_price = st.number_input("Min", min_value=0, value=0, step=10000)
    with col2:
        max_price = st.number_input("Max", min_value=0, value=0, step=10000,
                                    help="0 = tidak dibatasi")

    st.markdown("**Rating Minimum**")
    min_rating = st.slider("Bintang", 0.0, 5.0, 0.0, 0.5)

    st.markdown("**Terjual Minimum**")
    min_sold = st.number_input("Jumlah", min_value=0, value=0, step=10)

    st.markdown("**Lokasi Toko**")
    location_filter = st.text_input("Kota (contoh: Jakarta)", value="")

    st.divider()
    st.markdown("**Riwayat Scraping**")
    show_history = st.checkbox("Tampilkan semua data tersimpan", value=False)

# ── Main area ────────────────────────────────────────────────────────────────
st.markdown("# 🛒 Shopee Scraper")
st.markdown("Scrape produk Shopee berdasarkan keyword, simpan ke database, dan export ke Excel.")

col_kw, col_pages = st.columns([3, 1])
with col_kw:
    keyword = st.text_input("Keyword Pencarian", placeholder="Contoh: sepatu nike, laptop gaming...")
with col_pages:
    max_pages = st.number_input("Jumlah Halaman", min_value=1, max_value=20, value=5,
                                 help="1 halaman ≈ 60 produk")

start_btn = st.button("▶ Mulai Scraping", disabled=not keyword.strip())

# ── Scraping logic ───────────────────────────────────────────────────────────
if start_btn and keyword.strip():
    kw = keyword.strip()

    progress_bar = st.progress(0, text="Memulai scraping...")
    log_lines: list[str] = []

    def on_progress(current: int, total: int, items: int):
        pct = int(current / total * 100)
        progress_bar.progress(pct, text=f"Halaman {current}/{total} — {items} produk ditemukan")

    def on_log(msg: str):
        log_lines.append(msg)

    with st.spinner(f'Scraping "{kw}"...'):
        products = asyncio.run(
            scrape_keyword(
                kw,
                max_pages=int(max_pages),
                progress_callback=on_progress,
                log_callback=on_log,
            )
        )

    progress_bar.progress(100, text="Selesai!")
    st.session_state["last_logs"] = log_lines

    if products:
        result = insert_products(products)
        df_result = pd.DataFrame(products)

        col_a, col_b, col_c = st.columns(3)
        col_a.metric("Total Ditemukan", result["total"])
        col_b.metric("Produk Baru", result["new"], delta=f"+{result['new']}")
        col_c.metric("Duplikat (skip)", result["duplicates"])

        excel_path = export_to_excel(df_result, kw)
        st.session_state["last_excel"] = excel_path
        st.session_state["last_df"] = df_result
        st.session_state["last_keyword"] = kw

        st.success(f"✅ Scraping selesai! Excel disimpan di: `{excel_path}`")
    else:
        st.warning("⚠️ Tidak ada produk yang berhasil di-scrape. Cek log di bawah untuk detail.")

# ── Scraping log ─────────────────────────────────────────────────────────────
if "last_logs" in st.session_state and st.session_state["last_logs"]:
    with st.expander("📋 Log Scraping", expanded=not bool(st.session_state.get("last_df"))):
        st.code("\n".join(st.session_state["last_logs"]), language=None)

# ── Results table ────────────────────────────────────────────────────────────
st.divider()

if show_history:
    st.markdown("### 📦 Semua Data Tersimpan")
    df_display = get_products(
        min_price=min_price if min_price > 0 else None,
        max_price=max_price if max_price > 0 else None,
        min_rating=min_rating if min_rating > 0 else None,
        min_sold=int(min_sold) if min_sold > 0 else None,
        location=location_filter if location_filter.strip() else None,
    )
elif "last_df" in st.session_state:
    st.markdown(f"### Hasil Scraping: **{st.session_state.get('last_keyword', '')}**")
    df_raw = st.session_state["last_df"]

    df_display = df_raw.copy()
    if min_price > 0:
        df_display = df_display[df_display["price_min"] >= min_price]
    if max_price > 0:
        df_display = df_display[df_display["price_max"] <= max_price]
    if min_rating > 0:
        df_display = df_display[df_display["rating_star"] >= min_rating]
    if min_sold > 0:
        df_display = df_display[df_display["sold"] >= min_sold]
    if location_filter.strip():
        df_display = df_display[
            df_display["shop_location"].str.lower().str.contains(location_filter.lower(), na=False)
        ]
else:
    df_display = pd.DataFrame()

if not df_display.empty:
    display_cols = ["item_id", "name", "price_min", "price_max",
                    "rating_star", "sold", "liked_count", "shop_location", "keyword", "scraped_at"]
    display_cols = [c for c in display_cols if c in df_display.columns]

    st.dataframe(
        df_display[display_cols].rename(columns={
            "item_id": "ID",
            "name": "Nama Produk",
            "price_min": "Harga Min",
            "price_max": "Harga Max",
            "rating_star": "Rating",
            "sold": "Terjual",
            "liked_count": "Disukai",
            "shop_location": "Lokasi",
            "keyword": "Keyword",
            "scraped_at": "Waktu Scraping",
        }),
        use_container_width=True,
        height=500,
    )
    st.caption(f"Menampilkan {len(df_display)} produk")

    if "last_excel" in st.session_state and os.path.exists(st.session_state["last_excel"]):
        with open(st.session_state["last_excel"], "rb") as f:
            excel_bytes = f.read()
        excel_name = os.path.basename(st.session_state["last_excel"])
        st.download_button(
            label="📥 Download Excel",
            data=excel_bytes,
            file_name=excel_name,
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
elif keyword.strip() and not show_history:
    st.info("Klik **▶ Mulai Scraping** untuk mulai mengambil data produk.")
else:
    st.info("Belum ada data. Masukkan keyword dan mulai scraping.")
