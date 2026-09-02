# Agentic Commerce — AI Merchant Growth Agent & A2A Platform

> ⚠️ **CRITICAL NOTICE: THIS PROJECT USES RAZORPAY TEST MODE ONLY.**  
> No real money is moved, no real credit/debit card numbers are stored, and production keys must never be used.

---

## 🌟 Overview

**Agentic Commerce** is an autonomous **Agent-to-Agent (A2A)** commerce platform where a **Buyer-Side AI Agent** negotiates with a **Merchant-Side AI Growth Agent** backed by deterministic financial policy guardrails and **Razorpay Test Mode** checkouts.

### Core Architectural Roles:
1. **Buyer-Side Agent (Hugging Face Llama 3.2 3B)**: Analyzes natural-language buyer queries and curates a standardized, structured A2A commerce intent contract (`category`, `product_type`, `budget_inr`, `preferences`).
2. **Merchant-Side Agent (LangGraph + Google Gemini 2.5 Flash)**: Receives the A2A intent contract, queries the catalog and co-purchase tools, evaluates candidate products from PostgreSQL, reasons about data-backed upsells, and manages buyer consent.
3. **PostgreSQL Database (Source of Truth)**: Authoritatively stores products, inventory stock, relationships, orders, and audit logs. Zero LLM hallucinations.
4. **Deterministic Policy Engine (Fail-Closed Guardrail)**: Evaluates strict merchant transaction limits (`price_inr <= max_limit`) before any payment authorization.
5. **Razorpay Payment Gateway (Test Mode)**: Cryptographically verifies HMAC SHA-256 signatures server-side before capturing transactions.

---

## 🏛️ Agent-to-Agent (A2A) Architecture Flow

```
                                  BUYER
                                    │
                                    ▼
                     1. BUYER-SIDE AI AGENT (Hugging Face)
                       meta-llama/Llama-3.2-3B-Instruct
                       Curates natural language into A2A JSON
                                    │
                                    ▼
                     2. STRUCTURED A2A INTENT CONTRACT
                       { category, product_type, budget_inr }
                                    │
                                    ▼
                    3. MERCHANT AI AGENT (LangGraph + Gemini)
                              gemini-2.5-flash
                       Receives already-understood A2A contract
                                    │
                     ┌──────────────┴──────────────┐
                     ▼                             ▼
             Catalog Tool                   Growth Tool
         (Safe, Parameterized)           (Co-Purchase Graph)
                     │                             │
                     ▼                             ▼
            PostgreSQL Database           PostgreSQL DB Graph
          (Real Inventory & Price)      (Compatible Add-ons)
                     │                             │
                     └──────────────┬──────────────┘
                                    │
                                    ▼
                     4. GEMINI CANDIDATE EVALUATION
                       Ranks real database rows (Zero Hallucination)
                                    │
                                    ▼
                     5. PERSONALIZED BUYER PROPOSAL
                       "Since you're buying [X], this [Y] is a useful addition."
                                    │
                                    ▼
                         Buyer Consent / Decision
                                    │
                                    ▼
                     6. DETERMINISTIC POLICY GATE
                         Is Total <= Merchant Limit?
                                    │
                    ┌───────────────┴───────────────┐
                    │ YES                           │ NO (BLOCKED)
                    ▼                               ▼
            Payment Tool                       BLOCK
                    │                               │
                    ▼                               ▼
           Razorpay Test Order            Payment Tool NOT called
           (Server-Calculated)            Razorpay NOT called
                    │                               │
                    ▼                               ▼
           Razorpay Checkout                  Audit Log
           (Frontend Modal)                         │
                    │                               ▼
                    ▼                      Blocked explanation
           Payment Verification                  to buyer
             (HMAC SHA-256)
                    │
                    ▼
           Transaction Update
            (Captured / Paid)
                    │
                    ▼
               Audit Ledger
                    │
                    ▼
           Order Success to Buyer
```

---

## 🔒 Security & Reliability Principles

1. **Strict Separation of Concerns**: The Buyer Agent curates intent; the Merchant Agent reasons over merchant catalog tools.
2. **PostgreSQL as Single Source of Truth**: Neither agent can invent products, modify inventory levels, or override prices.
3. **Policy Gate Authorization**: Razorpay test orders are **never** created unless the Policy Engine returns `allowed == true`.
4. **Server-Side Price Calculation**: Order totals and taxes are calculated exclusively in backend Python code. Client-supplied amounts are discarded.
5. **HMAC SHA-256 Cryptographic Verification**: Every Razorpay callback is verified server-side against `RAZORPAY_KEY_SECRET`.
6. **Fail-Closed Security**: If the database or policy engine encounters an error, the transaction is automatically refused.
7. **Secret Isolation**: `RAZORPAY_KEY_SECRET` and API tokens are never sent to the client browser.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
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

### Agent Service (`agent/.env`)
```bash
# FastAPI Backend URL
BACKEND_URL=http://localhost:8000

# Main LangGraph Agent LLM (Gemini 2.5 Flash Orchestrator)
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
LLM_MODEL=gemini-2.5-flash

# Buyer Prompt Curation (Hugging Face Free Inference API)
CURATION_PROVIDER=huggingface
HF_TOKEN=your_huggingface_token_here
HUGGINGFACE_API_KEY=your_huggingface_token_here
CURATION_MODEL=meta-llama/Llama-3.2-3B-Instruct

# Merchant Configuration
DEFAULT_MERCHANT_ID=1
```

### Frontend (`frontend/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+ (with virtual environment or `uv`)
- Node.js 18+ & npm
- PostgreSQL running locally on port 5432

### 2. Seed Database
```powershell
.venv\Scripts\python backend/app/seed.py
```

### 3. Start Backend (FastAPI on Port 8000)
```powershell
$env:PYTHONPATH="backend"
.venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Start Agent Service (LangGraph on Port 8001)
```powershell
$env:PYTHONPATH="agent"
.venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### 5. Start Frontend (Next.js 15 on Port 3000)
```powershell
npm --prefix frontend run dev
```

---

## 🧪 Automated Test Suite (59/59 Tests Passing)

### Run Backend Tests (39 Tests)
```powershell
$env:PYTHONPATH="backend"
.venv\Scripts\pytest -v backend/tests
```
*Covers: Product search, relationship graphs, order creation, price tampering prevention, policy enforcement, signature verification, duplicate payment prevention, and fail-closed mechanics.*

### Run Agent Tests (20 Tests)
```powershell
$env:PYTHONPATH="agent"
.venv\Scripts\pytest -v agent/tests
```
*Covers: Curation endpoint, catalog tools, growth recommendations, LangGraph multi-step state transitions, buyer consent handling, and non-existent product handling.*

---

## 🎬 Live Interactive Demo Scenarios

Open `http://localhost:3000/demo` in your browser:

### 1. Dynamic Natural Language Query Curation
- Type `"I want a wireless charging pad under ₹2,000"` or `"I need a mic for streaming under ₹15,000"`.
- The **Buyer Agent (Hugging Face Llama 3.2)** dynamically extracts category, budget, and intent into the live **A2A Commerce Payload**.

### 2. Intelligent Catalog Matching (Gemini 2.5 Flash)
- LangGraph executes the safe `catalog_search` tool against PostgreSQL.
- **Gemini 2.5 Flash** evaluates candidate database records and selects the exact match (e.g., `WirelessCharge Pad Mini` @ ₹1,100).

### 3. Data-Backed Growth Recommendation (Upsell)
- The growth tool queries the PostgreSQL relationship graph and formats the personalized pitch:
  > *"Since you're buying WirelessCharge Pad Mini, PulsePhone S12 Plus is designed to pair with it."*
- The buyer can click **`[Add to Basket]`** or **`[Skip]`**.

### 4. Deterministic Policy Gate & Razorpay Checkout
- The Policy Engine validates that the total basket amount respects the merchant transaction limit (₹70,000).
- Razorpay Test Mode checkout opens $\rightarrow$ Test payment succeeds $\rightarrow$ Server cryptographically verifies the HMAC signature $\rightarrow$ Status marked **Captured** in the immutable audit trail.

---

## 📡 Key API Endpoints

### Agent Service (`http://localhost:8001`)
- `POST /agent/curate`: Hugging Face intent curation endpoint (Buyer Agent).
- `POST /agent/chat`: LangGraph state machine orchestrator (Merchant Agent).
- `GET /agent/health`: Agent health and LLM provider status.

### Backend Core Service (`http://localhost:8000`)
- `GET /api/products`: Filter and search catalog items with multi-token keyword matching.
- `GET /api/products/{id}/recommendations`: Co-purchase graph relationship lookup.
- `POST /api/policies/check`: Authoritative policy evaluation gate.
- `POST /api/orders`: Server-side price calculation and order creation.
- `POST /api/payments/create`: Razorpay test order creation.
- `POST /api/payments/verify`: HMAC SHA-256 payment signature verification.
- `GET /api/audit`: Immutable compliance and financial audit log ledger.

---

## 📜 License
MIT License. Built for the Razorpay Ideathon / Hackathon.
