import asyncio
import csv
import os
import sys
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Add parent dir to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.core.config import settings
from app.models.base import Base
from app.models.merchant import Merchant
from app.models.product import Product
from app.models.product_relationship import ProductRelationship
from app.models.policy import Policy

CSV_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "products.csv")

async def seed_database():
    print(f"Connecting to database: {settings.DATABASE_URL}")
    
    db_url = settings.DATABASE_URL
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

    engine = create_async_engine(db_url, echo=False)

    async with engine.begin() as conn:
        print("Ensuring tables exist...")
        await conn.run_sync(Base.metadata.create_all)

    AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as session:
        # 1. Seed Merchant 1
        res = await session.execute(select(Merchant).where(Merchant.id == 1))
        merchant = res.scalars().first()
        if not merchant:
            merchant = Merchant(id=1, name="Nova Tech Store", email="merchant@novatech.com")
            session.add(merchant)
            await session.commit()
            print("Created default Merchant (id=1, name='Nova Tech Store')")
        else:
            print("Default Merchant (id=1) already exists.")

        # 2. Seed Default Policy for Merchant 1
        res = await session.execute(select(Policy).where(Policy.merchant_id == 1))
        policy = res.scalars().first()
        if not policy:
            policy = Policy(
                merchant_id=1,
                max_transaction_inr=70000.0,
                approval_required_above_inr=50000.0,
                is_active=True
            )
            session.add(policy)
            await session.commit()
            print("Created default Policy for Merchant 1 (max_transaction_inr=70000.0)")
        else:
            print("Default Policy for Merchant 1 already exists.")

        # 3. Read CSV and Upsert Products & Relationships
        if not os.path.exists(CSV_PATH):
            print(f"CSV file not found at {CSV_PATH}, skipping product seeding.")
            return

        with open(CSV_PATH, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        print(f"Loaded {len(rows)} products from CSV.")

        # Upsert Products
        relationships_to_create = []

        for row in rows:
            product_id = int(row["product_id"])
            merchant_id = int(row["merchant_id"])
            
            res = await session.execute(select(Product).where(Product.product_id == product_id))
            prod = res.scalars().first()

            if not prod:
                prod = Product(
                    product_id=product_id,
                    merchant_id=merchant_id,
                    product_name=row["product_name"].strip(),
                    category=row["category"].strip(),
                    subcategory=row["subcategory"].strip() if row.get("subcategory") else None,
                    description=row["description"].strip() if row.get("description") else None,
                    price_inr=float(row["price_inr"]),
                    stock_quantity=int(row["stock_quantity"]),
                    rating=float(row["rating"]) if row.get("rating") else None,
                    is_active=row["is_active"].strip().lower() in ("true", "1", "t", "yes"),
                    tags=row["tags"].strip() if row.get("tags") else None,
                )
                session.add(prod)
            else:
                prod.merchant_id = merchant_id
                prod.product_name = row["product_name"].strip()
                prod.category = row["category"].strip()
                prod.subcategory = row["subcategory"].strip() if row.get("subcategory") else None
                prod.description = row["description"].strip() if row.get("description") else None
                prod.price_inr = float(row["price_inr"])
                prod.stock_quantity = int(row["stock_quantity"])
                prod.rating = float(row["rating"]) if row.get("rating") else None
                prod.is_active = row["is_active"].strip().lower() in ("true", "1", "t", "yes")
                prod.tags = row["tags"].strip() if row.get("tags") else None

            # Collect relationships
            compatible_ids = row.get("compatible_product_ids", "").strip()
            if compatible_ids:
                for target_id in compatible_ids.split(","):
                    target_id = target_id.strip()
                    if target_id.isdigit():
                        relationships_to_create.append({
                            "source_product_id": product_id,
                            "target_product_id": int(target_id),
                            "relationship_type": "compatible"
                        })

            freq_ids = row.get("frequently_bought_with_ids", "").strip()
            if freq_ids:
                for target_id in freq_ids.split(","):
                    target_id = target_id.strip()
                    if target_id.isdigit():
                        relationships_to_create.append({
                            "source_product_id": product_id,
                            "target_product_id": int(target_id),
                            "relationship_type": "frequently_bought_with"
                        })

        await session.commit()
        print("Products imported/updated in DB successfully.")

        # Clear existing relationships and recreate from normalized list
        await session.execute(delete(ProductRelationship))
        await session.commit()

        # Query all valid product IDs in DB
        res = await session.execute(select(Product.product_id))
        valid_product_ids = set(res.scalars().all())

        rel_objs = []
        created_pairs = set()

        for rel in relationships_to_create:
            s_id = rel["source_product_id"]
            t_id = rel["target_product_id"]
            r_type = rel["relationship_type"]

            if s_id in valid_product_ids and t_id in valid_product_ids:
                pair_key = (s_id, t_id, r_type)
                if pair_key not in created_pairs:
                    created_pairs.add(pair_key)
                    rel_objs.append(
                        ProductRelationship(
                            source_product_id=s_id,
                            target_product_id=t_id,
                            relationship_type=r_type
                        )
                    )

        session.add_all(rel_objs)
        await session.commit()
        print(f"Populated {len(rel_objs)} normalized product relationships in 'product_relationships' table.")

    await engine.dispose()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_database())
