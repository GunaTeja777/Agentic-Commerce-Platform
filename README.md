# Agentic Commerce — AI Merchant Growth Agent & A2A Platform (MCP Architecture)

> ⚠️ **CRITICAL NOTICE: THIS PROJECT USES RAZORPAY TEST MODE ONLY.**  
> No real money is moved, no real credit/debit card numbers are stored, and production keys must never be used.

---

## 🌟 Overview

**Agentic Commerce** is an autonomous **Agent-to-Agent (A2A)** commerce platform built on the **Model Context Protocol (MCP)**. It enables a **Buyer-Side AI Agent** (chatbot) to converse, discover products, negotiate, and execute purchases with a **Merchant-Side AI Growth Agent** backed by deterministic financial policy guardrails, real-time inventory management, and **Razorpay Test Mode** checkouts.

### Core Architectural Layers:

1. **AI Buyer Chatbot (Buyer-Side Agent)**:
   - Interactive conversational chatbot interface in `/demo`.
   - **Hugging Face (Meta Llama-3.3-70B-Instruct)**: Analyzes natural language prompts and curates them into structured A2A commerce intent contracts (`category`, `budget_inr`, `preferences`).
   - Supports conversational decision commands (`"yes"`, `"add"`, `"skip"`, `"approve"`, `"pay"`) and direct order instructions (`"StrikePad Gaming Mouse Pad XL order this"`).

2. **Merchant AI Agent & MCP Client (`frontend/src/app/api/agent/chat`)**:
   - Powered by **Groq (`llama-3.3-70b-versatile`)** acting as the MCP client orchestrator.
   - Queries live catalog products from the Model Context Protocol server.
   - Applies token-weighted candidate scoring and catalog relationships to select precision product matches and propose data-backed growth/upsell opportunities.

3. **Dynamic Policy Gate & Deterministic Guardrails (`/api/policies/check`)**:
   - Merchants configure **Maximum Transaction Limit (₹)** (e.g., ₹70,000) and **Approval Threshold (₹)** (e.g., ₹5,000) in `/policy`.
   - **Tier 1 (Autonomous Zero-Touch Checkout)**: If total $\le$ Approval Threshold (e.g. ₹800 $\le$ ₹5,000), the order is booked automatically on the live store website via MCP **without asking for permission**.
   - **Tier 2 (Human Authorization Required)**: If total $>$ Approval Threshold and $\le$ Maximum Limit (e.g. ₹65,000 $>$ ₹5,000), the agent pauses at the Policy Gate and asks for user permission in the Transaction box (`[ Approve & Place Order on Website ]` / `[ Reject / Cancel ]`).
   - **Tier 3 (Hard Policy Block)**: If total $>$ Maximum Limit (e.g. ₹77,000 $>$ ₹70,000), the transaction is blocked with **0 Razorpay API calls and 0 MCP payment executions**.

4. **Model Context Protocol (MCP) Server & Live Storefront (`ecommerce-mcp/`)**:
   - Built with `@modelcontextprotocol/sdk/server/mcp.js`.
   - Exposes 8 standardized MCP commerce tools (`search_products`, `get_product`, `check_inventory`, `create_order`, `get_order_status`, etc.) over Streamable HTTP and REST endpoints.
   - Authoritative PostgreSQL Database via **Prisma ORM** ensuring zero LLM hallucination of products or prices.
   - Live deployed on Railway: [https://ai-growth-agentic-commerce-production.up.railway.app](https://ai-growth-agentic-commerce-production.up.railway.app)

---

## 🏛️ Dual-Agent A2A + MCP Architecture & Workflow

```
                             USER / BUYER INTERACTIVE CHAT
                                           │
                                           ▼
                           1. AI BUYER CHATBOT (Hugging Face)
                           meta-llama/Llama-3.3-70B-Instruct
                     Curates natural language into A2A Commerce JSON
                                           │
                                           ▼
                           2. STRUCTURED A2A INTENT CONTRACT
                            { category, budget_inr, preferences }
                                           │
                                           ▼
                         3. MERCHANT AI AGENT (Groq MCP Client)
                               llama-3.3-70b-versatile
                                           │
                   ┌───────────────────────┴───────────────────────┐
                   ▼                                               ▼
          MCP Tool: search_products                       MCP Tool: get_product
       (Keyword match & token scoring)                 (Full specs & real inventory)
                   │                                               │
                   └───────────────────────┬───────────────────────┘
                                           │ (Streamable HTTP / REST Tools)
                                           ▼
                  4. STANDALONE MCP SERVER & LIVE RAILWAY STORE
                      ecommerce-mcp/ (Node.js + Prisma + Postgres)
                  https://ai-growth-agentic-commerce-production.up.railway.app
                                           │
                                           ▼
                           5. GROQ MCP CANDIDATE MATCHING
                      Ranked real records (Zero Hallucination)
                   (e.g., StrikePad Gaming Mouse Pad XL — ₹800)
                                           │
                                           ▼
                           6. INTENT DISPATCH & POLICY GATE
                        Is it a Direct Order ("order this", "buy")?
                                           │
                     ┌─────────────────────┴─────────────────────┐
                     │ DIRECT ORDER                              │ DISCOVERY / EXPLORE
                     ▼                                           ▼
              Bypass Upsell Wait                        Present Growth Opportunity
              Evaluate Policy on Item                   (Buyer replies "yes" or "skip")
                     │                                           │
                     └─────────────────────┬─────────────────────┘
                                           │
                                           ▼
                            7. DYNAMIC POLICY GATE EVALUATION
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         │                                 │                                 │
         ▼                                 ▼                                 ▼
   TIER 1: AUTO-BUY               TIER 2: HITL APPROVAL              TIER 3: HARD BLOCK
Total <= Approval Threshold     Total > Threshold & <= Limit      Total > Maximum Limit
     (e.g. ₹800 <= ₹5,000)          (e.g. ₹65,000 > ₹5,000)        (e.g. ₹77,000 > ₹70,000)
         │                                 │                                 │
         ▼                                 ▼                                 ▼
⚡ ZERO-TOUCH MCP BOOKING         🔒 PAUSE AT POLICY GATE            🛑 BLOCKED BY POLICY
• Executes MCP create_order      • Asks permission in UI            • 0 MCP payment calls
• Settles order as PAID in DB    • "[ Approve & Place Order ]"      • 0 Razorpay API calls
• NO PERMISSION NEEDED           • Or user types "approve" in chat  • Refusal logged in audit
         │                                 │                                 │
         ▼                                 ▼                                 ▼
Green MCP Receipt Displayed       User Approves -> Book on Website    Policy Block Notice
```

---

## 🛠️ The 8 Model Context Protocol (MCP) Tools

The MCP Server (`ecommerce-mcp/mcp-server/server.ts`) exposes 8 tools adhering strictly to the Model Context Protocol specification:

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

## 💬 How the AI Buyer Chatbot Works

### 1. Interactive Chat Experience
- The AI Buyer card at [http://localhost:3000/demo](http://localhost:3000/demo) functions as a live chatbot.
- Chat input is always active with support for the **Enter** key and **Send** button.
- The conversation messages thread automatically scrolls to the newest exchange.

### 2. Conversational Intent & Quick Chips
- Users can click fast action chips or type any instruction:
  - `⚡ StrikePad Gaming Mouse Pad XL order this`: Executes a direct purchase. Since price is ₹800 $\le$ ₹5,000 threshold, it executes zero-touch autonomous checkout on the live website.
  - `🔒 NovaBook Pro 14 order this`: Selects the ₹65,000 laptop. Since ₹65,000 $>$ ₹5,000 threshold, the agent pauses at the Policy Gate and asks for user authorization in the Transaction box.

### 3. Natural Language Replies
- When an upsell recommendation is proposed:
  - User can click `[ Add to Basket ]` or `[ Skip ]`, OR simply type `"yes"`, `"add"`, `"skip"`, or `"no"` in the chat.
- When human authorization is requested at the Policy Gate:
  - User can click `[ Approve & Place Order on Website ]` or `[ Reject / Cancel Order ]`, OR type `"approve"` / `"pay"` / `"reject"` into the chat input.

---

## 🔒 Policy Gate Configuration (`/policy`)

The Merchant Policy Gate is fully dynamic and configurable in real-time:

- **Maximum Transaction Limit (₹)** (Default: `₹70,000`):
  - Hard cap on any basket total. Anything exceeding this limit is blocked immediately with 0 payment calls.
- **Approval Threshold (₹)** (Default: `₹5,000`):
  - Autonomy ceiling. Purchases at or below this value are considered routine/low-risk and proceed with zero-touch checkout. Purchases above this value require explicit human authorization before execution.

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
│   ├── src/app/api/    # MCP Client Agent routes (/api/agent/chat, /api/agent/curate, /api/policies/check, /api/orders)
│   ├── src/context/    # CommerceContext state synchronizer (dynamic policy limits)
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

### Frontend (`frontend/.env.local` / `agent/.env`)
```bash
NEXT_PUBLIC_STORE_URL=https://ai-growth-agentic-commerce-production.up.railway.app
STORE_API_URL=https://ai-growth-agentic-commerce-production.up.railway.app
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_AGENT_URL=/api
GROQ_API_KEY=gsk_...
HUGGINGFACE_API_TOKEN=hf_...
```

---

## 🚀 Quickstart Guide

### 1. Running the Frontend Dashboard & MCP Client

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser:

- **Live Interactive A2A Demo & Chatbot**: [http://localhost:3000/demo](http://localhost:3000/demo)
- **Policy Engine Controls**: [http://localhost:3000/policy](http://localhost:3000/policy)
- **Transactions Ledger**: [http://localhost:3000/transactions](http://localhost:3000/transactions)
- **Live Railway Store**: [https://ai-growth-agentic-commerce-production.up.railway.app](https://ai-growth-agentic-commerce-production.up.railway.app)

---

## 🎬 Testing the Demo Scenarios

1. **Scenario 1: Autonomous Zero-Touch Order ($\le$ Threshold)**
   - In the AI Buyer chat, type: `"StrikePad Gaming Mouse Pad XL order this"` and press Enter.
   - Matched product: **StrikePad Gaming Mouse Pad XL** (₹800).
   - Since ₹800 $\le$ ₹5,000 threshold, the agent automatically creates and settles the order on the live store website via MCP.
   - Result: Dark green receipt card appears with `"✓ Booked on Live Website (via MCP)"`, Store Booking ID, and status `"PAID"`.

2. **Scenario 2: Human Authorization Required ($>$ Threshold)**
   - In the AI Buyer chat, type: `"NovaBook Pro 14 order this"` and press Enter.
   - Matched product: **NovaBook Pro 14** (₹65,000).
   - Since ₹65,000 $>$ ₹5,000 threshold, the agent pauses at the Policy Gate.
   - Result: Amber box appears in the Transaction column: `"Human Authorization Required"`. Click `[ Approve & Place Order on Website (Pay ₹65,000) ]` or type `"approve"` in chat to finalize the order.

3. **Scenario 3: Hard Policy Limit Block ($>$ Maximum Limit)**
   - Click `"Run Blocked Scenario"` in the top bar.
   - Basket total is ₹77,000 (Workstation + UltraView 4K Monitor).
   - Since ₹77,000 $>$ ₹70,000 maximum limit, the Policy Gate hard-blocks the transaction.
   - Result: Red policy blocked card displayed. Exactly 0 Razorpay API calls and 0 MCP payment calls made.

---

## 📜 License

MIT License. Built for the Razorpay Ideathon / Hackathon.
