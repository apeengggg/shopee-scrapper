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

    # Log-only listener — no data parsing here to avoid race conditions
    def _on_response(response: Response):
        url = response.url
        if "verify/traffic" in url:
            log(f"  [BLOCK] Bot-check detected: {url[:90]}")
        elif SEARCH_API_PATTERN in url:
            log(f"  [API] Response fired — status {response.status} — will parse via expect_response")
        elif "/api/v4/" in url:
            log(f"  [OTHER-API] {url[:90]}")

    all_products: list[dict] = []

    log(f"[START] Scraper started — keyword='{keyword}', max_pages={max_pages}")

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
        page.on("response", _on_response)
        log("[OK] Browser ready with stealth patches applied")

        # Warm up: get cookies from homepage
        log("[WARMUP] Visiting homepage to establish session...")
        try:
            await page.goto(SHOPEE_BASE, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(random.uniform(1.5, 2.5))
            log("[OK] Homepage loaded — cookies established")
        except Exception as e:
            log(f"[WARN] Homepage warmup failed (continuing): {e}")

        kw_encoded = urllib.parse.quote_plus(keyword)

        for page_num in range(max_pages):
            offset = page_num * 60
            url = f"{SHOPEE_BASE}/search?keyword={kw_encoded}&page={page_num}&newest={offset}"

            log(f"\n--- Halaman {page_num + 1}/{max_pages} ---")
            log(f"[PAGE] Navigating to: {url}")

            page_products: list[dict] = []

            try:
                # expect_response waits for the API response WHILE navigating + scrolling.
                # This avoids the race condition where response.json() runs after browser close.
                async with page.expect_response(
                    lambda r: SEARCH_API_PATTERN in r.url and r.status == 200,
                    timeout=20000,
                ) as resp_info:
                    nav_resp = await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                    log(f"[OK] Page loaded — HTTP {nav_resp.status if nav_resp else 'N/A'}")
                    log("[SCROLL] Scrolling page...")
                    await _scroll_page(page)

                # Browser is still open here — safe to read the response body
                api_response = await resp_info.value
                log(f"[API] Got response — status {api_response.status}, parsing JSON...")
                data = await api_response.json()

                top_keys = list(data.keys())
                log(f"[DATA] Response keys: {top_keys}")

                if "items" not in data:
                    log("[WARN] 'items' key missing — likely bot-detected or rate-limited")
                    if "error" in data:
                        log(f"[WARN] error value: {str(data.get('error'))[:120]}")
                else:
                    items = data.get("items", [])
                    log(f"[ITEMS] Items in response: {len(items)}")

                    parsed_count = 0
                    skip_count = 0
                    for entry in items:
                        raw = entry.get("item", entry)
                        parsed = _parse_item(raw, keyword)
                        if parsed["item_id"]:
                            page_products.append(parsed)
                            parsed_count += 1
                        else:
                            skip_count += 1

                    log(f"[OK] Parsed: {parsed_count} | Skipped (no item_id): {skip_count}")

                    if items and parsed_count == 0:
                        sample = items[0].get("item", items[0])
                        log(f"[WARN] Sample item keys: {list(sample.keys())[:15]}")

            except Exception as e:
                if "Timeout" in str(e) or "timeout" in str(e):
                    log(f"[ERR] Timed out waiting for search API response (20s). Page may be blocked.")
                else:
                    log(f"[ERR] {e}")

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

        log(f"\n[DONE] Scraping finished — total {len(all_products)} products")
        await browser.close()
        log("[OK] Browser closed")

    return all_products
