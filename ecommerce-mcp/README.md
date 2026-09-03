# E-commerce + MCP Agent Commerce (Phase 1: backend, DB, MCP server)

## What's in here

- **Next.js app** — REST API for the storefront (`/api/products`, `/api/orders`, Razorpay webhook)
- **Prisma + Postgres** — schema for products, inventory, customers, orders
- **Razorpay (test mode)** — order creation, payment verification, webhook handling
- **MCP server** (`mcp-server/server.ts`) — standalone service exposing 8 tools to AI agents:
  `search_products`, `get_product`, `get_products_by_category`, `check_inventory`,
  `create_order`, `get_order_status`, `cancel_order`, `get_customer_orders`

Phase 2 (not built yet): the actual storefront UI (product listing, cart, Razorpay Checkout widget on the frontend).

## 1. Local setup

```bash
npm install
cp .env.example .env      # fill in DATABASE_URL + Razorpay TEST keys
npm run db:generate
npm run db:migrate        # creates tables in your local Postgres
npm run db:seed           # adds sample products
npm run dev                # Next.js app on :3000
```

In a second terminal, run the MCP server:

```bash
npm run mcp:dev            # listens on :8787, POST /mcp
```

### Where to get Razorpay test keys
Dashboard → toggle to **Test Mode** → Settings → API Keys. Use these in `.env`
(`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`). For the webhook, Settings → Webhooks →
add `https://your-domain/api/webhooks/razorpay`, subscribe to `payment.captured` and
`payment.failed`, and copy the webhook secret into `RAZORPAY_WEBHOOK_SECRET`.

Test card for checkout: `4111 1111 1111 1111`, any future expiry, any CVV.

## 2. Testing the MCP server directly

Any MCP-compatible client (including Claude, via a custom connector) can point at
`http://localhost:8787/mcp` (or your deployed URL) using the Streamable HTTP transport.
If you set `MCP_API_KEY`, the agent must send `Authorization: Bearer <key>`.

## 3. Your local Postgres → production

Vercel (best fit for Next.js) can't reach `localhost`, so pick one:

- **Easiest: Neon or Supabase** (free tier Postgres). Create a project, copy the
  connection string into `DATABASE_URL` for production, run `npm run db:migrate:deploy`
  against it once. Keep your local Postgres for dev — just swap `.env` values.
- **All-in-one: Railway** — spin up a Postgres plugin + deploy this repo in the same
  project, `DATABASE_URL` is wired automatically.
- **Self-host**: a VPS running Postgres + the Next.js app (e.g. via Docker) if you want
  full control — more setup work.

## 4. Deploying

- **Next.js app** → Vercel (`vercel deploy`) or Railway/Render. Set the same env vars
  from `.env` in the platform's dashboard (never commit `.env`).
- **MCP server** → deploy as its own small Node service (Railway/Render/Fly work well)
  since it needs to stay running to accept POST /mcp requests — it is *not* a serverless
  function. Point it at the same `DATABASE_URL` and `RAZORPAY_*` vars.
- Update the webhook URL in Razorpay's dashboard to your deployed domain once live.

## Notes on agent-initiated purchases

`create_order` reserves inventory and creates a **Razorpay test order** — no real money
moves in test mode. Before this goes anywhere near production/live keys, add: explicit
buyer confirmation before charging, per-agent spending limits, and idempotency keys on
`create_order` so a retried agent call can't double-charge.
