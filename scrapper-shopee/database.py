import sqlite3
import os
import pandas as pd
from typing import Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "shopee.db")


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS products (
            item_id       INTEGER PRIMARY KEY,
            shop_id       INTEGER,
            name          TEXT,
            price_min     REAL,
            price_max     REAL,
            rating_star   REAL,
            sold          INTEGER,
            liked_count   INTEGER,
            shop_location TEXT,
            image_url     TEXT,
            product_url   TEXT,
            keyword       TEXT,
            scraped_at    TEXT
        )
    """)
    conn.commit()
    conn.close()


def insert_products(products: list[dict]) -> dict:
    if not products:
        return {"total": 0, "new": 0, "duplicates": 0}

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    new_count = 0
    for p in products:
        cursor.execute("""
            INSERT OR IGNORE INTO products
                (item_id, shop_id, name, price_min, price_max, rating_star,
                 sold, liked_count, shop_location, image_url, product_url,
                 keyword, scraped_at)
            VALUES
                (:item_id, :shop_id, :name, :price_min, :price_max, :rating_star,
                 :sold, :liked_count, :shop_location, :image_url, :product_url,
                 :keyword, :scraped_at)
        """, p)
        if cursor.rowcount > 0:
            new_count += 1

    conn.commit()
    conn.close()

    total = len(products)
    return {"total": total, "new": new_count, "duplicates": total - new_count}


def get_products(
    keyword: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rating: Optional[float] = None,
    min_sold: Optional[int] = None,
    location: Optional[str] = None,
) -> pd.DataFrame:
    conn = sqlite3.connect(DB_PATH)

    clauses = []
    params = []

    if keyword:
        clauses.append("keyword = ?")
        params.append(keyword)
    if min_price is not None:
        clauses.append("price_min >= ?")
        params.append(min_price)
    if max_price is not None:
        clauses.append("price_max <= ?")
        params.append(max_price)
    if min_rating is not None:
        clauses.append("rating_star >= ?")
        params.append(min_rating)
    if min_sold is not None:
        clauses.append("sold >= ?")
        params.append(min_sold)
    if location:
        clauses.append("LOWER(shop_location) LIKE ?")
        params.append(f"%{location.lower()}%")

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    query = f"SELECT * FROM products {where} ORDER BY sold DESC"

    df = pd.read_sql_query(query, conn, params=params)
    conn.close()
    return df
