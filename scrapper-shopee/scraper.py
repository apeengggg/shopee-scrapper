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
) -> list[dict]:
    """
    Scrape Shopee search results for a keyword.

    progress_callback(current_page, total_pages, items_so_far)
    """
    all_products: list[dict] = []
    intercepted: list[dict] = []

    async def handle_response(response: Response):
        if SEARCH_API_PATTERN in response.url:
            try:
                data = await response.json()
                items = data.get("items", [])
                for entry in items:
                    # items can be wrapped: {"item": {...}} or flat
                    raw = entry.get("item", entry)
                    parsed = _parse_item(raw, keyword)
                    if parsed["item_id"]:
                        intercepted.append(parsed)
            except Exception:
                pass

    async with async_playwright() as pw:
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

        for page_num in range(max_pages):
            intercepted.clear()
            offset = page_num * 60
            url = (
                f"{SHOPEE_BASE}/search?keyword={keyword}"
                f"&page={page_num}&newest={offset}"
            )

            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                await _scroll_page(page)
                # Wait a moment to let deferred API responses arrive
                await asyncio.sleep(2.0)
            except Exception as e:
                if progress_callback:
                    progress_callback(page_num + 1, max_pages, len(all_products))
                break

            if intercepted:
                seen_ids = {p["item_id"] for p in all_products}
                new_items = [p for p in intercepted if p["item_id"] not in seen_ids]
                all_products.extend(new_items)

            if progress_callback:
                progress_callback(page_num + 1, max_pages, len(all_products))

            if page_num < max_pages - 1:
                delay = random.uniform(2.5, 5.0)
                await asyncio.sleep(delay)

        await browser.close()

    return all_products
