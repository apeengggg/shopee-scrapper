let allProducts = [];
let sessionStartCount = 0;
let pollInterval = null;

function fmtPrice(p) {
    if (!p && p !== 0) return '-';
    return 'Rp ' + Math.round(p).toLocaleString('id-ID');
}

function renderTable(products) {
    const empty = document.getElementById('emptyState');
    const table = document.getElementById('productTable');
    const body = document.getElementById('productBody');

    document.getElementById('countTotal').textContent = products.length;
    const keywords = new Set(products.map((p) => p.keyword).filter(Boolean));
    document.getElementById('countKeywords').textContent = keywords.size;
    document.getElementById('countNew').textContent = Math.max(0, products.length - sessionStartCount);

    if (products.length === 0) {
        empty.style.display = 'block';
        table.style.display = 'none';
        return;
    }

    empty.style.display = 'none';
    table.style.display = 'table';

    const rows = products.slice(-100).reverse();
    body.innerHTML = rows.map((p) => {
        const name = p.name || '';
        const short = name.length > 35 ? name.substring(0, 35) + '...' : name;
        return `<tr>
            <td><a href="${p.product_url}" target="_blank" title="${name.replace(/"/g, '&quot;')}">${short}</a></td>
            <td>${fmtPrice(p.price_min)}</td>
            <td>${p.rating_star}</td>
            <td>${p.sold}</td>
            <td>${p.shop_location || '-'}</td>
        </tr>`;
    }).join('');
}

function renderStatus(status) {
    const bar = document.getElementById('statusBar');
    const btnScrape = document.getElementById('btnScrape');
    const btnStop = document.getElementById('btnStop');

    if (!status) {
        bar.style.display = 'none';
        btnScrape.style.display = 'inline-block';
        btnStop.style.display = 'none';
        btnScrape.disabled = false;
        return;
    }

    bar.style.display = 'block';
    bar.className = 'status-bar status-' + status.status;

    if (status.status === 'running') {
        bar.textContent = `Scraping "${status.keyword}" — halaman ${status.currentPage}/${status.maxPages} (${status.collected || 0} produk dikumpulkan)`;
        btnScrape.style.display = 'none';
        btnStop.style.display = 'inline-block';
    } else if (status.status === 'done') {
        bar.textContent = `Selesai! ${status.collected || allProducts.length} produk dari keyword "${status.keyword}"`;
        btnScrape.style.display = 'inline-block';
        btnStop.style.display = 'none';
        btnScrape.disabled = false;
    } else if (status.status === 'stopped') {
        bar.textContent = `Dihentikan. ${status.collected || allProducts.length} produk tersimpan.`;
        btnScrape.style.display = 'inline-block';
        btnStop.style.display = 'none';
        btnScrape.disabled = false;
    }
}

function loadState() {
    chrome.runtime.sendMessage({ action: 'GET_STATE' }, (response) => {
        if (chrome.runtime.lastError || !response) return;
        allProducts = response.products || [];
        const status = response.scrapeStatus || null;
        renderTable(allProducts);
        renderStatus(status);
        if (status?.status !== 'running') {
            stopPolling();
        }
    });
}

function startPolling() {
    stopPolling();
    loadState();
    pollInterval = setInterval(loadState, 1000);
}

function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

document.getElementById('btnScrape').addEventListener('click', () => {
    const keyword = document.getElementById('keyword').value.trim();
    const maxPages = Math.max(1, Math.min(20, parseInt(document.getElementById('maxPages').value) || 5));

    if (!keyword) {
        alert('Masukkan keyword terlebih dahulu.');
        return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab) return;

        if (!tab.url || !tab.url.includes('shopee.co.id')) {
            alert('Buka halaman shopee.co.id terlebih dahulu, lalu klik Scrape.');
            return;
        }

        sessionStartCount = allProducts.length;
        document.getElementById('btnScrape').disabled = true;
        document.getElementById('btnScrape').style.display = 'none';
        document.getElementById('btnStop').style.display = 'inline-block';

        chrome.runtime.sendMessage({
            action: 'START_SCRAPE',
            keyword,
            maxPages,
            tabId: tab.id,
        });

        startPolling();
    });
});

document.getElementById('btnStop').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'STOP_SCRAPE' });
    stopPolling();
    loadState();
});

document.getElementById('btnDownload').addEventListener('click', () => {
    if (allProducts.length === 0) {
        alert('Belum ada data.');
        return;
    }

    const cols = [
        'item_id', 'name', 'price_min', 'price_max', 'rating_star',
        'sold', 'liked_count', 'shop_location', 'keyword', 'product_url', 'scraped_at',
    ];

    function escape(val) {
        const s = String(val ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n')
            ? '"' + s.replace(/"/g, '""') + '"'
            : s;
    }

    const header = cols.join(',');
    const rows = allProducts.map((p) => cols.map((c) => escape(p[c])).join(','));
    const csv = '﻿' + [header, ...rows].join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 16);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopee_${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
});

document.getElementById('btnClear').addEventListener('click', () => {
    if (allProducts.length === 0) return;
    if (!confirm(`Hapus ${allProducts.length} produk yang tersimpan?`)) return;
    chrome.runtime.sendMessage({ action: 'CLEAR_DATA' });
    allProducts = [];
    sessionStartCount = 0;
    renderTable([]);
    renderStatus(null);
});

// Initial load
loadState();
