import csv
import os
import sys

import psycopg2

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "user": "postgres",
    "password": "4538",
    "dbname": "postgres",
}

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(SCRIPT_DIR, "products.csv")

REQUIRED_COLUMNS = [
    "product_id",
    "merchant_id",
    "product_name",
    "category",
    "subcategory",
    "description",
    "price_inr",
    "stock_quantity",
    "rating",
    "is_active",
    "compatible_product_ids",
    "frequently_bought_with_ids",
    "tags",
]

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS products (
    product_id INTEGER PRIMARY KEY,
    merchant_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    description TEXT,
    price_inr NUMERIC(12,2) NOT NULL,
    stock_quantity INTEGER NOT NULL,
    rating NUMERIC(2,1),
    is_active BOOLEAN NOT NULL,
    compatible_product_ids TEXT,
    frequently_bought_with_ids TEXT,
    tags TEXT
);
"""

UPSERT_SQL = """
INSERT INTO products (
    product_id,
    merchant_id,
    product_name,
    category,
    subcategory,
    description,
    price_inr,
    stock_quantity,
    rating,
    is_active,
    compatible_product_ids,
    frequently_bought_with_ids,
    tags
) VALUES (
    %(product_id)s,
    %(merchant_id)s,
    %(product_name)s,
    %(category)s,
    %(subcategory)s,
    %(description)s,
    %(price_inr)s,
    %(stock_quantity)s,
    %(rating)s,
    %(is_active)s,
    %(compatible_product_ids)s,
    %(frequently_bought_with_ids)s,
    %(tags)s
)
ON CONFLICT (product_id) DO UPDATE SET
    merchant_id = EXCLUDED.merchant_id,
    product_name = EXCLUDED.product_name,
    category = EXCLUDED.category,
    subcategory = EXCLUDED.subcategory,
    description = EXCLUDED.description,
    price_inr = EXCLUDED.price_inr,
    stock_quantity = EXCLUDED.stock_quantity,
    rating = EXCLUDED.rating,
    is_active = EXCLUDED.is_active,
    compatible_product_ids = EXCLUDED.compatible_product_ids,
    frequently_bought_with_ids = EXCLUDED.frequently_bought_with_ids,
    tags = EXCLUDED.tags;
"""


def to_int_or_none(value):
    value = (value or "").strip()
    if value == "":
        return None
    return int(value)


def to_float_or_none(value):
    value = (value or "").strip()
    if value == "":
        return None
    return float(value)


def to_bool(value):
    value = (value or "").strip().lower()
    if value in ("true", "t", "1", "yes"):
        return True
    if value in ("false", "f", "0", "no"):
        return False
    raise ValueError(f"Cannot convert '{value}' to boolean")


def to_text_or_none(value):
    value = (value or "").strip()
    if value == "":
        return None
    return value


def read_csv_rows(csv_path):
    if not os.path.isfile(csv_path):
        print(f"ERROR: CSV file not found at: {csv_path}")
        sys.exit(1)

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        missing_columns = [
            col for col in REQUIRED_COLUMNS if col not in (reader.fieldnames or [])
        ]
        if missing_columns:
            print("ERROR: The CSV is missing required columns:")
            for col in missing_columns:
                print(f"  - {col}")
            sys.exit(1)

        rows = list(reader)

    return rows


def build_params(row):
    return {
        "product_id": to_int_or_none(row["product_id"]),
        "merchant_id": to_int_or_none(row["merchant_id"]),
        "product_name": row["product_name"].strip(),
        "category": row["category"].strip(),
        "subcategory": to_text_or_none(row["subcategory"]),
        "description": to_text_or_none(row["description"]),
        "price_inr": to_float_or_none(row["price_inr"]),
        "stock_quantity": to_int_or_none(row["stock_quantity"]),
        "rating": to_float_or_none(row["rating"]),
        "is_active": to_bool(row["is_active"]),
        "compatible_product_ids": to_text_or_none(row["compatible_product_ids"]),
        "frequently_bought_with_ids": to_text_or_none(row["frequently_bought_with_ids"]),
        "tags": to_text_or_none(row["tags"]),
    }


def main():
    rows = read_csv_rows(CSV_PATH)

    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        cur.execute(CREATE_TABLE_SQL)

        rows_processed = 0
        for row_number, row in enumerate(rows, start=2):
            try:
                params = build_params(row)
            except (ValueError, KeyError) as conversion_error:
                raise ValueError(
                    f"Row {row_number} in CSV has invalid data: {conversion_error}"
                )

            cur.execute(UPSERT_SQL, params)
            rows_processed += 1

        conn.commit()
        cur.close()
        print(f"Success: {rows_processed} rows inserted/updated in 'products' table.")

    except Exception as error:
        if conn is not None:
            conn.rollback()
        print(f"ERROR: {error}")
        print("Transaction rolled back. No changes were saved.")
        sys.exit(1)

    finally:
        if conn is not None:
            conn.close()


if __name__ == "__main__":
    main()