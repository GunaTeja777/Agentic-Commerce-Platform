"use client";

import { useEffect, useState, useMemo } from "react";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number; // in paise
  currency: string;
  imageUrl?: string | null;
  category: string;
  inStock: boolean;
  quantityAvailable: number;
};

type CartItem = {
  product: Product;
  quantity: number;
};

type OrderResult = {
  orderId: string;
  status: string;
  totalAmount: number;
  razorpayOrderId: string;
  razorpayKeyId?: string;
  items: { productId: string; name: string; quantity: number; unitPrice: number }[];
};

const PAGE_SIZE = 12;

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("featured");
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);

  // Pagination / Load More
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Checkout modal & state
  const [customerEmail, setCustomerEmail] = useState<string>("buyer@example.com");
  const [customerName, setCustomerName] = useState<string>("Alex Mercer");
  const [customerAddress, setCustomerAddress] = useState<string>("221B Baker Street, Indiranagar, Bengaluru");
  const [orderProcessing, setOrderProcessing] = useState<boolean>(false);
  const [lastOrder, setLastOrder] = useState<OrderResult | null>(null);

  // Quick View Modal
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Order Tracker Modal
  const [isTrackerOpen, setIsTrackerOpen] = useState<boolean>(false);
  const [trackOrderId, setTrackOrderId] = useState<string>("");
  const [trackedOrder, setTrackedOrder] = useState<any | null>(null);
  const [trackLoading, setTrackLoading] = useState<boolean>(false);

  // MCP Agent Drawer
  const [isMcpOpen, setIsMcpOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchProducts();
    loadRazorpayScript();
  }, []);

  // Reset pagination on filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, selectedCategory, inStockOnly, sortBy]);

  const loadRazorpayScript = () => {
    if (typeof window !== "undefined" && !document.getElementById("razorpay-sdk")) {
      const script = document.createElement("script");
      script.id = "razorpay-sdk";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/products");
      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    products.forEach((p) => {
      const cat = p.category.toLowerCase();
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [products]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category))).sort();
    return ["all", ...unique];
  }, [products]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }

    // Category
    if (selectedCategory !== "all") {
      list = list.filter((p) => p.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    // In Stock Only
    if (inStockOnly) {
      list = list.filter((p) => p.inStock && p.quantityAvailable > 0);
    }

    // Sort
    if (sortBy === "price-low") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === "name-asc") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [products, searchQuery, selectedCategory, inStockOnly, sortBy]);

  // Displayed paginated slice
  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + PAGE_SIZE);
      setLoadingMore(false);
    }, 250);
  };

  // Cart operations
  const addToCart = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!product.inStock || product.quantityAvailable <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeCartItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const cartTotalPaise = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  // Razorpay Checkout
  const handleCheckout = async () => {
    if (!cart.length) return;
    if (!customerEmail.trim()) {
      alert("Please enter customer email");
      return;
    }

    try {
      setOrderProcessing(true);
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail: customerEmail.trim(),
          customerName: customerName.trim(),
          items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order creation failed");

      setLastOrder(data);
      setCart([]);

      // Trigger Razorpay Checkout Modal
      if ((window as any).Razorpay && data.razorpayOrderId && data.razorpayKeyId) {
        const options = {
          key: data.razorpayKeyId,
          amount: data.totalAmount,
          currency: data.currency || "INR",
          name: "NovaStore E-Commerce",
          description: `Order #${data.orderId.slice(0, 8)}`,
          order_id: data.razorpayOrderId,
          prefill: {
            name: customerName,
            email: customerEmail,
          },
          theme: { color: "#dc2626" },
          handler: function (response: any) {
            alert(`✅ Payment Captured! Razorpay ID: ${response.razorpay_payment_id}`);
          },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch (err: any) {
      alert(`Checkout failed: ${err.message}`);
    } finally {
      setOrderProcessing(false);
    }
  };

  // Track order query
  const handleTrackQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackOrderId.trim()) return;

    try {
      setTrackLoading(true);
      const res = await fetch(`/api/orders/${trackOrderId.trim()}`);
      const data = await res.json();
      if (res.ok) {
        setTrackedOrder(data);
      } else {
        setTrackedOrder({ error: data.error || "Order not found" });
      }
    } catch (err: any) {
      setTrackedOrder({ error: err.message });
    } finally {
      setTrackLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff" }}>
      {/* 🔴 TOP ANNOUNCEMENT BAR */}
      <div
        style={{
          background: "linear-gradient(90deg, #b91c1c 0%, #dc2626 50%, #991b1b 100%)",
          color: "#ffffff",
          padding: "7px 16px",
          fontSize: "0.8rem",
          fontWeight: 600,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          letterSpacing: "0.02em",
        }}
      >
        <div style={{ margin: "0 auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span>⚡ <strong>LIVE CATALOG:</strong> 99 Real-Time Products Synced from PostgreSQL</span>
          <span style={{ opacity: 0.7 }}>•</span>
          <span>Razorpay Test Gateway Active</span>
          <span style={{ opacity: 0.7 }}>•</span>
          <span>Free Express Shipping Across India</span>
        </div>
      </div>

      {/* 🔴 MAIN HEADER */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            maxWidth: 1380,
            margin: "0 auto",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          {/* Logo */}
          <div
            style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
            onClick={() => setSelectedCategory("all")}
          >
            <div
              style={{
                backgroundColor: "#dc2626",
                color: "#ffffff",
                width: 40,
                height: 40,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: "1.25rem",
                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.35)",
              }}
            >
              N
            </div>
            <div>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
                NOVA<span style={{ color: "#dc2626" }}>STORE</span>
              </div>
              <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Real-Time Commerce
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div style={{ flex: 1, maxWidth: 640, position: "relative" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                border: "2px solid #e2e8f0",
                borderRadius: 10,
                overflow: "hidden",
                backgroundColor: "#f8fafc",
                transition: "all 0.2s ease",
              }}
            >
              <span style={{ padding: "0 12px", color: "#64748b", fontSize: "1.1rem" }}>🔍</span>
              <input
                type="text"
                placeholder="Search across 99 products (Laptops, Keyboards, Audio, Chargers...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 4px",
                  border: "none",
                  outline: "none",
                  backgroundColor: "transparent",
                  fontSize: "0.92rem",
                  color: "#0f172a",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    border: "none",
                    background: "none",
                    padding: "0 12px",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontSize: "1rem",
                  }}
                >
                  ✕
                </button>
              )}
              <button
                className="btn-red"
                style={{
                  borderRadius: 0,
                  padding: "12px 22px",
                  fontSize: "0.9rem",
                }}
              >
                Search
              </button>
            </div>
          </div>

          {/* Header Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setIsTrackerOpen(true)} className="btn-white" style={{ fontSize: "0.85rem" }}>
              📦 Track Order
            </button>

            <button
              onClick={() => setIsMcpOpen(true)}
              className="btn-white"
              style={{ fontSize: "0.85rem", color: "#dc2626", borderColor: "#fecaca" }}
            >
              🤖 Agent MCP
            </button>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="btn-red"
              style={{
                padding: "10px 18px",
                position: "relative",
              }}
            >
              🛒 Cart
              <span
                style={{
                  backgroundColor: "#ffffff",
                  color: "#dc2626",
                  borderRadius: "50%",
                  width: 22,
                  height: 22,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  marginLeft: 4,
                }}
              >
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </span>
            </button>
          </div>
        </div>

        {/* 🔴 CATEGORY NAV BAR */}
        <div style={{ borderTop: "1px solid #f1f5f9", backgroundColor: "#ffffff" }}>
          <div
            style={{
              maxWidth: 1380,
              margin: "0 auto",
              padding: "10px 24px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              overflowX: "auto",
            }}
          >
            {categories.map((cat) => {
              const count = categoryCounts[cat.toLowerCase()] || 0;
              const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`category-pill ${isSelected ? "active" : ""}`}
                >
                  <span style={{ textTransform: "capitalize" }}>{cat === "all" ? "All Products" : cat}</span>
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: "0.72rem",
                      opacity: isSelected ? 1 : 0.7,
                      backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                      padding: "2px 6px",
                      borderRadius: 10,
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* 🔴 HERO PROMOTIONAL BANNER */}
      <section style={{ maxWidth: 1380, margin: "24px auto 0", padding: "0 24px" }}>
        <div
          style={{
            background: "linear-gradient(120deg, #ffffff 0%, #fff1f2 100%)",
            border: "1px solid #fecaca",
            borderRadius: 16,
            padding: "32px 40px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 24,
            boxShadow: "0 8px 30px rgba(220, 38, 38, 0.06)",
          }}
        >
          <div style={{ maxWidth: 680 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                backgroundColor: "#fee2e2",
                color: "#b91c1c",
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "4px 12px",
                borderRadius: 20,
                marginBottom: 12,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              ★ Autonomous Agentic Commerce Flagship
            </div>
            <h2 style={{ fontSize: "2.3rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.2, marginBottom: 12 }}>
              Explore <span style={{ color: "#dc2626" }}>99 Premium Tech</span> Products
            </h2>
            <p style={{ color: "#475569", fontSize: "1rem", lineHeight: 1.6, marginBottom: 20 }}>
              Live real-time inventory from your PostgreSQL database. Browse ultra-fast Laptops, 4K Monitors, Studio Audio, Wireless Mice, GaN Fast Chargers, and checkout seamlessly with <strong>Razorpay Test Mode</strong>.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={() => setSelectedCategory("Laptops")} className="btn-red">
                💻 Shop Laptops ({categoryCounts["laptops"] || 20})
              </button>
              <button onClick={() => setSelectedCategory("Accessories")} className="btn-white">
                🔌 Tech Accessories ({categoryCounts["accessories"] || 19})
              </button>
              <button onClick={() => setIsMcpOpen(true)} className="btn-red-outline">
                🤖 AI Agent Tooling (MCP)
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              backgroundColor: "#ffffff",
              padding: "20px 24px",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#16a34a", fontSize: "1.2rem" }}>✓</span>
              <span style={{ fontSize: "0.9rem", color: "#334155", fontWeight: 600 }}>PostgreSQL DB: <strong>99 Products Live</strong></span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#16a34a", fontSize: "1.2rem" }}>✓</span>
              <span style={{ fontSize: "0.9rem", color: "#334155", fontWeight: 600 }}>Razorpay Checkout: <strong>Active (Test Mode)</strong></span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#16a34a", fontSize: "1.2rem" }}>✓</span>
              <span style={{ fontSize: "0.9rem", color: "#334155", fontWeight: 600 }}>Agent Protocol: <strong>POST :8787/mcp</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* 🔴 FILTER CONTROLS & PRODUCT GRID */}
      <main style={{ maxWidth: 1380, margin: "24px auto", padding: "0 24px 60px" }}>
        {/* Controls Bar */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "14px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 24,
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
              Showing {displayedProducts.length} of {filteredProducts.length} Products
            </span>
            {selectedCategory !== "all" && (
              <span
                style={{
                  backgroundColor: "#fee2e2",
                  color: "#dc2626",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 12,
                }}
              >
                Category: {selectedCategory}
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {/* In Stock toggle */}
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.88rem", color: "#334155", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                style={{ accentColor: "#dc2626", width: 16, height: 16 }}
              />
              In Stock Only
            </label>

            {/* Sort Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.88rem", color: "#64748b" }}>Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  fontSize: "0.88rem",
                  color: "#0f172a",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="featured">Featured / Default</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name-asc">Product Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#64748b" }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>⏳</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>Loading products from database...</div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 24px",
              backgroundColor: "#ffffff",
              borderRadius: 16,
              border: "1px dashed #cbd5e1",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🔍</div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>No products match your search</h3>
            <p style={{ color: "#64748b", marginBottom: 20 }}>Try resetting your search query or selecting another category.</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setInStockOnly(false);
              }}
              className="btn-red"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div>
            {/* PRODUCT GRID */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 22,
                marginBottom: 36,
              }}
            >
              {displayedProducts.map((p, idx) => {
                const priceInRupees = (p.price / 100).toLocaleString("en-IN", {
                  maximumFractionDigits: 0,
                });
                const originalPrice = Math.round((p.price / 100) * 1.18).toLocaleString("en-IN");
                const isLowStock = p.inStock && p.quantityAvailable <= 15;
                const hasDiscount = idx % 2 === 0;

                return (
                  <div key={p.id} className="product-card">
                    {hasDiscount && <span className="badge-deal">SPECIAL DEAL</span>}

                    <div
                      className="product-image-container"
                      onClick={() => setQuickViewProduct(p)}
                      style={{ cursor: "pointer" }}
                    >
                      <img
                        src={p.imageUrl || "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=700"}
                        alt={p.name}
                        loading="lazy"
                      />
                    </div>

                    <div style={{ padding: 18, display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#dc2626", textTransform: "uppercase" }}>
                            {p.category}
                          </span>

                          {p.inStock ? (
                            isLowStock ? (
                              <span className="badge-lowstock">Only {p.quantityAvailable} left</span>
                            ) : (
                              <span className="badge-instock">In Stock</span>
                            )
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "#dc2626", fontWeight: 700 }}>Out of Stock</span>
                          )}
                        </div>

                        <h3
                          onClick={() => setQuickViewProduct(p)}
                          style={{
                            fontSize: "1.05rem",
                            fontWeight: 700,
                            color: "#0f172a",
                            marginBottom: 6,
                            lineHeight: 1.35,
                            cursor: "pointer",
                          }}
                        >
                          {p.name}
                        </h3>

                        <p
                          style={{
                            fontSize: "0.82rem",
                            color: "#64748b",
                            lineHeight: 1.5,
                            marginBottom: 14,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {p.description}
                        </p>
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
                          <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#dc2626" }}>
                            ₹{priceInRupees}
                          </span>
                          <span style={{ fontSize: "0.85rem", color: "#94a3b8", textDecoration: "line-through" }}>
                            ₹{originalPrice}
                          </span>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={(e) => addToCart(p, e)}
                            disabled={!p.inStock || p.quantityAvailable <= 0}
                            className="btn-red"
                            style={{
                              flex: 1,
                              opacity: p.inStock ? 1 : 0.5,
                              cursor: p.inStock ? "pointer" : "not-allowed",
                              fontSize: "0.85rem",
                              padding: "9px 12px",
                            }}
                          >
                            ➕ Add to Cart
                          </button>
                          <button
                            onClick={() => setQuickViewProduct(p)}
                            className="btn-white"
                            title="Quick View"
                            style={{ padding: "9px 12px", fontSize: "0.9rem" }}
                          >
                            👁
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 🔴 LOAD MORE PAGINATION SECTION */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px 0 12px",
                gap: 14,
              }}
            >
              {/* Progress counter & bar */}
              <div style={{ width: "100%", maxWidth: 360, textAlign: "center" }}>
                <div style={{ fontSize: "0.88rem", color: "#64748b", marginBottom: 8, fontWeight: 500 }}>
                  Showing <strong style={{ color: "#0f172a" }}>{displayedProducts.length}</strong> of{" "}
                  <strong style={{ color: "#0f172a" }}>{filteredProducts.length}</strong> products
                </div>
                <div
                  style={{
                    width: "100%",
                    height: 6,
                    backgroundColor: "#e2e8f0",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(displayedProducts.length / filteredProducts.length) * 100}%`,
                      backgroundColor: "#dc2626",
                      borderRadius: 3,
                      transition: "width 0.3s ease",
                    }}
                  ></div>
                </div>
              </div>

              {/* Load More Button */}
              {visibleCount < filteredProducts.length ? (
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="btn-red"
                  style={{
                    padding: "13px 36px",
                    fontSize: "0.95rem",
                    borderRadius: 30,
                    boxShadow: "0 4px 16px rgba(220, 38, 38, 0.25)",
                  }}
                >
                  {loadingMore ? (
                    <span>⏳ Loading more...</span>
                  ) : (
                    <span>⬇️ Load More Products ({filteredProducts.length - visibleCount} more)</span>
                  )}
                </button>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#16a34a",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    backgroundColor: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    padding: "8px 20px",
                    borderRadius: 20,
                  }}
                >
                  <span>✓ You've viewed all {filteredProducts.length} products</span>
                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    style={{
                      border: "none",
                      background: "none",
                      color: "#dc2626",
                      fontWeight: 700,
                      cursor: "pointer",
                      textDecoration: "underline",
                      marginLeft: 6,
                    }}
                  >
                    Back to Top ↑
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 🔴 SLIDE-OUT CART DRAWER */}
      {isCartOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 450,
              backgroundColor: "#ffffff",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#ffffff",
              }}
            >
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>Shopping Bag</h3>
                <p style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  {cart.reduce((a, b) => a + b.quantity, 0)} items in your cart
                </p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                style={{
                  border: "none",
                  backgroundColor: "#f1f5f9",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: "1rem",
                  color: "#64748b",
                }}
              >
                ✕
              </button>
            </div>

            {/* Cart Items */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
                  <div style={{ fontSize: "3rem", marginBottom: 12 }}>🛒</div>
                  <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Your cart is empty</h4>
                  <p style={{ fontSize: "0.85rem", marginBottom: 16 }}>Explore our products and add items to begin!</p>
                  <button onClick={() => setIsCartOpen(false)} className="btn-red">
                    Continue Shopping
                  </button>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    style={{
                      display: "flex",
                      gap: 14,
                      padding: "14px 0",
                      borderBottom: "1px solid #f1f5f9",
                      alignItems: "center",
                    }}
                  >
                    <img
                      src={item.product.imageUrl || "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=700"}
                      alt={item.product.name}
                      style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", backgroundColor: "#f8fafc" }}
                    />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: "0.92rem", fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
                        {item.product.name}
                      </h4>
                      <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#dc2626", marginBottom: 8 }}>
                        ₹{((item.product.price * item.quantity) / 100).toLocaleString("en-IN")}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            border: "1px solid #cbd5e1",
                            borderRadius: 6,
                            overflow: "hidden",
                          }}
                        >
                          <button
                            onClick={() => updateCartQty(item.product.id, -1)}
                            style={{ padding: "3px 8px", border: "none", background: "#f8fafc", cursor: "pointer" }}
                          >
                            -
                          </button>
                          <span style={{ padding: "3px 10px", fontSize: "0.85rem", fontWeight: 700 }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateCartQty(item.product.id, 1)}
                            style={{ padding: "3px 8px", border: "none", background: "#f8fafc", cursor: "pointer" }}
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => removeCartItem(item.product.id)}
                          style={{ border: "none", background: "none", color: "#94a3b8", cursor: "pointer", fontSize: "0.8rem" }}
                        >
                          🗑 Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div style={{ padding: "20px 24px", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                    Customer & Shipping Details
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      style={{
                        padding: "8px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: 6,
                        fontSize: "0.85rem",
                        backgroundColor: "#ffffff",
                      }}
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      style={{
                        padding: "8px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: 6,
                        fontSize: "0.85rem",
                        backgroundColor: "#ffffff",
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Shipping Address"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      style={{
                        padding: "8px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: 6,
                        fontSize: "0.85rem",
                        backgroundColor: "#ffffff",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.88rem", color: "#64748b" }}>
                  <span>Delivery:</span>
                  <span style={{ color: "#16a34a", fontWeight: 700 }}>FREE</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>
                  <span>Total Amount:</span>
                  <span style={{ color: "#dc2626" }}>₹{(cartTotalPaise / 100).toLocaleString("en-IN")}</span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={orderProcessing}
                  className="btn-red"
                  style={{ width: "100%", padding: "13px 20px", fontSize: "0.95rem" }}
                >
                  {orderProcessing ? "Generating Order..." : "💳 Pay with Razorpay (Test Mode)"}
                </button>
              </div>
            )}

            {lastOrder && (
              <div style={{ padding: "12px 24px", backgroundColor: "#f0fdf4", borderTop: "1px solid #bbf7d0", fontSize: "0.8rem", color: "#15803d" }}>
                <strong>Order Generated:</strong> {lastOrder.orderId}
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Razorpay ID: {lastOrder.razorpayOrderId}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🔴 QUICK VIEW PRODUCT MODAL */}
      {quickViewProduct && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 16,
              maxWidth: 720,
              width: "100%",
              overflow: "hidden",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              display: "flex",
              flexWrap: "wrap",
              position: "relative",
            }}
          >
            <button
              onClick={() => setQuickViewProduct(null)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "#f1f5f9",
                border: "none",
                width: 32,
                height: 32,
                borderRadius: "50%",
                cursor: "pointer",
                zIndex: 10,
              }}
            >
              ✕
            </button>

            <div style={{ flex: "1 1 300px", minHeight: 320, backgroundColor: "#f8fafc" }}>
              <img
                src={quickViewProduct.imageUrl || "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=700"}
                alt={quickViewProduct.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            <div style={{ flex: "1 1 340px", padding: 32, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#dc2626", textTransform: "uppercase" }}>
                  {quickViewProduct.category}
                </span>
                <h3 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", marginTop: 4, marginBottom: 8 }}>
                  {quickViewProduct.name}
                </h3>
                <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#dc2626", marginBottom: 14 }}>
                  ₹{(quickViewProduct.price / 100).toLocaleString("en-IN")}
                </div>
                <p style={{ color: "#475569", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: 20 }}>
                  {quickViewProduct.description}
                </p>

                <div style={{ backgroundColor: "#f8fafc", padding: "12px 16px", borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 20 }}>
                  <div style={{ fontSize: "0.82rem", color: "#64748b" }}>PostgreSQL Inventory Stock</div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: quickViewProduct.inStock ? "#16a34a" : "#dc2626" }}>
                    {quickViewProduct.inStock ? `✓ ${quickViewProduct.quantityAvailable} units available` : "Out of stock"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => {
                    addToCart(quickViewProduct);
                    setQuickViewProduct(null);
                  }}
                  disabled={!quickViewProduct.inStock || quickViewProduct.quantityAvailable <= 0}
                  className="btn-red"
                  style={{ flex: 1, padding: "12px" }}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 ORDER TRACKER MODAL */}
      {isTrackerOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 16,
              maxWidth: 540,
              width: "100%",
              padding: 32,
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              position: "relative",
            }}
          >
            <button
              onClick={() => setIsTrackerOpen(false)}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                background: "#f1f5f9",
                border: "none",
                width: 32,
                height: 32,
                borderRadius: "50%",
                cursor: "pointer",
              }}
            >
              ✕
            </button>

            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
              📦 Order Status Lookup
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: 20 }}>
              Enter your Order ID to inspect the live PostgreSQL record.
            </p>

            <form onSubmit={handleTrackQuery} style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <input
                type="text"
                placeholder="Paste Order ID..."
                value={trackOrderId}
                onChange={(e) => setTrackOrderId(e.target.value)}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: "0.9rem",
                }}
              />
              <button type="submit" disabled={trackLoading} className="btn-red">
                {trackLoading ? "Searching..." : "Track"}
              </button>
            </form>

            {trackedOrder && (
              <div style={{ backgroundColor: "#f8fafc", padding: 20, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                {trackedOrder.error ? (
                  <div style={{ color: "#dc2626", fontWeight: 600 }}>❌ {trackedOrder.error}</div>
                ) : (
                  <div style={{ fontSize: "0.88rem", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Order ID:</span>
                      <strong style={{ fontFamily: "monospace" }}>{trackedOrder.orderId}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Status:</span>
                      <span className="badge-instock" style={{ textTransform: "uppercase" }}>{trackedOrder.status}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Total:</span>
                      <strong style={{ color: "#dc2626" }}>₹{(trackedOrder.totalAmount / 100).toLocaleString("en-IN")}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Customer:</span>
                      <span>{trackedOrder.customerEmail}</span>
                    </div>
                    {trackedOrder.razorpayOrderId && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#64748b" }}>
                        <span>Razorpay Order:</span>
                        <span style={{ fontFamily: "monospace" }}>{trackedOrder.razorpayOrderId}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🔴 AGENT MCP DRAWER */}
      {isMcpOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 16,
              maxWidth: 720,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: 32,
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              position: "relative",
            }}
          >
            <button
              onClick={() => setIsMcpOpen(false)}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                background: "#f1f5f9",
                border: "none",
                width: 32,
                height: 32,
                borderRadius: "50%",
                cursor: "pointer",
              }}
            >
              ✕
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#16a34a" }}></div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a" }}>
                🤖 Standalone Agent MCP Server
              </h3>
            </div>
            <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 20 }}>
              Listening on <code>http://localhost:8787/mcp</code> (POST). AI agents use these 8 standard tools to query this exact store catalog and place orders.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
              {[
                { name: "search_products", desc: "Search catalog across 99 database products by keywords." },
                { name: "get_product", desc: "Fetch complete product specs and real-time inventory." },
                { name: "get_products_by_category", desc: "Filter by Laptops, Accessories, Audio, etc." },
                { name: "check_inventory", desc: "Real-time stock verification before agent checkout." },
                { name: "create_order", desc: "Reserve stock and generate Razorpay test order." },
                { name: "get_order_status", desc: "Query status of an order by ID." },
                { name: "cancel_order", desc: "Cancel unshipped order and restock inventory." },
                { name: "get_customer_orders", desc: "List order history for a customer." },
              ].map((tool) => (
                <div key={tool.name} style={{ border: "1px solid #e2e8f0", padding: 14, borderRadius: 8, backgroundColor: "#f8fafc" }}>
                  <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#dc2626", marginBottom: 4 }}>
                    {tool.name}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{tool.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 🔴 FOOTER */}
      <footer style={{ borderTop: "1px solid #e2e8f0", backgroundColor: "#ffffff", padding: "40px 24px 20px" }}>
        <div style={{ maxWidth: 1380, margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
          <div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
              NOVA<span style={{ color: "#dc2626" }}>STORE</span>
            </div>
            <p style={{ color: "#64748b", fontSize: "0.85rem", maxWidth: 400 }}>
              Real-Time E-Commerce Storefront & Autonomous Agentic Commerce Platform. Connected to PostgreSQL DB with 99 products and Razorpay Test Mode.
            </p>
          </div>

          <div style={{ display: "flex", gap: 40, fontSize: "0.85rem", color: "#64748b" }}>
            <div>
              <strong style={{ color: "#0f172a", display: "block", marginBottom: 8 }}>Top Categories</strong>
              <div>Laptops (20)</div>
              <div>Accessories (19)</div>
              <div>Monitors (11)</div>
              <div>Audio (11)</div>
            </div>
            <div>
              <strong style={{ color: "#0f172a", display: "block", marginBottom: 8 }}>Architecture</strong>
              <div>Next.js 14 App Router</div>
              <div>Prisma ORM</div>
              <div>PostgreSQL</div>
              <div>Razorpay Test Gateway</div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1380, margin: "30px auto 0", paddingTop: 20, borderTop: "1px solid #f1f5f9", textAlign: "center", fontSize: "0.78rem", color: "#94a3b8" }}>
          © 2026 NovaStore Commerce • Razorpay Ideathon Demo
        </div>
      </footer>
    </div>
  );
}
