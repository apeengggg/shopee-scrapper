import asyncio
import random
import urllib.parse
from datetime import datetime
from typing import Callable, Optional
from playwright.async_api import async_playwright, Page, Response


SEARCH_API_PATTERN = "/api/v4/search/search_items"
SHOPEE_BASE = "https://shopee.co.id"

_STEALTH_SCRIPT = """
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {}, app: { isInstalled: false }, webstore: {} };
    Object.defineProperty(navigator, 'plugins', {
        get: () => { const a = [1, 2, 3]; a.item = () => null; return a; }
    });
    Object.defineProperty(navigator, 'languages', {
        get: () => ['id-ID', 'id', 'en-US', 'en']
    });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory',        { get: () => 8 });
    if (navigator.permissions && navigator.permissions.query) {
        const _orig = navigator.permissions.query.bind(navigator.permissions);
        navigator.permissions.query = (p) =>
            p.name === 'notifications'
                ? Promise.resolve({ state: 'prompt', onchange: null })
                : _orig(p);
    }
"""


def _parse_item(item: dict, keyword: str) -> dict:
    item_id = item.get("itemid") or item.get("item_id") or item.get("id")
    shop_id = item.get("shopid") or item.get("shop_id")
    name = item.get("name", "")

    price_min = item.get("price_min", item.get("price", 0)) / 100000
    price_max = item.get("price_max", item.get("price", 0)) / 100000

    rating = item.get("item_rating", {})
    rating_star = rating.get("rating_star", 0.0) if isinstance(rating, dict) else 0.0

    sold = item.get("sold", item.get("historical_sold", 0))
    liked_count = item.get("liked_count", 0)
    shop_location = item.get("shop_location", "")
    image = item.get("image", "")
    image_url = f"https://cf.shopee.co.id/file/{image}" if image else ""

    slug = name.replace(" ", "-").lower()[:60]
    product_url = f"{SHOPEE_BASE}/{slug}-i.{shop_id}.{item_id}"

    return {
        "item_id": item_id,
        "shop_id": shop_id,
        "name": name,
        "price_min": round(price_min, 2),
        "price_max": round(price_max, 2),
        "rating_star": round(rating_star, 2),
        "sold": sold,
        "liked_count": liked_count,
        "shop_location": shop_location,
        "image_url": image_url,
        "product_url": product_url,
        "keyword": keyword,
        "scraped_at": datetime.now().isoformat(),
    }


async def _scroll_page(page: Page):
    for _ in range(4):
        await page.mouse.wheel(0, random.randint(300, 600))
        await asyncio.sleep(random.uniform(0.3, 0.8))


async def _type_human(page: Page, selector: str, text: str):
    """Type text character by character with small random delays."""
    await page.click(selector)
    await asyncio.sleep(random.uniform(0.3, 0.6))
    for char in text:
        await page.keyboard.type(char)
        await asyncio.sleep(random.uniform(0.05, 0.18))


async def _get_search_page(page: Page, keyword: str, log: callable) -> bool:
    """
    First page: use the homepage search box to look like a real user.
    Returns True if navigation succeeded.
    """
    log("[SEARCH] Locating search input on homepage...")
    # Shopee search box selectors (try multiple fallbacks)
    selectors = [
        'input[placeholder*="Cari"]',
        'input[type="search"]',
        'input[class*="search"]',
        '.shopee-searchbar-input__input',
    ]
    search_input = None
    for sel in selectors:
        try:
            el = await page.wait_for_selector(sel, timeout=4000)
            if el:
                search_input = sel
                log(f"[SEARCH] Found input: {sel}")
                break
        except Exception:
            continue

    if search_input:
        await _type_human(page, search_input, keyword)
        log(f"[SEARCH] Typed '{keyword}', pressing Enter...")
        async with page.expect_response(
            lambda r: SEARCH_API_PATTERN in r.url and r.status == 200,
            timeout=25000,
        ) as resp_info:
            await page.keyboard.press("Enter")
            await page.wait_for_load_state("domcontentloaded")
            await _scroll_page(page)

        return resp_info
    else:
        log("[WARN] Search box not found, falling back to direct URL navigation")
        return None


async def _fetch_page_data(
    page: Page,
    url: str,
    log: callable,
) -> "asyncio.Future | None":
    """Navigate to a search URL and return expect_response future."""
    log(f"[PAGE] Navigating to: {url}")
    try:
        async with page.expect_response(
            lambda r: SEARCH_API_PATTERN in r.url and r.status == 200,
            timeout=25000,
        ) as resp_info:
            nav_resp = await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            log(f"[OK] Page loaded - HTTP {nav_resp.status if nav_resp else 'N/A'}")
            await _scroll_page(page)
        return resp_info
    except Exception as e:
        log(f"[ERR] Navigation failed: {e}")
        return None


async def _parse_resp_info(resp_info, keyword: str, log: callable) -> list[dict]:
    """Read and parse the captured API response. Browser must still be open."""
    try:
        api_response = await resp_info.value
        log(f"[API] Got response - status {api_response.status}, parsing JSON...")
        data = await api_response.json()

        top_keys = list(data.keys())
        log(f"[DATA] Response keys: {top_keys}")

        if "items" not in data:
            log("[WARN] 'items' key missing - bot-detected (error: 90309999) or rate-limited")
            if "error" in data:
                log(f"[WARN] error code: {data.get('error')}")
            return []

        items = data["items"]
        log(f"[ITEMS] Items in response: {len(items)}")

        products = []
        skip = 0
        for entry in items:
            raw = entry.get("item", entry)
            parsed = _parse_item(raw, keyword)
            if parsed["item_id"]:
                products.append(parsed)
            else:
                skip += 1
                if skip == 1:
                    log(f"[WARN] Sample item keys (no item_id): {list(raw.keys())[:15]}")

        log(f"[OK] Parsed: {len(products)} | Skipped: {skip}")
        return products

    except Exception as e:
        log(f"[ERR] Failed to parse API response: {e}")
        return []


# Log-only response listener (no data parsing - avoids race conditions)
def _make_log_listener(log: callable):
    def _on_response(response: Response):
        url = response.url
        if "verify/traffic" in url:
            log(f"  [BLOCK] Bot-check page: {url[:90]}")
        elif SEARCH_API_PATTERN in url:
            log(f"  [API] Fired - status {response.status}")
        elif "/api/v4/" in url:
            log(f"  [OTHER-API] {url[:90]}")
    return _on_response


async def scrape_keyword(
    keyword: str,
    max_pages: int = 5,
    progress_callback: Optional[Callable[[int, int, int], None]] = None,
    log_callback: Optional[Callable[[str], None]] = None,
) -> list[dict]:
    def log(msg: str):
        ts = datetime.now().strftime("%H:%M:%S")
        line = f"[{ts}] {msg}"
        print(line)
        if log_callback:
            log_callback(line)

    all_products: list[dict] = []
    log(f"[START] Scraper started - keyword='{keyword}', max_pages={max_pages}")

    async with async_playwright() as pw:
        log("[BROWSER] Launching Chromium (headless)...")
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )
        context = await browser.new_context(
            locale="id-ID",
            timezone_id="Asia/Jakarta",
            viewport={"width": 1366, "height": 768},
            extra_http_headers={"Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        await context.add_init_script(_STEALTH_SCRIPT)

        page = await context.new_page()
        page.on("response", _make_log_listener(log))
        log("[OK] Browser ready with stealth patches applied")

        # -- Warmup: load homepage with networkidle so all fingerprint JS runs --
        log("[WARMUP] Loading homepage (networkidle) to let fingerprinting cookies settle...")
        try:
            await page.goto(SHOPEE_BASE, wait_until="networkidle", timeout=40000)
            wait_s = round(random.uniform(4.0, 6.0), 1)
            log(f"[WARMUP] Page fully idle. Waiting {wait_s}s for cookies to mature...")
            await asyncio.sleep(wait_s)
            log("[OK] Warmup done - session cookies established")
        except Exception as e:
            log(f"[WARN] Warmup failed ({e}), continuing anyway...")

        kw_encoded = urllib.parse.quote_plus(keyword)

        for page_num in range(max_pages):
            offset = page_num * 60
            log(f"\n--- Halaman {page_num + 1}/{max_pages} ---")

            if page_num == 0:
                # First page: type in search box from homepage (most human-like)
                resp_info = await _get_search_page(page, keyword, log)
                if resp_info is None:
                    # Fallback to URL navigation
                    url = f"{SHOPEE_BASE}/search?keyword={kw_encoded}&page=0&newest=0"
                    resp_info = await _fetch_page_data(page, url, log)
            else:
                # Subsequent pages: direct URL navigation
                url = f"{SHOPEE_BASE}/search?keyword={kw_encoded}&page={page_num}&newest={offset}"
                resp_info = await _fetch_page_data(page, url, log)

            if resp_info is None:
                if progress_callback:
                    progress_callback(page_num + 1, max_pages, len(all_products))
                continue

            page_products = await _parse_resp_info(resp_info, keyword, log)

            if page_products:
                seen_ids = {p["item_id"] for p in all_products}
                new_items = [p for p in page_products if p["item_id"] not in seen_ids]
                all_products.extend(new_items)
                log(f"[RESULT] {len(page_products)} items, {len(new_items)} new, {len(page_products)-len(new_items)} dup")
            else:
                log("[WARN] No products collected from this page")

            log(f"[TOTAL] Running total: {len(all_products)} products")

            if progress_callback:
                progress_callback(page_num + 1, max_pages, len(all_products))

            if page_num < max_pages - 1:
                delay = round(random.uniform(2.5, 5.0), 1)
                log(f"[DELAY] Waiting {delay}s before next page...")
                await asyncio.sleep(delay)

        log(f"\n[DONE] Scraping finished - total {len(all_products)} products")
        await browser.close()
        log("[OK] Browser closed")

    return all_products
