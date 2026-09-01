# Agentic Commerce — AI Merchant Growth Agent

> ⚠️ **CRITICAL NOTICE: THIS PROJECT USES RAZORPAY TEST MODE ONLY.**  
> No real money is moved, no real credit/debit card numbers are stored, and production keys must never be used.

---

## 🌟 Overview

**Agentic Commerce** is a full-stack platform where autonomous **AI Buyers** negotiate and purchase from **Merchant AI Growth Agents**. 

The system enforces a strict **Security Trust Boundary**:
- **AI Agent:** Decides *"What should I do next?"* (catalog discovery, data-backed upsell recommendations).
- **Deterministic Policy Engine:** Authoritatively decides *"Is this transaction allowed?"* (hard budget/limit guardrails).
- **Payment Service:** Executes payments strictly in **Razorpay Test Mode** for server-verified, policy-approved orders.
- **Frontend / Client:** Never trusted for pricing, policy authorization, or payment success. All cryptographic signatures (HMAC SHA-256) and order totals are verified server-side.

---

## 🏛️ System Architecture

```
                          AI BUYER
                             │
                             ▼
                    MERCHANT AI AGENT
                             │
                             ▼
                   LANGGRAPH ORCHESTRATOR
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
      Catalog Tool                       Growth Tool
      (Search DB)                   (Recommendations)
            │                                 │
            └────────────────┬────────────────┘
                             │
                             ▼
                      Buyer Approval
                             │
                             ▼
                        Policy Tool
                             │
              ┌──────────────┴──────────────┐
              │      POLICY GATE            │
              │      allowed == true?       │
              └──────────────┬──────────────┘
                             │
             ┌───────────────┴───────────────┐
             │ YES                           │ NO (BLOCKED)
             ▼                               ▼
       Payment Tool                       BLOCK
             │                               │
             ▼                               ▼
     Razorpay Test API              Payment Tool NOT called
     (Server Calculated)            Razorpay NOT called
             │                               │
             ▼                               ▼
     Razorpay Checkout                   Audit Log
     (Frontend Popup)                        │
             │                               ▼
             ▼                      Blocked explanation
    Payment Verification                  to buyer
     (HMAC Signature)
             │
             ▼
     Transaction Update
    (Captured / Paid)
             │
             ▼
         Audit Log
             │
             ▼
    Response to AI Buyer
```

---

## 🔒 Security Principles

1. **Policy Gate Authorization**: Razorpay is **never** invoked unless the Policy Engine returns `allowed == true`.
2. **Server-Side Truth**: Product prices, stock, subtotal, and tax are calculated strictly from the PostgreSQL catalog. Amounts sent from client requests or LLM hallucinations are completely ignored.
3. **Cryptographic Signature Verification**: Every payment callback is verified using HMAC SHA-256 and the `RAZORPAY_KEY_SECRET`. Transactions are marked `captured` only after successful backend verification.
4. **Duplicate Payment & Idempotency Protection**: Orders already in `captured` status reject duplicate payments. Active pending orders safely reuse test orders without duplicate charges.
5. **Fail-Closed Mechanics**: If the Policy Service or database is unreachable, the system strictly fails closed and refuses payment.
6. **No Secret Exposure**: `RAZORPAY_KEY_SECRET` is never returned in API payloads or exposed to the client.

---

## ⚙️ Environment Variables

Add the following to `backend/.env` (and see `backend/.env.example`):

```bash
# Database Connection (PostgreSQL)
DATABASE_URL=postgresql+psycopg://postgres:4538@localhost:5432/agentic_commerce

# CORS Allowed Origins
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Razorpay Test Mode Credentials
RAZORPAY_KEY_ID=rzp_test_TWfbZX7sZugjLd
RAZORPAY_KEY_SECRET=dDKMrN7rmFmhUu5gHyPR26J1
RAZORPAY_WEBHOOK_SECRET=sample_webhook_secret_test
RAZORPAY_ENV=test

BACKEND_URL=http://localhost:8000
```

Add to `frontend/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### How to Obtain Razorpay Test Mode Credentials
1. Sign up / Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Switch the environment toggle in the header to **Test Mode**.
3. Navigate to **Settings > API Keys > Generate Key**.
4. Copy `Key Id` and `Key Secret` into your `.env` file under `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+ (with `uv` package manager)
- Node.js 18+ & npm
- PostgreSQL running locally on port 5432

### 2. Seed Database
```powershell
uv run python backend/app/seed.py
```

### 3. Start Backend (FastAPI on Port 8000)
```powershell
uv run uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Start Agent Service (LangGraph on Port 8001)
```powershell
uv run uvicorn agent.app.main:app --host 0.0.0.0 --port 8001 --reload
```

### 5. Start Frontend (Next.js on Port 3000)
```powershell
cd frontend
npm run dev
```

---

## 🧪 Running Automated Tests

Run backend payment and policy tests:
```powershell
uv run pytest backend/tests/test_payments.py -v
```

Run all backend tests:
```powershell
uv run pytest backend/tests/ -v
```

Run agent tool and workflow tests:
```powershell
uv run pytest agent/tests/ -v
```

---

## 🎬 Demo Scenarios

### Demo Scenario 1 — Successful Policy-Approved Checkout
1. AI Buyer requests a laptop under ₹70,000.
2. Agent finds **NovaBook Pro 14** (₹65,000).
3. Growth Engine recommends **AeroMouse X1** (₹1,500).
4. Buyer accepts recommendation -> Total = ₹66,500.
5. Deterministic Policy Engine verifies ₹66,500 ≤ ₹70,000 -> **ALLOWED**.
6. Razorpay Test Order is generated -> Checkout modal opens -> Test payment succeeds -> Signature verified -> Transaction **Captured**.

### Demo Scenario 2 — Deterministic Policy Gate Blocked
1. Basket contains **NovaBook Pro 14** (₹65,000) + **UltraView 4K Monitor** (₹12,000) -> Total = ₹77,000.
2. Policy Engine evaluates ₹77,000 > ₹70,000 -> **BLOCKED**.
3. **Razorpay is NOT called**. Payment tool refuses execution.
4. Transaction recorded as **Blocked**, UI shows **Not attempted**, Audit trail logs `policy_blocked`.

### Demo Scenario 3 — Payment Failure & Graceful Recovery
1. Policy allows transaction.
2. User dismisses Razorpay modal or payment fails.
3. Backend records status as **Failed** and logs `payment_failed`.
4. No uncontrolled retry loops; user can retry deliberately.

### Demo Scenario 4 — Policy Fail-Closed Mechanics
1. Policy service simulated outage.
2. Agent and backend strictly block money movement and return an informative message.

---

## 📡 API Reference

### Payment Endpoints
- `POST /api/payments/create`: Creates Razorpay test order for internal `order_id` (amount strictly calculated server-side).
- `POST /api/payments/verify`: Cryptographically verifies Razorpay signature (`razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`).
- `POST /api/payments/fail`: Records client dismissal or failure event safely.
- `POST /api/payments/webhook`: Handles verified Razorpay webhooks (`payment.captured`, `payment.failed`).

### Commerce & Core Endpoints
- `GET /api/products`: Search and filter catalog products.
- `GET /api/products/{id}/recommendations`: Data-backed upsell recommendations.
- `POST /api/policies/check`: Deterministic policy evaluation.
- `POST /api/orders`: Order creation and policy verification.
- `GET /api/orders`: List recent transactions and order records.
- `GET /api/audit`: Audit trail ledger for all agent and financial actions.

---

## 📜 License
MIT License. Built for the Razorpay Ideathon / Hackathon.
