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

type OrderItemDTO = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string | null;
};

type OrderDTO = {
  orderId: string;
  status: string;
  totalAmount: number;
  currency: string;
  customerEmail: string;
  customerName?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  createdAt: string;
  items: OrderItemDTO[];
};

type ActiveTrackingOrder = {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  items: OrderItemDTO[];
  currentStep: number; // 1 to 4
  placedAt: string;
  estimatedDelivery: string;
  trackingNumber: string;
  carrier: string;
};

const PAGE_SIZE = 12;

// Fallback image helper
function getDisplayImage(name: string, category: string, imageUrl?: string | null) {
  if (imageUrl && imageUrl.trim()) return imageUrl;
  const n = name.toLowerCase();
  if (category.toLowerCase() === "laptops" || n.includes("book")) {
    return "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&auto=format&fit=crop&q=80";
  }
  if (category.toLowerCase() === "audio" || n.includes("headphone") || n.includes("buds")) {
    return "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80";
  }
  if (category.toLowerCase() === "gaming" || n.includes("keyboard")) {
    return "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80";
  }
  if (n.includes("mouse")) {
    return "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80";
  }
  return "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&auto=format&fit=crop&q=80";
}

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("featured");
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);

  // Active View: 'store' | 'orders' | 'mcp'
  const [activeView, setActiveView] = useState<"store" | "orders" | "mcp">("store");

  // Orders Dashboard state
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
  const [ordersFilter, setOrdersFilter] = useState<string>("all");

  // Pagination
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

  // Quick View Modal
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Live Tracking Modal & state
  const [activeTracking, setActiveTracking] = useState<ActiveTrackingOrder | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
    loadRazorpayScript();
  }, []);

  // Poll for new orders every 7 seconds if on orders view
  useEffect(() => {
    if (activeView === "orders") {
      const interval = setInterval(() => {
        fetchOrders(false);
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [activeView]);

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

  const fetchOrders = async (showLoading = true) => {
    try {
      if (showLoading) setOrdersLoading(true);
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      if (showLoading) setOrdersLoading(false);
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

  // Filtered Products
  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== "all") {
      list = list.filter((p) => p.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (inStockOnly) {
      list = list.filter((p) => p.inStock && p.quantityAvailable > 0);
    }

    if (sortBy === "price-low") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === "name-asc") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [products, searchQuery, selectedCategory, inStockOnly, sortBy]);

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

  // Open live tracker for any order
  const openOrderTracker = (order: OrderDTO | ActiveTrackingOrder) => {
    const isDTO = "createdAt" in order;
    const items = order.items.map((it) => ({
      ...it,
      imageUrl: getDisplayImage(it.name, "", it.imageUrl),
    }));

    setActiveTracking({
      orderId: order.orderId,
      razorpayOrderId: order.razorpayOrderId || "order_verified",
      razorpayPaymentId: order.razorpayPaymentId || "pay_verified",
      totalAmount: order.totalAmount,
      customerName: (order as any).customerName || customerName,
      customerEmail: (order as any).customerEmail || customerEmail,
      customerAddress: (order as any).customerAddress || customerAddress,
      items: items,
      currentStep: order.status === "DELIVERED" ? 4 : order.status === "SHIPPED" ? 3 : 2,
      placedAt: isDTO
        ? new Date((order as OrderDTO).createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : (order as ActiveTrackingOrder).placedAt,
      estimatedDelivery: "Tomorrow by 5:00 PM",
      trackingNumber: `BD-${order.orderId.slice(-6).toUpperCase()}`,
      carrier: "BlueDart Express Courier",
    });
    setIsTrackingModalOpen(true);
  };

  // Razorpay Checkout
  const handleCheckout = async () => {
    if (!cart.length) return;
    if (!customerEmail.trim()) {
      alert("Please enter customer email");
      return;
    }

    const orderedItemsSnapshot: OrderItemDTO[] = cart.map((i) => ({
      productId: i.product.id,
      name: i.product.name,
      quantity: i.quantity,
      unitPrice: i.product.price,
      imageUrl: getDisplayImage(i.product.name, i.product.category, i.product.imageUrl),
    }));

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

      setCart([]);

      const completeOrder = async (paymentId: string) => {
        try {
          await fetch(`/api/orders/${data.orderId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayPaymentId: paymentId,
              razorpayOrderId: data.razorpayOrderId,
            }),
          });
        } catch (e) {
          console.error("Failed to mark order paid:", e);
        }

        // Refresh orders list
        await fetchOrders(false);

        // Open tracking modal
        setActiveTracking({
          orderId: data.orderId,
          razorpayOrderId: data.razorpayOrderId,
          razorpayPaymentId: paymentId,
          totalAmount: data.totalAmount,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerAddress: customerAddress.trim(),
          items: orderedItemsSnapshot,
          currentStep: 2,
          placedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          estimatedDelivery: "Tomorrow by 5:00 PM",
          trackingNumber: `BD-${data.orderId.slice(-6).toUpperCase()}`,
          carrier: "BlueDart Express Courier",
        });

        setIsCartOpen(false);
        setIsTrackingModalOpen(true);
      };

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
            completeOrder(response.razorpay_payment_id);
          },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        completeOrder(`pay_test_${Date.now()}`);
      }
    } catch (err: any) {
      alert(`Checkout failed: ${err.message}`);
    } finally {
      setOrderProcessing(false);
    }
  };

  const advanceStep = () => {
    if (!activeTracking) return;
    setActiveTracking((prev) => {
      if (!prev) return null;
      const nextStep = prev.currentStep < 4 ? prev.currentStep + 1 : 1;
      return { ...prev, currentStep: nextStep };
    });
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    if (ordersFilter === "all") return orders;
    return orders.filter((o) => o.status.toLowerCase() === ordersFilter.toLowerCase());
  }, [orders, ordersFilter]);

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
          <span>🚚 <strong>FREE EXPRESS SHIPPING</strong> on all orders above ₹999</span>
          <span style={{ opacity: 0.7 }}>•</span>
          <span>100% Genuine Certified Tech</span>
          <span style={{ opacity: 0.7 }}>•</span>
          <span>Instant 1-Year Official Brand Warranty</span>
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
            onClick={() => setActiveView("store")}
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

          {/* Navigation View Switcher Tabs */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => setActiveView("store")}
              className={activeView === "store" ? "btn-red" : "btn-white"}
              style={{ padding: "9px 18px", fontSize: "0.88rem" }}
            >
              🛍️ Store Catalog
            </button>

            {/* Dedicated Track Orders Page Button */}
            <button
              onClick={() => {
                setActiveView("orders");
                fetchOrders(true);
              }}
              className={activeView === "orders" ? "btn-red" : "btn-white"}
              style={{
                padding: "9px 18px",
                fontSize: "0.88rem",
                position: "relative",
                borderColor: activeView === "orders" ? "#dc2626" : "#fecaca",
                color: activeView === "orders" ? "#ffffff" : "#b91c1c",
              }}
            >
              📦 Track Orders ({orders.length})
              {orders.length > 0 && (
                <span
                  style={{
                    backgroundColor: activeView === "orders" ? "#ffffff" : "#dc2626",
                    color: activeView === "orders" ? "#dc2626" : "#ffffff",
                    borderRadius: "50%",
                    width: 20,
                    height: 20,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    marginLeft: 6,
                  }}
                >
                  {orders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveView("mcp")}
              className={activeView === "mcp" ? "btn-red" : "btn-white"}
              style={{ padding: "9px 18px", fontSize: "0.88rem" }}
            >
              🤖 Agent MCP
            </button>
          </div>

          {/* Search & Cart Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {activeView === "store" && (
              <div style={{ position: "relative", width: 260 }}>
                <input
                  type="text"
                  placeholder="Quick search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 14px",
                    border: "1px solid #cbd5e1",
                    borderRadius: 8,
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              className="btn-red"
              style={{ padding: "10px 18px" }}
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

        {/* Categories Bar (Only on Storefront view) */}
        {activeView === "store" && (
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
        )}
      </header>

      {/* =========================================================================
          VIEW 1: FULL-PAGE TRACK & VIEW ALL ORDERS DASHBOARD
          ========================================================================= */}
      {activeView === "orders" && (
        <main style={{ maxWidth: 1380, margin: "28px auto", padding: "0 24px 80px" }}>
          {/* Header Bar */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: "28px 32px",
              marginBottom: 28,
              boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 20,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: "1.6rem" }}>📦</span>
                <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a" }}>
                  My Orders & Live Delivery Tracking
                </h2>
                <span className="badge-instock" style={{ marginLeft: 6 }}>
                  ✓ Official Orders
                </span>
              </div>
              <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
                Track the live dispatch and delivery status of all your purchases. Click any order to view its real-time tracking animation!
              </p>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button
                onClick={() => fetchOrders(true)}
                disabled={ordersLoading}
                className="btn-white"
                style={{ fontSize: "0.85rem" }}
              >
                {ordersLoading ? "🔄 Refreshing..." : "🔄 Refresh Orders"}
              </button>

              <button onClick={() => setActiveView("store")} className="btn-red" style={{ fontSize: "0.85rem" }}>
                🛍️ Continue Shopping
              </button>
            </div>
          </div>

          {/* Orders Filter Tabs */}
          <div style={{ display: "flex", gap: 10, marginBottom: 24, alignItems: "center" }}>
            <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#475569" }}>Filter Orders:</span>
            {[
              { id: "all", label: "All Orders" },
              { id: "paid", label: "Paid / Confirmed" },
              { id: "pending", label: "Pending" },
              { id: "shipped", label: "In Transit" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setOrdersFilter(tab.id)}
                className={`category-pill ${ordersFilter === tab.id ? "active" : ""}`}
                style={{ fontSize: "0.82rem", padding: "6px 14px" }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Orders List / Empty State */}
          {ordersLoading && orders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#64748b" }}>
              <div style={{ fontSize: "2rem", marginBottom: 12 }}>⏳</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>Loading your orders from database...</div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "80px 24px",
                backgroundColor: "#ffffff",
                borderRadius: 16,
                border: "1px dashed #cbd5e1",
              }}
            >
              <div style={{ fontSize: "3rem", marginBottom: 12 }}>📦</div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
                No orders found
              </h3>
              <p style={{ color: "#64748b", marginBottom: 20 }}>
                You haven't placed any orders yet, or no orders match the selected filter.
              </p>
              <button onClick={() => setActiveView("store")} className="btn-red">
                Explore 99 Tech Products
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {filteredOrders.map((order, idx) => {
                const isPaid = order.status === "PAID";
                const isLatest = idx === 0;

                return (
                  <div
                    key={order.orderId}
                    style={{
                      backgroundColor: "#ffffff",
                      border: isLatest ? "2px solid #fca5a5" : "1px solid #e2e8f0",
                      borderRadius: 16,
                      overflow: "hidden",
                      boxShadow: isLatest ? "0 8px 24px rgba(220, 38, 38, 0.08)" : "0 2px 8px rgba(0,0,0,0.03)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {/* Order Card Top Bar */}
                    <div
                      style={{
                        padding: "16px 24px",
                        backgroundColor: "#f8fafc",
                        borderBottom: "1px solid #e2e8f0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 14,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                            Order ID
                          </div>
                          <div style={{ fontFamily: "monospace", fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
                            {order.orderId}
                          </div>
                        </div>

                        {isLatest && (
                          <span className="badge-deal" style={{ position: "static", borderRadius: 12 }}>
                            NEW ORDER
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                            Order Date
                          </div>
                          <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#334155" }}>
                            {new Date(order.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            at{" "}
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                            Total Paid
                          </div>
                          <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#dc2626" }}>
                            ₹{(order.totalAmount / 100).toLocaleString("en-IN")}
                          </div>
                        </div>

                        <div>
                          <span
                            className={isPaid ? "badge-instock" : "badge-lowstock"}
                            style={{ padding: "6px 14px", fontSize: "0.82rem", textTransform: "uppercase" }}
                          >
                            {order.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Order Card Content */}
                    <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
                      {/* Items previews */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, minWidth: 280 }}>
                        {order.items.map((it, itemIdx) => {
                          const img = getDisplayImage(it.name, "", it.imageUrl);
                          return (
                            <div key={itemIdx} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                              <img
                                src={img}
                                alt={it.name}
                                style={{
                                  width: 60,
                                  height: 60,
                                  borderRadius: 8,
                                  objectFit: "cover",
                                  border: "1px solid #e2e8f0",
                                  backgroundColor: "#f8fafc",
                                }}
                              />
                              <div>
                                <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
                                  {it.name}
                                </h4>
                                <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
                                  Qty: <strong>{it.quantity}</strong> × ₹{(it.unitPrice / 100).toLocaleString("en-IN")}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Payment & Recipient Info */}
                      <div style={{ minWidth: 240, fontSize: "0.85rem", color: "#475569", borderLeft: "1px solid #f1f5f9", paddingLeft: 20 }}>
                        <div><strong>Recipient:</strong> {order.customerName || "Alex Mercer"}</div>
                        <div><strong>Email:</strong> {order.customerEmail}</div>
                        {order.razorpayPaymentId && (
                          <div style={{ marginTop: 4, color: "#16a34a", fontSize: "0.8rem" }}>
                            ✓ Razorpay Ref: <code style={{ color: "#0f172a" }}>{order.razorpayPaymentId}</code>
                          </div>
                        )}
                        <div style={{ marginTop: 6, fontSize: "0.78rem", color: "#64748b" }}>
                          🚚 Carrier: BlueDart Express (BD-{order.orderId.slice(-6).toUpperCase()})
                        </div>
                      </div>

                      {/* Action Button: Launch Live Tracking Animation */}
                      <div>
                        <button
                          onClick={() => openOrderTracker(order)}
                          className="btn-red"
                          style={{
                            padding: "12px 22px",
                            fontSize: "0.9rem",
                            borderRadius: 10,
                            boxShadow: "0 4px 14px rgba(220, 38, 38, 0.25)",
                          }}
                        >
                          🚚 View Live Tracking Animation
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* =========================================================================
          VIEW 2: STOREFRONT CATALOG VIEW
          ========================================================================= */}
      {activeView === "store" && (
        <div>
          {/* Hero Banner */}
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
                  ★ OFFICIAL STORE • MEGA TECH FEST
                </div>
                <h2 style={{ fontSize: "2.3rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.2, marginBottom: 12 }}>
                  Next-Gen Tech, <span style={{ color: "#dc2626" }}>Ultra Performance</span>
                </h2>
                <p style={{ color: "#475569", fontSize: "1rem", lineHeight: 1.6, marginBottom: 20 }}>
                  Discover flagship ultrabooks, 4K curved displays, tactile mechanical keyboards, studio audio gear, and high-speed GaN chargers with express home delivery across India.
                </p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button onClick={() => setSelectedCategory("Laptops")} className="btn-red">
                    💻 Shop Laptops ({categoryCounts["laptops"] || 20})
                  </button>
                  <button onClick={() => setSelectedCategory("Accessories")} className="btn-white">
                    🔌 Tech Accessories ({categoryCounts["accessories"] || 19})
                  </button>
                  <button onClick={() => setActiveView("orders")} className="btn-red-outline">
                    📦 Track My Orders ({orders.length})
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
                  <span style={{ fontSize: "0.9rem", color: "#334155", fontWeight: 600 }}>100% Genuine Certified Tech</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#16a34a", fontSize: "1.2rem" }}>✓</span>
                  <span style={{ fontSize: "0.9rem", color: "#334155", fontWeight: 600 }}>Free Express Delivery Across India</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#16a34a", fontSize: "1.2rem" }}>✓</span>
                  <span style={{ fontSize: "0.9rem", color: "#334155", fontWeight: 600 }}>1-Year Official Brand Warranty</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#16a34a", fontSize: "1.2rem" }}>✓</span>
                  <span style={{ fontSize: "0.9rem", color: "#334155", fontWeight: 600 }}>7-Day Easy Replacement Policy</span>
                </div>
              </div>
            </div>
          </section>

          {/* Product Grid Section */}
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
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.88rem", color: "#334155", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    style={{ accentColor: "#dc2626", width: 16, height: 16 }}
                  />
                  In Stock Only
                </label>

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

            {/* Grid */}
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
                    const img = getDisplayImage(p.name, p.category, p.imageUrl);

                    return (
                      <div key={p.id} className="product-card">
                        {hasDiscount && <span className="badge-deal">SPECIAL DEAL</span>}

                        <div
                          className="product-image-container"
                          onClick={() => setQuickViewProduct(p)}
                          style={{ cursor: "pointer" }}
                        >
                          <img src={img} alt={p.name} loading="lazy" />
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

                {/* Progressive Load More Section */}
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
        </div>
      )}

      {/* =========================================================================
          VIEW 3: AGENT MCP EXPLORER VIEW
          ========================================================================= */}
      {activeView === "mcp" && (
        <main style={{ maxWidth: 1380, margin: "28px auto", padding: "0 24px 80px" }}>
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: "32px",
              marginBottom: 28,
              boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a" }}>
                  🤖 Autonomous Agentic Commerce MCP Server
                </h2>
                <p style={{ color: "#64748b", fontSize: "0.95rem", marginTop: 4 }}>
                  Endpoint: <code>http://localhost:8787/mcp</code> (POST) • Transport: Streamable HTTP
                </p>
              </div>
              <span className="badge-instock" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
                8 Tools Operational
              </span>
            </div>
            <p style={{ color: "#334155", lineHeight: 1.6 }}>
              Any MCP-compatible AI agent (Claude, Cursor, custom LangChain/LangGraph orchestrators) can query catalog items, place orders, and check inventory using these standard tools. All purchases update PostgreSQL in real time!
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
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
              <div
                key={tool.name}
                style={{
                  border: "1px solid #e2e8f0",
                  padding: 20,
                  borderRadius: 12,
                  backgroundColor: "#ffffff",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                }}
              >
                <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#dc2626", fontSize: "1rem", marginBottom: 6 }}>
                  {tool.name}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.5 }}>{tool.desc}</div>
              </div>
            ))}
          </div>
        </main>
      )}

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

            {/* Items */}
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
                      src={getDisplayImage(item.product.name, item.product.category, item.product.imageUrl)}
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

            {/* Footer */}
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
                  {orderProcessing ? "Processing Secure Order..." : "💳 Pay Securely with Razorpay"}
                </button>
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
                src={getDisplayImage(quickViewProduct.name, quickViewProduct.category, quickViewProduct.imageUrl)}
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
                  <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Stock & Delivery Status</div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: quickViewProduct.inStock ? "#16a34a" : "#dc2626" }}>
                    {quickViewProduct.inStock ? `✓ In Stock • Ready to dispatch in 24 hours (${quickViewProduct.quantityAvailable} units available)` : "Currently Out of Stock"}
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

      {/* 🔴 🚚 LIVE ANIMATED ORDER TRACKER MODAL */}
      {isTrackingModalOpen && activeTracking && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            overflowY: "auto",
          }}
        >
          <div
            className="modal-bounce-in"
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 20,
              maxWidth: 780,
              width: "100%",
              boxShadow: "0 25px 60px -12px rgba(0,0,0,0.3)",
              position: "relative",
              overflow: "hidden",
              border: "1px solid #fee2e2",
            }}
          >
            {/* Top Red Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)",
                color: "#ffffff",
                padding: "24px 32px",
                position: "relative",
              }}
            >
              <button
                onClick={() => setIsTrackingModalOpen(false)}
                style={{
                  position: "absolute",
                  top: 20,
                  right: 20,
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  cursor: "pointer",
                  color: "#ffffff",
                  fontSize: "1rem",
                  fontWeight: 700,
                }}
              >
                ✕
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#dc2626",
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.4rem",
                    fontWeight: 900,
                    boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                  }}
                >
                  ✓
                </div>
                <div>
                  <h3 style={{ fontSize: "1.45rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                    Order Confirmed & Verified! 🎉
                  </h3>
                  <p style={{ fontSize: "0.85rem", opacity: 0.9 }}>
                    Thank you for shopping with NovaStore. Your order is being processed in real time.
                  </p>
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  fontSize: "0.8rem",
                  backgroundColor: "rgba(0,0,0,0.15)",
                  padding: "8px 16px",
                  borderRadius: 8,
                }}
              >
                <span>Order ID: <strong style={{ fontFamily: "monospace" }}>{activeTracking.orderId}</strong></span>
                <span>•</span>
                <span>Payment Ref: <strong style={{ fontFamily: "monospace" }}>{activeTracking.razorpayPaymentId || "Captured"}</strong></span>
                <span>•</span>
                <span>Placed At: <strong>{activeTracking.placedAt}</strong></span>
              </div>
            </div>

            {/* Stepper Timeline & Details */}
            <div style={{ padding: "28px 32px" }}>
              {/* Animated Journey Timeline */}
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                  padding: "24px 20px",
                  marginBottom: 24,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="animated-truck" style={{ fontSize: "1.4rem" }}>🚚</span>
                    <h4 style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                      Live Package Journey
                    </h4>
                  </div>

                  <button
                    onClick={advanceStep}
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      backgroundColor: "#ffffff",
                      border: "1px solid #cbd5e1",
                      color: "#334155",
                      padding: "5px 12px",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    Simulate Next Stage ⏭️
                  </button>
                </div>

                {/* Progress bar */}
                <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div
                    style={{
                      position: "absolute",
                      top: 20,
                      left: 30,
                      right: 30,
                      height: 4,
                      backgroundColor: "#e2e8f0",
                      zIndex: 1,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width:
                          activeTracking.currentStep === 1
                            ? "0%"
                            : activeTracking.currentStep === 2
                            ? "33%"
                            : activeTracking.currentStep === 3
                            ? "66%"
                            : "100%",
                        backgroundColor: "#dc2626",
                        transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                      className={activeTracking.currentStep < 4 ? "dashed-progress-line" : ""}
                    ></div>
                  </div>

                  {/* Step 1 */}
                  <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", width: 90 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        backgroundColor: activeTracking.currentStep >= 1 ? "#16a34a" : "#cbd5e1",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      }}
                      className={activeTracking.currentStep === 1 ? "step-node-active" : "step-node-done"}
                    >
                      ✓
                    </div>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", marginTop: 8, textAlign: "center" }}>
                      Payment Verified
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "#64748b" }}>Instant</span>
                  </div>

                  {/* Step 2 */}
                  <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", width: 100 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        backgroundColor:
                          activeTracking.currentStep > 2
                            ? "#16a34a"
                            : activeTracking.currentStep === 2
                            ? "#dc2626"
                            : "#cbd5e1",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      }}
                      className={activeTracking.currentStep === 2 ? "step-node-active" : activeTracking.currentStep > 2 ? "step-node-done" : ""}
                    >
                      📦
                    </div>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", marginTop: 8, textAlign: "center" }}>
                      Packing & QC
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                      {activeTracking.currentStep === 2 ? "In Progress..." : "Completed"}
                    </span>
                  </div>

                  {/* Step 3 */}
                  <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", width: 110 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        backgroundColor:
                          activeTracking.currentStep > 3
                            ? "#16a34a"
                            : activeTracking.currentStep === 3
                            ? "#dc2626"
                            : "#cbd5e1",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      }}
                      className={activeTracking.currentStep === 3 ? "step-node-active" : activeTracking.currentStep > 3 ? "step-node-done" : ""}
                    >
                      🚚
                    </div>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", marginTop: 8, textAlign: "center" }}>
                      Dispatched
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                      {activeTracking.currentStep === 3 ? "On the Way" : activeTracking.currentStep > 3 ? "Dispatched" : "Pending"}
                    </span>
                  </div>

                  {/* Step 4 */}
                  <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", width: 90 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        backgroundColor: activeTracking.currentStep === 4 ? "#16a34a" : "#cbd5e1",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      }}
                      className={activeTracking.currentStep === 4 ? "step-node-done" : ""}
                    >
                      🏠
                    </div>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", marginTop: 8, textAlign: "center" }}>
                      Delivered
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                      {activeTracking.currentStep === 4 ? "Delivered!" : "Estimated: Tomorrow"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery Partner Banner */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 16,
                  backgroundColor: "#fff1f2",
                  border: "1px solid #fecaca",
                  padding: "16px 20px",
                  borderRadius: 12,
                  marginBottom: 24,
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#b91c1c", textTransform: "uppercase" }}>
                    Delivery Partner
                  </div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
                    {activeTracking.carrier} • <span style={{ fontFamily: "monospace" }}>{activeTracking.trackingNumber}</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Latest Status: Package scanned at Indiranagar Fulfillment Center
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Expected Delivery</div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#dc2626" }}>
                    {activeTracking.estimatedDelivery}
                  </div>
                </div>
              </div>

              {/* Items & Shipping Info */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 24 }}>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                  <h5 style={{ fontSize: "0.88rem", fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
                    Items in this Order ({activeTracking.items.length})
                  </h5>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 180, overflowY: "auto" }}>
                    {activeTracking.items.map((it, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <img
                          src={getDisplayImage(it.name, "", it.imageUrl)}
                          alt={it.name}
                          style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover", backgroundColor: "#f8fafc" }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>{it.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                            Qty: {it.quantity} × ₹{(it.unitPrice / 100).toLocaleString("en-IN")}
                          </div>
                        </div>
                        <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#dc2626" }}>
                          ₹{((it.unitPrice * it.quantity) / 100).toLocaleString("en-IN")}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                    <span>Total Paid:</span>
                    <span style={{ color: "#dc2626", fontSize: "1.05rem" }}>
                      ₹{(activeTracking.totalAmount / 100).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                  <h5 style={{ fontSize: "0.88rem", fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
                    Shipping & Recipient Details
                  </h5>
                  <div style={{ fontSize: "0.85rem", color: "#334155", lineHeight: 1.6 }}>
                    <div><strong>Recipient:</strong> {activeTracking.customerName}</div>
                    <div><strong>Email:</strong> {activeTracking.customerEmail}</div>
                    <div><strong>Address:</strong> {activeTracking.customerAddress}</div>
                    <div style={{ marginTop: 8, fontSize: "0.8rem", color: "#16a34a" }}>
                      ✓ Order status notifications sent to {activeTracking.customerEmail}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  onClick={() => {
                    setIsTrackingModalOpen(false);
                    setActiveView("orders");
                  }}
                  className="btn-white"
                  style={{ fontSize: "0.85rem" }}
                >
                  📦 View All My Orders ({orders.length})
                </button>

                <button
                  onClick={() => setIsTrackingModalOpen(false)}
                  className="btn-red"
                  style={{ fontSize: "0.85rem" }}
                >
                  Close Tracker
                </button>
              </div>
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
              <strong style={{ color: "#0f172a", display: "block", marginBottom: 8 }}>Navigation</strong>
              <div style={{ cursor: "pointer", marginBottom: 4 }} onClick={() => setActiveView("store")}>Store Catalog (99)</div>
              <div style={{ cursor: "pointer", marginBottom: 4 }} onClick={() => setActiveView("orders")}>Track Orders ({orders.length})</div>
              <div style={{ cursor: "pointer" }} onClick={() => setActiveView("mcp")}>Agent MCP Tools (8)</div>
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
