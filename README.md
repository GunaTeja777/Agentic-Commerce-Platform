# Agentic Commerce — AI Merchant Growth Agent & A2A Platform (MCP Architecture)

> ⚠️ **CRITICAL NOTICE: THIS PROJECT USES RAZORPAY TEST MODE ONLY.**  
> No real money is moved, no real credit/debit card numbers are stored, and production keys must never be used.

---

## 🌟 Overview

**Agentic Commerce** is an autonomous **Agent-to-Agent (A2A)** commerce platform built on the **Model Context Protocol (MCP)**. It enables a **Buyer-Side AI Agent** to discover products, negotiate, and execute purchases with a **Merchant-Side AI Growth Agent** backed by deterministic financial policy guardrails, real-time inventory management, and **Razorpay Test Mode** checkouts.

### Core Architectural Layers:

1. **Model Context Protocol (MCP) Server (`ecommerce-mcp/`)**:
   - Built with `@modelcontextprotocol/sdk/server/mcp.js`.
   - Exposes 8 standardized MCP commerce tools (`search_products`, `get_product`, `check_inventory`, `create_order`, etc.) over Streamable HTTP and REST endpoints.
   - Authoritative PostgreSQL Database via **Prisma ORM** ensuring zero LLM hallucination of products or prices.
   - Live deployed on Railway: [https://ai-growth-agentic-commerce-production.up.railway.app](https://ai-growth-agentic-commerce-production.up.railway.app)

2. **MCP Client & AI Growth Agent (`frontend/src/app/api/agent/`)**:
   - Acts as the intelligent MCP Client connecting to the live store.
   - **Google Gemini 2.5 Flash**: Evaluates candidate catalog items retrieved from MCP tools and reasons over data-backed upsell recommendations.
   - **Hugging Face (Meta Llama 3.2 3B)**: Translates natural language buyer requests into structured A2A commerce intent contracts.

3. **Autonomous Settlement & Razorpay Test Mode**:
   - Orders are created server-side with inventory reservations.
   - Razorpay Test Mode order creation and HMAC SHA-256 verification.
   - Autonomous agent checkout & settlement with audit trail logging.

4. **Deterministic Policy Engine (Fail-Closed Guardrail)**:
   - Enforces strict merchant transaction limits (`price_inr <= max_limit`) before any payment authorization can proceed.

---

## 🏛️ Dual-Agent A2A + MCP Architecture Flow

```
                                 BUYER / USER
                                      │
                                      ▼
                      1. BUYER-SIDE AI AGENT (Hugging Face)
                        meta-llama/Llama-3.2-3B-Instruct
                      Curates natural language into A2A JSON
                                      │
                                      ▼
                      2. STRUCTURED A2A INTENT CONTRACT
                       { category, budget_inr, preferences }
                                      │
                                      ▼
                      3. MERCHANT AI AGENT (MCP Client)
                      Google Gemini 2.5 Flash Orchestrator
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
     MCP Tool: search_products                       MCP Tool: get_product
  (Keyword match & category filter)               (Full specs & real inventory)
              │                                               │
              └───────────────────────┬───────────────────────┘
                                      │ (JSON-RPC / REST Tools)
                                      ▼
             4. STANDALONE MCP SERVER & LIVE RAILWAY STORE
                 ecommerce-mcp/ (Node.js + Prisma + Postgres)
             https://ai-growth-agentic-commerce-production.up.railway.app
                                      │
                                      ▼
                      5. GEMINI CANDIDATE EVALUATION
                     Ranks real records (Zero Hallucination)
                                      │
                                      ▼
                      6. DATA-BACKED UPSELL PROPOSAL
             "Since you're buying [X], this [Y] is compatible."
                                      │
                                      ▼
                           Buyer Consent / Decision
                                      │
                                      ▼
                      7. DETERMINISTIC POLICY GATE
                       Is Total <= Merchant Limit?
                                      │
                     ┌────────────────┴────────────────┐
                     │ YES                             │ NO (BLOCKED)
                     ▼                                 ▼
           MCP: create_order                     BLOCK TRANSACTION
       (Razorpay Test Order Created)             Payment NOT called
                     │                           Razorpay NOT contacted
                     ▼                           Audit Log Refusal Entry
          Razorpay Checkout Modal                      │
                     │                                 ▼
                     ▼                       Blocked reason returned
            Payment Verification                    to buyer
           (HMAC SHA-256 Signature)
                     │
                     ▼
           MCP: /api/orders/settle
         Order Marked PAID in Postgres
                     │
                     ▼
           Order Success & Audit Ledger
```

---

## 🛠️ The 8 Model Context Protocol (MCP) Tools

The standalone MCP Server (`ecommerce-mcp/mcp-server/server.ts`) exposes 8 tools following the Model Context Protocol specification:

| Tool | Parameters | Description |
| :--- | :--- | :--- |
| `search_products` | `query: string` | Search store catalog by keyword across title and description. |
| `get_product` | `product_id: string` | Fetch complete details, pricing, and stock for a specific product ID. |
| `get_products_by_category` | `category: string` | List all catalog items belonging to a category or slug. |
| `check_inventory` | `product_id: string` | Real-time available stock verification prior to order placement. |
| `create_order` | `customer_email`, `items` | Reserves inventory and creates an authoritative order + Razorpay Test Order. |
| `get_order_status` | `order_id: string` | Inspect order fulfillment status (`PENDING`, `PAID`, `CANCELLED`). |
| `cancel_order` | `order_id: string` | Cancels an order and releases reserved inventory back to the catalog. |
| `get_customer_orders` | `customer_email: string` | Retrieve complete order history for a given customer. |

---

## 🔒 Security & Reliability Principles

1. **Strict Separation of Concerns**: Buyer Agent curates intent; Merchant Agent executes MCP tools; Policy Engine governs authorization.
2. **PostgreSQL as Single Source of Truth**: Neither agent can invent products, modify inventory levels, or override prices.
3. **Policy Gate Authorization**: Payment orders are **never** created unless the Policy Engine returns `allowed == true`.
4. **Server-Side Price Calculation**: Order totals and taxes are calculated exclusively on the server in paise (`amount_inr * 100`). Client-supplied amounts are discarded.
5. **HMAC SHA-256 Cryptographic Verification**: Every Razorpay callback is cryptographically verified server-side against `RAZORPAY_KEY_SECRET`.
6. **Fail-Closed Security**: If the database or policy engine encounters an error or network drop, the transaction automatically halts and fails closed.
7. **Secret Isolation**: `RAZORPAY_KEY_SECRET` and LLM API keys are isolated on the server and never sent to client browsers.

---

## 📁 Repository Structure

```
AI-Growth-Agentic-Commerce/
├── ecommerce-mcp/      # Live MCP Server + Next.js Storefront (Prisma + Postgres + Razorpay)
│   ├── mcp-server/     # Standalone MCP Server implementation (server.ts)
│   ├── prisma/         # PostgreSQL schema (schema.prisma) & migrations
│   ├── app/            # Storefront API routes (/api/products, /api/orders, webhooks)
│   └── lib/            # Shared database, product catalog, and order managers
├── frontend/           # Next.js 15 App Router Frontend & MCP Client Dashboard
│   ├── src/app/        # Overview, Demo, Failure Scenarios, Catalog, Policy, Transactions
│   ├── src/app/api/    # MCP Client Agent routes (/api/agent/chat, /api/agent/curate, /api/orders)
│   ├── src/context/    # CommerceContext state synchronizer
│   └── src/lib/        # API client services & types
├── backend/            # FastAPI PostgreSQL Python backend engine (alternative / test suite)
│   ├── app/models/     # SQLAlchemy ORM models (Product, Order, Transaction, Policy, Audit)
│   └── app/services/   # PaymentService, PolicyService, CatalogService
├── agent/              # Python LangGraph Merchant Agent service (alternative / test suite)
│   ├── app/graph/      # StateGraph workflow and node definitions
│   └── app/tools/      # Catalog, Growth, Policy, and Payment tools
└── README.md           # Architecture, documentation, and setup guide
```

---

## ⚙️ Environment Variables

### MCP Store (`ecommerce-mcp/.env`)
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/ecommerce_mcp
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
PORT=3000
MCP_PORT=8787
```

### Frontend (`frontend/.env.local`)
```bash
NEXT_PUBLIC_STORE_URL=https://ai-growth-agentic-commerce-production.up.railway.app
STORE_API_URL=https://ai-growth-agentic-commerce-production.up.railway.app
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_AGENT_URL=/api
GEMINI_API_KEY=your_gemini_api_key
```

---

## 🚀 Quickstart Guide

### 1. Running the MCP Client & Frontend Dashboard

The frontend can be run locally and is pre-configured to connect to the live Railway MCP Store:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- **Overview Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Live Interactive A2A Demo**: [http://localhost:3000/demo](http://localhost:3000/demo)
- **Guardrail / Failure Scenarios**: [http://localhost:3000/failure-demo](http://localhost:3000/failure-demo)
- **Architecture Breakdown**: [http://localhost:3000/architecture](http://localhost:3000/architecture)

---

### 2. Running the MCP Server Locally (Optional)

If running the MCP server locally instead of Railway:

```bash
cd ecommerce-mcp
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev          # Next.js store on :3000
```

In a second terminal, start the standalone Streamable HTTP MCP server:

```bash
cd ecommerce-mcp
npm run mcp:dev      # Standalone MCP Server on :8787 (POST /mcp)
```

---

## 🎬 Live Interactive Demo Walkthrough

Navigate to [http://localhost:3000/demo](http://localhost:3000/demo):

1. **Buyer Intent Curation**:
   - Type `"I need a coding laptop under ₹70,000"` or select a pre-set prompt.
   - The Buyer Agent curates the prompt into a formal A2A JSON contract (`category: "laptop"`, `budget_inr: 70000`).

2. **MCP Catalog Evaluation (Gemini 2.5 Flash)**:
   - The agent invokes MCP tools to retrieve live candidate items from the PostgreSQL database.
   - Gemini evaluates specs and price, matching the best candidate (e.g. `ZenBook Pro 15`).

3. **Data-Backed Growth Upsell**:
   - Complementary accessory recommendations are presented with verified compatibility.
   - Buyer can accept or skip the add-on.

4. **Deterministic Policy Gate**:
   - Before payment, the policy engine verifies the order total against merchant limits.
   - If total $\le$ limit: checkout proceeds. If total $>$ limit: transaction is blocked and payment is refused.

5. **Razorpay Modal Checkout & Settlement**:
   - The Razorpay test payment modal opens.
   - Upon completion, the signature is verified, the order is settled via `/api/orders/settle`, and the transaction is recorded in the audit trail.

---

## 📜 License

MIT License. Built for the Razorpay Ideathon / Hackathon.
