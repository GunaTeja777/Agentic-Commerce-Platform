import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import {
  searchProducts,
  getProduct,
  getProductsByCategory,
  checkInventory,
} from "@/lib/products";
import {
  createOrder,
  getOrderStatus,
  cancelOrder,
  getCustomerOrders,
} from "@/lib/orders";

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
    "Create a new order for a customer and initiate a Razorpay TEST-mode payment. Reserves inventory immediately.",
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

// Session store for Next.js App Router
const sessions = new Map<string, WebStandardStreamableHTTPServerTransport>();

async function handleMcpRequest(req: NextRequest) {
  // Optional auth
  const requiredKey = process.env.MCP_API_KEY;
  if (requiredKey) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${requiredKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const sessionId = req.headers.get("mcp-session-id");
  if (sessionId && sessions.has(sessionId)) {
    const transport = sessions.get(sessionId)!;
    return transport.handleRequest(req);
  }

  const server = buildServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (id) => {
      sessions.set(id, transport);
    },
    onsessionclosed: (id) => {
      sessions.delete(id);
    },
  });

  await server.connect(transport);
  return transport.handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleMcpRequest(req);
}

export async function GET(req: NextRequest) {
  return handleMcpRequest(req);
}
