export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: 40 }}>
      <h1>Store backend is live 🎉</h1>
      <p>
        API: <code>/api/products</code>, <code>/api/orders</code>
      </p>
      <p>MCP server: run separately, see README.md</p>
    </main>
  );
}
