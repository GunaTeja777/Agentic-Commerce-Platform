# Agentic Commerce - Backend Foundation (Phase 2)

Phase 2 FastAPI backend foundation for **Agentic Commerce — AI Merchant Growth Agent**. It connects directly to PostgreSQL (`agentic_commerce`) and exposes clean, deterministic APIs that will serve as LangGraph tools in Phase 3.

---

## 🏛️ Core Architectural Principle

> **"THE AI AGENT WILL DECIDE WHAT TO DO NEXT.  
> THE POLICY ENGINE WILL DETERMINE WHETHER MONEY IS ALLOWED TO MOVE."**

- **Deterministic Policy Enforcement:** Transaction limits (`max_transaction_inr`) are enforced strictly by the Python backend policy engine. The LLM cannot override transaction rules or spending caps.
- **Server-Side Price Calculation:** Order subtotal and total prices are calculated exclusively from PostgreSQL product records. Frontend/client-supplied prices are never trusted.
- **Separation of Concerns:** Payment logic is isolated (stubbed for Razorpay integration in a future phase).

---

## 📁 Project Structure

```text
backend/
├── app/
│   ├── main.py                    # FastAPI Application Entrypoint & OpenAPI config
│   ├── seed.py                    # Database Seeder (Merchants, Policies, Products, Relationships)
│   ├── core/
│   │   ├── config.py              # Application settings (Pydantic BaseSettings)
│   │   └── database.py            # Async SQLAlchemy engine & get_db dependency
│   ├── models/                    # SQLAlchemy 2.x ORM Models
│   │   ├── base.py
│   │   ├── merchant.py
│   │   ├── product.py
│   │   ├── product_relationship.py # Normalized relational graph (compatible, frequently_bought_with)
│   │   ├── policy.py
│   │   ├── order.py
│   │   ├── transaction.py
│   │   └── audit_log.py
│   ├── schemas/                   # Pydantic v2 Schemas
│   │   ├── product.py
│   │   ├── recommendation.py
│   │   ├── policy.py
│   │   ├── order.py
│   │   └── audit.py
│   ├── services/                  # Business Logic Layer
│   │   ├── catalog_service.py     # Product search & filtering
│   │   ├── growth_service.py      # Data-driven recommendation tool
│   │   ├── policy_service.py      # Deterministic policy checking engine
│   │   ├── order_service.py       # Server-side order calculation & execution
│   │   └── audit_service.py       # Structured audit log tracking
│   └── api/
│       └── routes/                # FastAPI Routers
│           ├── health.py          # GET /health
│           ├── products.py        # Product endpoints
│           ├── growth.py          # GET /api/growth/recommendations/{product_id}
│           ├── policies.py        # POST /api/policies/check
│           ├── orders.py          # POST /api/orders
│           └── audit.py           # GET /api/audit
├── alembic/                       # Alembic Database Migrations
├── tests/                         # Pytest test suite (100% pass)
│   ├── conftest.py
│   └── test_backend.py
├── .env.example
├── .env
├── pytest.ini
├── products.csv                   # Source product dataset
├── requirements.txt
└── README.md
```

---

## 🚀 Setup & Execution Instructions

### 1. Virtual Environment Setup

Open terminal in the `backend/` directory:

```bash
# Create Python virtual environment
python -m venv venv

# Activate on Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# Activate on macOS/Linux:
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Database Connection

Create or update `.env` (refer to `.env.example`):

```ini
DATABASE_URL=postgresql+psycopg://postgres:4538@localhost:5432/agentic_commerce
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
ENVIRONMENT=development
```

> Make sure your local PostgreSQL service is running and the database `agentic_commerce` exists.

### 4. Database Migrations & Seeding

Run database migrations and seed default records (Merchant ID `1`, Policy max limit ₹70,000, 99 products, and 404 normalized product relationships):

```bash
# Run Alembic migrations
python -m alembic upgrade head

# Run Database Seeder
python app/seed.py
```

---

## 💻 Starting the FastAPI Server

Start the Uvicorn development server:

```bash
uvicorn app.main:app --reload
```

The API will be available at:
- **API Base URL:** `http://localhost:8000`
- **Swagger Interactive Docs:** `http://localhost:8000/docs`
- **ReDoc Documentation:** `http://localhost:8000/redoc`

---

## 🧪 Running Automated Tests

Run the full pytest suite to verify endpoints, policy enforcement, order calculation, and audit logging:

```bash
python -m pytest
```

Expected Output: `11 passed`

---

## 🔌 Exposed API Endpoints

| Tag | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Health** | `GET` | `/health` | DB connection health check |
| **Products** | `GET` | `/api/products` | Search & list products (`search`, `category`, `max_price`, `in_stock`, `limit`, `offset`) |
| **Products** | `GET` | `/api/products/{id}` | Get product details with compatible & frequently bought together items |
| **Products** | `GET` | `/api/products/{id}/recommendations` | Get product recommendations |
| **Growth** | `GET` | `/api/growth/recommendations/{id}` | Growth Service tool endpoint for data-driven upsell recommendations |
| **Policies** | `POST` | `/api/policies/check` | Deterministically check transaction policy against merchant limits |
| **Orders** | `POST` | `/api/orders` | Create order, calculate server-side price, run policy pipeline, create transaction |
| **Audit** | `GET` | `/api/audit` | Filter and view structured audit trail (`merchant_id`, `action`, `status`, `entity_type`) |
