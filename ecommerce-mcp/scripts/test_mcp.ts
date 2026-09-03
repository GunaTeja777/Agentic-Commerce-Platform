import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function main() {
  const transport = new StreamableHTTPClientTransport(
    new URL("http://localhost:8787/mcp"),
    { requestInit: { headers: { Authorization: "Bearer change-me-to-a-long-random-string" } } }
  );

  const client = new Client({ name: "test-agent", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport);
  console.log("✅ Client successfully connected to MCP Server on :8787!");

  const tools = await client.listTools();
  console.log(`✅ Loaded ${tools.tools.length} Registered MCP Tools:`);
  tools.tools.forEach((t) => console.log(`   🛠️  ${t.name} -> ${t.description.slice(0, 60)}...`));

  console.log("\n🔍 Calling Tool: search_products(query='laptop')...");
  const searchRes = await client.callTool({ name: "search_products", arguments: { query: "laptop" } });
  const products = JSON.parse((searchRes.content[0] as any).text);
  console.log(`✅ search_products returned ${products.length} live database items:`);
  products.slice(0, 3).forEach((p: any) => console.log(`   • ${p.name} (₹${(p.price / 100).toLocaleString("en-IN")})`));

  const firstId = products[0].id;
  console.log(`\n📦 Calling Tool: check_inventory(product_id='${firstId}')...`);
  const invRes = await client.callTool({ name: "check_inventory", arguments: { product_id: firstId } });
  console.log("✅ check_inventory response:", (invRes.content[0] as any).text);

  await client.close();
  console.log("\n🎉 ALL MCP SERVER CHECKS PASSED!");
}

main().catch((e) => {
  console.error("Test error:", e);
  process.exit(1);
});
