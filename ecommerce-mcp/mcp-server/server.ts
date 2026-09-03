/**
 * Standalone MCP server exposing this store's catalog + orders to any MCP-compatible agent.
 * Shares the same Postgres DB (via the lib/ folder) as the Next.js storefront.
 *
 * Run: npm run mcp:dev   (see package.json)
 * Deploy: as its own small Node service (Railway/Render/Fly), pointed at the same DATABASE_URL
 *         and RAZORPAY_* env vars as the main app.
 */
import express from "express";
import { randomUUID } from "crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import {
  searchProducts,
  getProduct,
  getProductsByCategory,
  checkInventory,
} from "../lib/products";
import { createOrder, getOrderStatus, cancelOrder, getCustomerOrders, OrderError } from "../lib/orders";

function buildServer() {
  const server = new McpServer({ name: "ecommerce-store", version: "1.0.0" });

  server.tool(
    "search_products",
    "Search the store catalog by keyword (matches name and description).",
    { query: z.string().describe("Search keywords, e.g. 'wireless headphones'") },
    async ({ query }) => ({
      content: [{ type: "text", text: JSON.stringify(await searchProducts(query)) }],
    })
  );

  server.tool(
    "get_product",
    "Get full details for a single product by its ID.",
    { product_id: z.string() },
    async ({ product_id }) => {
      const product = await getProduct(product_id);
      if (!product) return { content: [{ type: "text", text: "Product not found" }], isError: true };
      return { content: [{ type: "text", text: JSON.stringify(product) }] };
    }
  );

  server.tool(
    "get_products_by_category",
    "List all products in a given category (by name or slug).",
    { category: z.string() },
    async ({ category }) => ({
      content: [{ type: "text", text: JSON.stringify(await getProductsByCategory(category)) }],
    })
  );

  server.tool(
    "check_inventory",
    "Check current stock quantity for a product before ordering.",
    { product_id: z.string() },
    async ({ product_id }) => {
      const result = await checkInventory(product_id);
      if (!result) return { content: [{ type: "text", text: "Product not found" }], isError: true };
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "create_order",
    "Create a new order for a customer and initiate a Razorpay TEST-mode payment. " +
      "Reserves inventory immediately. Returns a razorpay_order_id + razorpay_key_id the agent/user " +
      "must use to complete payment via Razorpay Checkout (test cards only, no real money moves).",
    {
      customer_email: z.string().email(),
      customer_name: z.string().optional(),
      items: z
        .array(z.object({ product_id: z.string(), quantity: z.number().int().positive() }))
        .min(1),
    },
    async ({ customer_email, customer_name, items }) => {
      try {
        const result = await createOrder({
          customerEmail: customer_email,
          customerName: customer_name,
          items: items.map((i) => ({ productId: i.product_id, quantity: i.quantity })),
        });
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: err.message }], isError: true };
      }
    }
  );

  server.tool(
    "get_order_status",
    "Check the status and details of an existing order.",
    { order_id: z.string() },
    async ({ order_id }) => {
      const order = await getOrderStatus(order_id);
      if (!order) return { content: [{ type: "text", text: "Order not found" }], isError: true };
      return { content: [{ type: "text", text: JSON.stringify(order) }] };
    }
  );

  server.tool(
    "cancel_order",
    "Cancel an order that hasn't shipped yet. Restocks inventory automatically.",
    { order_id: z.string() },
    async ({ order_id }) => {
      try {
        const result = await cancelOrder(order_id);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: err.message }], isError: true };
      }
    }
  );

  server.tool(
    "get_customer_orders",
    "List all past orders for a customer by email.",
    { customer_email: z.string().email() },
    async ({ customer_email }) => ({
      content: [{ type: "text", text: JSON.stringify(await getCustomerOrders(customer_email)) }],
    })
  );

  return server;
}

const app = express();
app.use(express.json());

// Simple shared-secret auth so random agents can't hit your store/DB.
// Set MCP_API_KEY in env; agents send it as `Authorization: Bearer <key>`.
app.use((req, res, next) => {
  const required = process.env.MCP_API_KEY;
  if (!required) return next(); // no key configured -> open (fine for local dev only)
  const auth = req.headers.authorization;
  if (auth === `Bearer ${required}`) return next();
  res.status(401).json({ error: "Unauthorized" });
});

// Stateless mode: initialize single server and transport once for all requests
const server = buildServer();
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
});

server.connect(transport).catch(console.error);

app.post("/mcp", async (req, res) => {
  await transport.handleRequest(req, res, req.body);
});

app.get("/mcp", async (req, res) => {
  await transport.handleRequest(req, res);
});

app.get("/health", (_req, res) => res.json({ ok: true }));

const port = Number(process.env.MCP_PORT) || 8787;
app.listen(port, () => {
  console.log(`MCP commerce server listening on :${port} (POST /mcp)`);
});
