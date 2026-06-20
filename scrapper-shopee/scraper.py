import asyncio
import json
import os
import random
import urllib.parse
from datetime import datetime
from typing import Callable, Optional
from playwright.async_api import async_playwright, Page, Response, BrowserContext
from playwright_stealth import Stealth

_stealth = Stealth(
    navigator_languages_override=("id-ID", "id"),
    navigator_platform_override="Win32",
)


SEARCH_API_PATTERN = "/api/v4/search/search_items"
SHOPEE_BASE = "https://shopee.co.id"
SESSION_FILE = os.path.join(os.path.dirname(__file__), "data", "session.json")


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


async def _make_context(pw, log: callable) -> "BrowserContext":
    browser = await pw.chromium.launch(
        headless=False,
        args=[
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-infobars",
            "--window-size=1366,768",
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

    # Load saved session if available
    if os.path.exists(SESSION_FILE):
        with open(SESSION_FILE, encoding="utf-8") as f:
            storage = json.load(f)
        await context.add_cookies(storage.get("cookies", []))
        log(f"[SESSION] Loaded saved session from {SESSION_FILE}")
    else:
        log("[SESSION] No saved session found - will scrape without login")

    return browser, context


async def _parse_resp_info(resp_info, keyword: str, log: callable) -> list[dict]:
    try:
        api_response = await resp_info.value
        log(f"[API] Got response - status {api_response.status}, parsing JSON...")
        data = await api_response.json()

        top_keys = list(data.keys())
        log(f"[DATA] Response keys: {top_keys}")

        if "items" not in data:
            log("[WARN] 'items' key missing - bot-detected (error 90309999) or rate-limited")
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

        log(f"[OK] Parsed: {len(products)} | Skipped (no item_id): {skip}")
        return products

    except Exception as e:
        log(f"[ERR] Failed to parse API response: {e}")
        return []


async def save_session(log_callback: Optional[Callable[[str], None]] = None):
    """
    Open a visible browser so the user can log in to Shopee manually.
    Saves cookies to data/session.json when done.
    """
    def log(msg: str):
        ts = datetime.now().strftime("%H:%M:%S")
        line = f"[{ts}] {msg}"
        print(line)
        if log_callback:
            log_callback(line)

    os.makedirs(os.path.dirname(SESSION_FILE), exist_ok=True)

    log("[LOGIN] Opening browser for manual login...")
    log("[LOGIN] Please log in to Shopee, then close the browser window.")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = await browser.new_context(
            locale="id-ID",
            timezone_id="Asia/Jakarta",
            viewport={"width": 1280, "height": 800},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        page = await context.new_page()
        await _stealth.apply_stealth_async(page)
        await page.goto(f"{SHOPEE_BASE}/buyer/login", wait_until="domcontentloaded")
        log("[LOGIN] Waiting for you to login... (close the browser window when done)")

        # Wait until the browser is closed by the user
        try:
            await page.wait_for_url("**/", timeout=300000)
            await asyncio.sleep(3)
        except Exception:
            pass

        cookies = await context.cookies()
        session_data = {"cookies": cookies}
        with open(SESSION_FILE, "w", encoding="utf-8") as f:
            json.dump(session_data, f, ensure_ascii=False, indent=2)

        await browser.close()
        log(f"[LOGIN] Session saved to {SESSION_FILE}")


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

    def _on_response(response: Response):
        url = response.url
        if "verify/traffic" in url:
            log(f"  [BLOCK] Bot-check page detected!")
        elif SEARCH_API_PATTERN in url:
            log(f"  [API] Fired - status {response.status}")
        elif "/api/v4/" in url and "abtest" not in url and "subaccount" not in url:
            log(f"  [OTHER-API] {url[:90]}")

    all_products: list[dict] = []
    log(f"[START] Scraper started - keyword='{keyword}', max_pages={max_pages}")

    async with async_playwright() as pw:
        log("[BROWSER] Launching Chromium (headed mode - a browser window will open)...")
        browser, context = await _make_context(pw, log)

        page = await context.new_page()
        # Apply playwright-stealth — patches 30+ detection vectors
        await _stealth.apply_stealth_async(page)
        page.on("response", _on_response)
        log("[OK] Browser ready with playwright-stealth applied")

        kw_encoded = urllib.parse.quote_plus(keyword)

        for page_num in range(max_pages):
            offset = page_num * 60
            url = f"{SHOPEE_BASE}/search?keyword={kw_encoded}&page={page_num}&newest={offset}"

            log(f"\n--- Halaman {page_num + 1}/{max_pages} ---")
            log(f"[PAGE] Navigating to: {url}")

            resp_info = None
            try:
                async with page.expect_response(
                    lambda r: SEARCH_API_PATTERN in r.url and r.status == 200,
                    timeout=25000,
                ) as ri:
                    nav = await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                    log(f"[OK] Page loaded - HTTP {nav.status if nav else 'N/A'}")
                    await _scroll_page(page)
                resp_info = ri
            except Exception as e:
                log(f"[ERR] {e}")

            if resp_info is None:
                log("[WARN] No API response captured for this page")
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

        # Save updated cookies back to session file
        try:
            cookies = await context.cookies()
            with open(SESSION_FILE, "w", encoding="utf-8") as f:
                json.dump({"cookies": cookies}, f, ensure_ascii=False, indent=2)
            log(f"[SESSION] Cookies saved to {SESSION_FILE}")
        except Exception:
            pass

        log(f"\n[DONE] Scraping finished - total {len(all_products)} products")
        await browser.close()
        log("[OK] Browser closed")

    return all_products
