const SHOPEE_BASE = 'https://shopee.co.id';
let scrapeSession = null; // { keyword, maxPages, currentPage, tabId }

function buildSearchUrl(keyword, page) {
    const offset = page * 60;
    return `${SHOPEE_BASE}/search?keyword=${encodeURIComponent(keyword)}&page=${page}&newest=${offset}`;
}

function round2(n) {
    return Math.round(n * 100) / 100;
}

function parseItem(raw, keyword) {
    const itemId = raw.itemid || raw.item_id || raw.id;
    const shopId = raw.shopid || raw.shop_id;
    const name = raw.name || '';
    const priceMin = round2((raw.price_min || raw.price || 0) / 100000);
    const priceMax = round2((raw.price_max || raw.price || 0) / 100000);
    const ratingObj = raw.item_rating;
    const ratingStar = ratingObj ? round2(ratingObj.rating_star || 0) : 0;
    const sold = raw.sold || raw.historical_sold || 0;
    const slug = name.replace(/\s+/g, '-').toLowerCase().substring(0, 60);
    const productUrl = `${SHOPEE_BASE}/${slug}-i.${shopId}.${itemId}`;
    const image = raw.image || '';
    const imageUrl = image ? `https://cf.shopee.co.id/file/${image}` : '';

    return {
        item_id: itemId,
        shop_id: shopId,
        name,
        price_min: priceMin,
        price_max: priceMax,
        rating_star: ratingStar,
        sold,
        liked_count: raw.liked_count || 0,
        shop_location: raw.shop_location || '',
        image_url: imageUrl,
        product_url: productUrl,
        keyword,
        scraped_at: new Date().toISOString(),
    };
}

async function handleSearchData(data, keyword, tabId) {
    if (!data || !data.items) return;

    const newProducts = [];
    for (const entry of data.items) {
        const raw = entry.item || entry;
        const parsed = parseItem(raw, keyword);
        if (parsed.item_id) newProducts.push(parsed);
    }
    if (newProducts.length === 0) return;

    const stored = await chrome.storage.local.get(['products']);
    const existing = stored.products || [];
    const existingIds = new Set(existing.map((p) => p.item_id));
    const merged = [...existing, ...newProducts.filter((p) => !existingIds.has(p.item_id))];

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

    await chrome.storage.local.set({ products: merged, scrapeStatus: status });

    // Auto-navigate to next page if scraping session is active
    if (scrapeSession && tabId) {
        scrapeSession.currentPage++;
        if (scrapeSession.currentPage < scrapeSession.maxPages) {
            const nextUrl = buildSearchUrl(scrapeSession.keyword, scrapeSession.currentPage);
            setTimeout(() => {
                chrome.tabs.update(tabId, { url: nextUrl }).catch(() => {});
            }, 3000);
        } else {
            scrapeSession = null;
        }
    }
}

function startScrape(keyword, maxPages, tabId) {
    scrapeSession = { keyword, maxPages, currentPage: 0, tabId };
    chrome.storage.local.set({
        scrapeStatus: { keyword, maxPages, currentPage: 0, collected: 0, status: 'running' },
    });
    chrome.tabs.update(tabId, { url: buildSearchUrl(keyword, 0) }).catch(() => {});
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'SEARCH_DATA') {
        let keyword = scrapeSession?.keyword || '';
        if (!keyword) {
            try {
                keyword = new URL(sender.tab?.url || '').searchParams.get('keyword') || '';
            } catch (_) {}
        }
        handleSearchData(msg.data, keyword, sender.tab?.id);
        return;
    }

    if (msg.action === 'START_SCRAPE') {
        startScrape(msg.keyword, msg.maxPages, msg.tabId);
        return;
    }

    if (msg.action === 'STOP_SCRAPE') {
        scrapeSession = null;
        chrome.storage.local.get(['scrapeStatus'], (data) => {
            const s = data.scrapeStatus;
            if (s) chrome.storage.local.set({ scrapeStatus: { ...s, status: 'stopped' } });
        });
        return;
    }

    if (msg.action === 'GET_STATE') {
        chrome.storage.local.get(['products', 'scrapeStatus'], sendResponse);
        return true;
    }

    if (msg.action === 'CLEAR_DATA') {
        scrapeSession = null;
        chrome.storage.local.set({ products: [], scrapeStatus: null });
        return;
    }
});
