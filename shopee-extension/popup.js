let allProducts = [];
let filteredProducts = [];
let sessionStartCount = 0;
let pollInterval = null;
let lastDebugRaw = null;

// ── Affiliate ────────────────────────────────────────────────────────────────
function getAffiliateId() { return document.getElementById('affiliateId').value.trim(); }

function makeAffiliateUrl(productUrl) {
    const id = getAffiliateId();
    if (!id || !productUrl) return '';
    try {
        const u = new URL(productUrl);
        u.searchParams.set('af_id', id);
        return u.toString();
    } catch (_) {
        return productUrl + '?af_id=' + encodeURIComponent(id);
    }
}

// ── Filters ──────────────────────────────────────────────────────────────────
function getFilters() {
    return {
        name:      (document.getElementById('fName').value     || '').trim().toLowerCase(),
        shop:      (document.getElementById('fShop').value     || '').trim().toLowerCase(),
        location:  (document.getElementById('fLocation').value || '').trim().toLowerCase(),
        keyword:   (document.getElementById('fKeyword').value  || '').trim().toLowerCase(),
        priceMin:  parseFloat(document.getElementById('fPriceMin').value) || 0,
        priceMax:  parseFloat(document.getElementById('fPriceMax').value) || 0,
        ratingMin: parseFloat(document.getElementById('fRating').value)   || 0,
        soldMin:   parseInt(document.getElementById('fSold').value)        || 0,
        likedMin:  parseInt(document.getElementById('fLiked').value)       || 0,
    };
}

function countActiveFilters(f) {
    return [f.name, f.shop, f.location, f.keyword].filter(Boolean).length
         + [f.priceMin, f.priceMax, f.ratingMin, f.soldMin, f.likedMin].filter((v) => v > 0).length;
}

function applyFilters(products) {
    const f = getFilters();
    return products.filter((p) => {
        if (f.name     && !(p.name          || '').toLowerCase().includes(f.name))     return false;
        if (f.shop     && !(p.shop_name     || '').toLowerCase().includes(f.shop))     return false;
        if (f.location && !(p.shop_location || '').toLowerCase().includes(f.location)) return false;
        if (f.keyword  && !(p.keyword       || '').toLowerCase().includes(f.keyword))  return false;
        if (f.priceMin && (p.price_min      || 0) < f.priceMin) return false;
        if (f.priceMax && (p.price_max      || 0) > f.priceMax) return false;
        if (f.ratingMin && (p.rating_star   || 0) < f.ratingMin) return false;
        if (f.soldMin  && (p.sold           || 0) < f.soldMin)  return false;
        if (f.likedMin && (p.liked_count    || 0) < f.likedMin) return false;
        return true;
    });
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtPrice(p) {
    if (!p) return '-';
    return 'Rp ' + Math.round(p).toLocaleString('id-ID');
}

function dataQuality(products) {
    if (!products.length) return 'empty';
    const named = products.filter((p) => p.name).length;
    return named / products.length >= 0.5 ? 'ok' : 'empty-data';
}

// ── Render ───────────────────────────────────────────────────────────────────
function renderTable() {
    const empty = document.getElementById('emptyState');
    const table = document.getElementById('productTable');
    const body  = document.getElementById('productBody');

    filteredProducts = applyFilters(allProducts);

    const f           = getFilters();
    const activeCount = countActiveFilters(f);

    document.getElementById('countTotal').textContent    = allProducts.length;
    document.getElementById('countFiltered').textContent = filteredProducts.length;
    document.getElementById('totalCount').textContent    = allProducts.length;
    document.getElementById('filteredCount').textContent = filteredProducts.length;

    const keywords = new Set(allProducts.map((p) => p.keyword).filter(Boolean));
    document.getElementById('countKeywords').textContent = keywords.size;
    document.getElementById('countNew').textContent = Math.max(0, allProducts.length - sessionStartCount);

    // Filter badge on toggle button
    const badge = document.getElementById('filterBadge');
    badge.textContent = activeCount > 0 ? ` (${activeCount} aktif)` : '';
    badge.style.color = activeCount > 0 ? '#EE4D2D' : '#999';

    if (filteredProducts.length === 0) {
        table.style.display = 'none';
        empty.style.display = 'block';

        const quality = dataQuality(allProducts);
        if (allProducts.length === 0) {
            empty.innerHTML = 'Belum ada data.<br>Buka Shopee &rarr; masukkan keyword &rarr; klik <b>Scrape</b>.';
        } else if (activeCount > 0 && quality === 'empty-data') {
            empty.innerHTML = `Filter aktif tapi data masih kosong (nama/harga belum terisi).<br>
                Klik <b>Hapus Semua</b> lalu <b>Scrape ulang</b> untuk memperbarui data.`;
        } else if (activeCount > 0) {
            empty.innerHTML = `Tidak ada produk yang cocok dengan filter.<br>
                Coba longgarkan filter atau klik <b>Reset Filter</b>.`;
        } else if (quality === 'empty-data') {
            empty.innerHTML = `Data ada (${allProducts.length} produk) tapi nama/harga kosong.<br>
                Klik <b>Hapus Semua</b> lalu <b>Scrape ulang</b> — data lama perlu diperbarui.`;
        }
        return;
    }

    empty.style.display = 'none';
    table.style.display = 'table';

    body.innerHTML = filteredProducts.slice(-100).reverse().map((p) => {
        const name      = p.name || '(tanpa nama)';
        const short     = name.length > 28 ? name.substring(0, 28) + '…' : name;
        const shopName  = p.shop_name || '-';
        const shortShop = shopName.length > 18 ? shopName.substring(0, 18) + '…' : shopName;
        const link      = makeAffiliateUrl(p.product_url) || p.product_url;
        return `<tr>
            <td><a href="${link}" target="_blank" title="${name.replace(/"/g, '&quot;')}">${short}</a></td>
            <td title="${shopName}">${shortShop}</td>
            <td>${fmtPrice(p.price_min)}</td>
            <td>${p.rating_star || '-'}</td>
            <td>${p.review_count ?? '-'}</td>
            <td>${p.sold || '-'}</td>
            <td>${p.shop_location || '-'}</td>
        </tr>`;
    }).join('');
}

function renderStatus(status) {
    const bar       = document.getElementById('statusBar');
    const btnScrape = document.getElementById('btnScrape');
    const btnStop   = document.getElementById('btnStop');

    if (!status) {
        bar.style.display = 'none';
        btnScrape.style.display = 'inline-block';
        btnStop.style.display   = 'none';
        btnScrape.disabled      = false;
        return;
    }
    bar.style.display = 'block';
    bar.className = 'status-bar status-' + status.status;

    if (status.status === 'running') {
        bar.textContent = `Scraping "${status.keyword}" — hal ${status.currentPage}/${status.maxPages} (${status.collected || 0} produk)`;
        btnScrape.style.display = 'none';
        btnStop.style.display   = 'inline-block';
    } else if (status.status === 'done') {
        bar.textContent = `Selesai! ${status.collected || allProducts.length} produk dari "${status.keyword}"`;
        btnScrape.style.display = 'inline-block';
        btnStop.style.display   = 'none';
        btnScrape.disabled      = false;
    } else {
        bar.textContent = `Dihentikan. ${status.collected || allProducts.length} produk tersimpan.`;
        btnScrape.style.display = 'inline-block';
        btnStop.style.display   = 'none';
        btnScrape.disabled      = false;
    }
}

// ── State polling ─────────────────────────────────────────────────────────────
function loadState() {
    chrome.runtime.sendMessage({ action: 'GET_STATE' }, (response) => {
        if (chrome.runtime.lastError || !response) return;
        allProducts  = response.products    || [];
        lastDebugRaw = response._debugRaw   || null;
        renderTable();
        renderStatus(response.scrapeStatus || null);
        if (response.scrapeStatus?.status !== 'running') stopPolling();
    });
}
function startPolling() { stopPolling(); loadState(); pollInterval = setInterval(loadState, 1000); }
function stopPolling()  { if (pollInterval) { clearInterval(pollInterval); pollInterval = null; } }

// ── Filter panel toggle ───────────────────────────────────────────────────────
document.getElementById('filterToggle').addEventListener('click', () => {
    const panel = document.getElementById('filterPanel');
    const open  = panel.style.display === 'block';
    panel.style.display = open ? 'none' : 'block';
    document.getElementById('filterArrow').textContent = open ? '▶' : '▼';
});

// Live filter — every input immediately re-renders the table
['fName','fShop','fLocation','fKeyword','fPriceMin','fPriceMax','fRating','fSold','fLiked','affiliateId']
    .forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', renderTable);
    });

document.getElementById('btnResetFilter').addEventListener('click', () => {
    ['fName','fShop','fLocation','fKeyword','fPriceMin','fPriceMax','fRating','fSold','fLiked']
        .forEach((id) => { const el = document.getElementById(id); if (el) el.value = ''; });
    renderTable();
});

// ── Scrape ────────────────────────────────────────────────────────────────────
document.getElementById('btnScrape').addEventListener('click', () => {
    const keyword  = document.getElementById('keyword').value.trim();
    const maxPages = Math.max(1, Math.min(20, parseInt(document.getElementById('maxPages').value) || 5));
    if (!keyword) { alert('Masukkan keyword terlebih dahulu.'); return; }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab) return;
        if (!tab.url?.includes('shopee.co.id')) {
            alert('Buka halaman shopee.co.id terlebih dahulu, lalu klik Scrape.');
            return;
        }
        if (tab.status !== 'complete') {
            alert('Halaman Shopee masih loading. Tunggu sebentar lalu coba lagi.');
            return;
        }
        sessionStartCount = allProducts.length;
        document.getElementById('btnScrape').disabled     = true;
        document.getElementById('btnScrape').style.display = 'none';
        document.getElementById('btnStop').style.display   = 'inline-block';
        chrome.runtime.sendMessage({ action: 'START_SCRAPE', keyword, maxPages, tabId: tab.id });
        startPolling();
    });
});

document.getElementById('btnStop').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'STOP_SCRAPE' });
    stopPolling(); loadState();
});

// ── Shared export data builder ────────────────────────────────────────────────
function buildExportData() {
    const toExport = filteredProducts.length > 0 ? filteredProducts : allProducts;
    const affiliateId = getAffiliateId();
    const cols = [
        { key: 'item_id',       label: 'Item ID',          type: 'string' },
        { key: 'name',          label: 'Nama Produk',       type: 'string' },
        { key: 'shop_name',     label: 'Nama Toko',         type: 'string' },
        { key: 'price_min',     label: 'Harga Min (Rp)',    type: 'price'  },
        { key: 'price_max',     label: 'Harga Max (Rp)',    type: 'price'  },
        { key: 'rating_star',   label: 'Rating',            type: 'number' },
        { key: 'review_count',  label: 'Jumlah Ulasan',    type: 'number' },
        { key: 'rating_count_5', label: 'Ulasan 5★',       type: 'number' },
        { key: 'rating_count_4', label: 'Ulasan 4★',       type: 'number' },
        { key: 'rating_count_3', label: 'Ulasan 3★',       type: 'number' },
        { key: 'rating_count_2', label: 'Ulasan 2★',       type: 'number' },
        { key: 'rating_count_1', label: 'Ulasan 1★',       type: 'number' },
        { key: 'sold',          label: 'Terjual',           type: 'number' },
        { key: 'liked_count',   label: 'Disukai',           type: 'number' },
        { key: 'shop_location', label: 'Lokasi Toko',       type: 'string' },
        { key: 'keyword',       label: 'Keyword',           type: 'string' },
        { key: 'product_url',   label: 'URL Produk',        type: 'url'    },
        { key: 'affiliate_url', label: 'URL Affiliate',     type: 'url'    },
        { key: 'scraped_at',    label: 'Waktu Scraping',    type: 'string' },
    ];
    const rows = toExport.map((p) => ({
        ...p,
        affiliate_url: affiliateId ? makeAffiliateUrl(p.product_url) : '',
    }));
    return { cols, rows };
}

// ── Download Excel (.xlsx) ────────────────────────────────────────────────────
document.getElementById('btnDownload').addEventListener('click', () => {
    const { cols, rows } = buildExportData();
    if (!rows.length) { alert('Belum ada data.'); return; }

    const xlsxBytes = buildXlsx(cols, rows);
    const blob = new Blob([xlsxBytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url  = URL.createObjectURL(blob);
    const ts   = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 16);
    const a    = document.createElement('a');
    a.href = url; a.download = `shopee_${ts}.xlsx`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// ── Export to Google Sheets ───────────────────────────────────────────────────
async function exportToGoogleSheets(cols, rows, sheetId) {
    const token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (t) => {
            if (chrome.runtime.lastError || !t) {
                reject(new Error(chrome.runtime.lastError?.message || 'Autentikasi gagal'));
            } else {
                resolve(t);
            }
        });
    });

    const base = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const metaRes = await fetch(`${base}?fields=sheets.properties`, { headers });
    if (!metaRes.ok) {
        const err = await metaRes.json().catch(() => ({}));
        if (metaRes.status === 404) throw new Error('Sheet ID tidak ditemukan. Periksa kembali ID spreadsheet.');
        if (metaRes.status === 403) throw new Error('Tidak punya akses ke spreadsheet ini. Pastikan akun Google yang login punya akses edit.');
        throw new Error(`Gagal mengakses spreadsheet: ${err?.error?.message || metaRes.statusText}`);
    }
    const meta = await metaRes.json();
    const sheetTitle = meta.sheets?.[0]?.properties?.title || 'Sheet1';
    const range = `${sheetTitle}!A1`;

    const clearRes = await fetch(
        `${base}/values/${encodeURIComponent(sheetTitle + '!A:ZZ')}:clear`,
        { method: 'POST', headers }
    );
    if (!clearRes.ok) throw new Error('Gagal menghapus isi sheet lama.');

    const headerRow = cols.map((c) => c.label);
    const dataRows  = rows.map((row) =>
        cols.map((c) => {
            const v = row[c.key];
            if (v == null) return '';
            if (c.type === 'price' || c.type === 'number') return typeof v === 'number' ? v : Number(v) || 0;
            return String(v);
        })
    );

    const writeRes = await fetch(
        `${base}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        { method: 'PUT', headers, body: JSON.stringify({ range, majorDimension: 'ROWS', values: [headerRow, ...dataRows] }) }
    );
    if (!writeRes.ok) {
        const err = await writeRes.json().catch(() => ({}));
        throw new Error(`Gagal menulis data: ${err?.error?.message || writeRes.statusText}`);
    }

    return dataRows.length;
}

document.getElementById('btnSheets').addEventListener('click', async () => {
    const { cols, rows } = buildExportData();
    if (!rows.length) { alert('Belum ada data untuk diekspor.'); return; }

    const sheetId = document.getElementById('sheetId').value.trim();
    if (!sheetId) {
        alert('Masukkan Google Sheet ID terlebih dahulu.\n\nCara mendapatkan ID:\nBuka spreadsheet → salin dari URL:\nhttps://docs.google.com/spreadsheets/d/[SHEET_ID]/edit');
        return;
    }

    const btn = document.getElementById('btnSheets');
    btn.disabled = true;
    btn.textContent = 'Mengekspor...';
    try {
        const count = await exportToGoogleSheets(cols, rows, sheetId);
        alert(`Berhasil! ${count} produk diekspor ke Google Sheets.`);
    } catch (err) {
        console.error('[Sheets export]', err);
        alert(`Ekspor gagal:\n${err.message}`);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '&#8679; Export ke Sheets';
    }
});

// ── Clear ─────────────────────────────────────────────────────────────────────
document.getElementById('btnClear').addEventListener('click', () => {
    if (!allProducts.length) return;
    if (!confirm(`Hapus ${allProducts.length} produk?`)) return;
    chrome.runtime.sendMessage({ action: 'CLEAR_DATA' });
    allProducts = filteredProducts = [];
    sessionStartCount = 0; lastDebugRaw = null;
    renderTable(); renderStatus(null);
    document.getElementById('debugBox').style.display = 'none';
});

// ── Debug ─────────────────────────────────────────────────────────────────────
document.getElementById('btnDebug').addEventListener('click', () => {
    const box = document.getElementById('debugBox');
    if (box.style.display === 'block') { box.style.display = 'none'; return; }
    box.textContent = lastDebugRaw || 'Belum ada data API.\nLakukan scraping terlebih dahulu lalu klik Debug API.';
    box.style.display = 'block';
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadState();
