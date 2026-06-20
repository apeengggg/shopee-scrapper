import asyncio
import random
from datetime import datetime
from typing import Callable, Optional
from playwright.async_api import async_playwright, Page, Response


SEARCH_API_PATTERN = "/api/v4/search/search_items"
SHOPEE_BASE = "https://shopee.co.id"


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
    """
    Scrape Shopee search results for a keyword.

    progress_callback(current_page, total_pages, items_so_far)
    log_callback(message) — called for every log event
    """
    def log(msg: str):
        ts = datetime.now().strftime("%H:%M:%S")
        line = f"[{ts}] {msg}"
        print(line)
        if log_callback:
            log_callback(line)

    all_products: list[dict] = []
    intercepted: list[dict] = []
    api_responses_seen: list[str] = []

    async def handle_response(response: Response):
        url = response.url
        if SEARCH_API_PATTERN in url:
            api_responses_seen.append(url)
            log(f"  ✅ API intercepted — status {response.status} — {url[:100]}")
            try:
                data = await response.json()
                top_keys = list(data.keys())
                log(f"  📦 Response keys: {top_keys}")

                items = data.get("items", [])
                log(f"  📋 Items in response: {len(items)}")

                parsed_count = 0
                skip_count = 0
                for entry in items:
                    raw = entry.get("item", entry)
                    parsed = _parse_item(raw, keyword)
                    if parsed["item_id"]:
                        intercepted.append(parsed)
                        parsed_count += 1
                    else:
                        skip_count += 1

                log(f"  ✔  Parsed OK: {parsed_count} | Skipped (no item_id): {skip_count}")

                if items and parsed_count == 0:
                    # Help debug key names in the raw item
                    sample = items[0].get("item", items[0])
                    log(f"  ⚠️  Sample item keys: {list(sample.keys())[:15]}")

            except Exception as e:
                log(f"  ❌ Failed to parse JSON response: {e}")
        else:
            # Log first non-API response URLs briefly (for pattern discovery)
            if any(kw in url for kw in ["search", "api", "shopee"]):
                log(f"  ↳ Other response: {url[:80]}")

    log(f"🚀 Starting scraper — keyword='{keyword}', max_pages={max_pages}")

    async with async_playwright() as pw:
        log("🌐 Launching Chromium browser (headless)...")
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            locale="id-ID",
            extra_http_headers={"Accept-Language": "id-ID,id;q=0.9,en;q=0.8"},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        page = await context.new_page()
        page.on("response", handle_response)
        log("✔  Browser ready, response listener attached")

        for page_num in range(max_pages):
            intercepted.clear()
            api_responses_seen.clear()
            offset = page_num * 60
            url = (
                f"{SHOPEE_BASE}/search?keyword={keyword}"
                f"&page={page_num}&newest={offset}"
            )

            log(f"\n─── Halaman {page_num + 1}/{max_pages} ───")
            log(f"📄 Navigating to: {url}")

            try:
                resp = await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                log(f"✔  Page loaded — HTTP {resp.status if resp else 'N/A'}")
            except Exception as e:
                log(f"❌ Navigation failed: {e}")
                if progress_callback:
                    progress_callback(page_num + 1, max_pages, len(all_products))
                break

            log("🖱  Scrolling page...")
            await _scroll_page(page)

            log("⏳ Waiting 2s for deferred API responses...")
            await asyncio.sleep(2.0)

            if not api_responses_seen:
                log("⚠️  No API response intercepted on this page!")
                log(f"    Expected URL pattern: ...{SEARCH_API_PATTERN}...")

            if intercepted:
                seen_ids = {p["item_id"] for p in all_products}
                new_items = [p for p in intercepted if p["item_id"] not in seen_ids]
                all_products.extend(new_items)
                log(f"📊 Page result: {len(intercepted)} items, {len(new_items)} new, {len(intercepted)-len(new_items)} dup")
            else:
                log("⚠️  No products collected from this page")

            log(f"📈 Running total: {len(all_products)} products")

            if progress_callback:
                progress_callback(page_num + 1, max_pages, len(all_products))

            if page_num < max_pages - 1:
                delay = round(random.uniform(2.5, 5.0), 1)
                log(f"⏸  Waiting {delay}s before next page...")
                await asyncio.sleep(delay)

        log(f"\n🏁 Scraping done — total {len(all_products)} products collected")
        await browser.close()
        log("✔  Browser closed")

    return all_products
