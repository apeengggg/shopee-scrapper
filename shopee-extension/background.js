const SHOPEE_BASE = 'https://shopee.co.id';
let scrapeSession = null;
let pageTimeoutId = null;

(async () => {
    const data = await chrome.storage.local.get(['scrapeSession']);
    if (data.scrapeSession?.status === 'running') scrapeSession = data.scrapeSession;
})();

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (!scrapeSession || tabId !== scrapeSession.tabId) return;
    if (changeInfo.status !== 'complete') return;
    if (pageTimeoutId) clearTimeout(pageTimeoutId);
    pageTimeoutId = setTimeout(() => {
        pageTimeoutId = null;
        if (!scrapeSession) return;
        scrapeSession.currentPage++;
        if (scrapeSession.currentPage < scrapeSession.maxPages) {
            chrome.tabs.update(scrapeSession.tabId, { url: buildSearchUrl(scrapeSession.keyword, scrapeSession.currentPage) }).catch(() => {});
        } else {
            scrapeSession = null;
        }
    }, 20000);
});

function buildSearchUrl(keyword, page) {
    return `${SHOPEE_BASE}/search?keyword=${encodeURIComponent(keyword)}&page=${page}&newest=${page * 60}`;
}

function round2(n) { return Math.round(n * 100) / 100; }

// Try keys at top level first, then inside sub-objects
function dig(entry, ...keys) {
    for (const k of keys) {
        if (entry[k] != null && entry[k] !== '') return entry[k];
    }
    const subs = ['item_basic', 'item', 'product', 'data'];
    for (const s of subs) {
        if (entry[s] && typeof entry[s] === 'object') {
            for (const k of keys) {
                if (entry[s][k] != null && entry[s][k] !== '') return entry[s][k];
            }
        }
    }
    return undefined;
}

function dataScore(p) {
    return (p.name ? 4 : 0) + (p.price_min > 0 ? 2 : 0) + (p.rating_star > 0 ? 1 : 0);
}

function parseItem(entry, keyword) {
    const sub = entry.item_basic || entry.item || entry.product || {};

    const itemId = dig(entry, 'itemid', 'item_id', 'id');
    const shopId = dig(entry, 'shopid', 'shop_id');
    if (!itemId || !shopId) return null;

    const name        = dig(entry, 'name', 'title', 'product_name', 'item_name') || '';
    const rawPriceMin = dig(entry, 'price_min', 'min_price') ?? dig(entry, 'price', 'sale_price') ?? 0;
    const rawPriceMax = dig(entry, 'price_max', 'max_price') ?? dig(entry, 'price') ?? 0;
    const ratingObj   = sub.item_rating || entry.item_rating;
    const ratingStar  = ratingObj ? round2(ratingObj.rating_star || 0) : 0;
    const sold        = dig(entry, 'sold', 'historical_sold', 'sold_count') ?? 0;
    const likedCount  = dig(entry, 'liked_count', 'like_count') ?? 0;
    const shopLoc     = dig(entry, 'shop_location', 'location', 'city') || '';
    const shopName    = dig(entry, 'shop_name', 'shopname', 'account_name') || '';
    const image       = dig(entry, 'image', 'thumbnail', 'cover') || '';

    const priceMin  = round2(rawPriceMin / 100000);
    const priceMax  = round2(rawPriceMax / 100000);
    const slug      = name.replace(/[^a-zA-Z0-9À-ɏ]/g, '-').replace(/-+/g, '-')
                          .toLowerCase().substring(0, 60).replace(/^-|-$/g, '');
    const productUrl = slug
        ? `${SHOPEE_BASE}/${slug}-i.${shopId}.${itemId}`
        : `${SHOPEE_BASE}/-i.${shopId}.${itemId}`;

    return {
        item_id: itemId, shop_id: shopId, name,
        price_min: priceMin, price_max: priceMax, rating_star: ratingStar,
        sold, liked_count: likedCount, shop_location: shopLoc, shop_name: shopName,
        image_url: image ? `https://cf.shopee.co.id/file/${image}` : '',
        product_url: productUrl, keyword,
        scraped_at: new Date().toISOString(),
    };
}

async function handleSearchData(data, keyword, tabId) {
    if (!data) return;
    if (pageTimeoutId) { clearTimeout(pageTimeoutId); pageTimeoutId = null; }

    // Capture raw structure for the Debug button (reset each scrape session)
    const prev = await chrome.storage.local.get(['_debugRaw']);
    if (!prev._debugRaw && data.items?.length) {
        const sample = data.items.slice(0, 2);
        await chrome.storage.local.set({ _debugRaw: JSON.stringify(sample, null, 2).substring(0, 8000) });
    }

    if (!data.items?.length) return;

    const newProducts = [];
    for (const entry of data.items) {
        const parsed = parseItem(entry, keyword);
        if (parsed) newProducts.push(parsed);
    }
    if (!newProducts.length) return;

    const stored = await chrome.storage.local.get(['products']);
    const existing = stored.products || [];

    // Smart merge: prefer the entry with better data quality (score)
    const map = new Map(existing.map((p) => [p.item_id, p]));
    for (const p of newProducts) {
        const old = map.get(p.item_id);
        if (!old || dataScore(p) > dataScore(old)) map.set(p.item_id, p);
    }
    const merged = [...map.values()];

    let status = null;
    if (scrapeSession) {
        const page = scrapeSession.currentPage + 1;
        const done = page >= scrapeSession.maxPages;
        status = {
            keyword: scrapeSession.keyword,
            maxPages: scrapeSession.maxPages,
            currentPage: page,
            collected: merged.length,
            status: done ? 'done' : 'running',
        };
    }

    await chrome.storage.local.set({ products: merged, scrapeStatus: status, scrapeSession });

    if (scrapeSession && tabId) {
        scrapeSession.currentPage++;
        if (scrapeSession.currentPage < scrapeSession.maxPages) {
            const nextUrl = buildSearchUrl(scrapeSession.keyword, scrapeSession.currentPage);
            setTimeout(() => chrome.tabs.update(tabId, { url: nextUrl }).catch(() => {}), 3000);
        } else {
            scrapeSession = null;
            chrome.storage.local.set({ scrapeSession: null });
        }
    }
}

function startScrape(keyword, maxPages, tabId) {
    scrapeSession = { keyword, maxPages, currentPage: 0, tabId };
    chrome.storage.local.set({
        scrapeStatus: { keyword, maxPages, currentPage: 0, collected: 0, status: 'running' },
        _debugRaw: null,
    });
    chrome.tabs.update(tabId, { url: buildSearchUrl(keyword, 0) }).catch(() => {});
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'SEARCH_DATA') {
        let keyword = scrapeSession?.keyword || '';
        if (!keyword) {
            try { keyword = new URL(sender.tab?.url || '').searchParams.get('keyword') || ''; } catch (_) {}
        }
        handleSearchData(msg.data, keyword, sender.tab?.id);
        return;
    }
    if (msg.action === 'START_SCRAPE') { startScrape(msg.keyword, msg.maxPages, msg.tabId); return; }
    if (msg.action === 'STOP_SCRAPE') {
        scrapeSession = null;
        chrome.storage.local.get(['scrapeStatus'], (d) => {
            const s = d.scrapeStatus;
            if (s) chrome.storage.local.set({ scrapeStatus: { ...s, status: 'stopped' } });
        });
        return;
    }
    if (msg.action === 'GET_STATE') {
        chrome.storage.local.get(['products', 'scrapeStatus', '_debugRaw'], sendResponse);
        return true;
    }
    if (msg.action === 'CLEAR_DATA') {
        scrapeSession = null;
        chrome.storage.local.set({ products: [], scrapeStatus: null, _debugRaw: null, scrapeSession: null });
        return;
    }
});
