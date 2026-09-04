import { Product, MerchantPolicy, Transaction, AuditEvent } from '@/lib/types';
import { INITIAL_PRODUCTS } from '@/lib/mock-data/products';
import { DEFAULT_POLICY } from '@/lib/mock-data/policies';
import { INITIAL_AUDIT_EVENTS } from '@/lib/mock-data/audit';
import { INITIAL_TRANSACTIONS } from '@/lib/mock-data/transactions';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';
export const STORE_BASE = process.env.NEXT_PUBLIC_STORE_URL || 'https://ai-growth-agentic-commerce-production.up.railway.app';

interface BackendProductItem {
  product_id?: number;
  id?: number;
  product_name?: string;
  name?: string;
  category?: string;
  price_inr?: number;
  price?: number;
  stock_quantity?: number;
  stock?: number;
  tags?: string[];
  description?: string;
}

interface BackendPolicyResponse {
  max_transaction_inr?: number;
  approval_threshold_inr?: number;
  allowed_categories?: string[];
  is_active?: boolean;
}

interface BackendAuditItem {
  id: number | string;
  created_at: string;
  actor_type: string;
  action: string;
  reason?: string;
  amount_inr?: number;
  status?: string;
}

interface BackendOrderItem {
  product_id: number;
  product_name: string;
  unit_price_inr: number;
  quantity: number;
}

interface BackendOrderResponse {
  order_id: number;
  buyer_id?: string;
  subtotal_inr: number;
  total_inr: number;
  status: string;
  policy_allowed: boolean;
  policy_reason?: string;
  created_at: string;
  items?: BackendOrderItem[];
  transaction?: {
    id: number;
    status: string;
    provider_reference?: string;
  };
}

export interface PaymentOrderResponse {
  success: boolean;
  order_id: number;
  razorpay_order_id: string;
  amount: number;
  amount_inr: number;
  currency: string;
  key_id: string;
  status: string;
  receipt: string;
}

export interface PaymentVerifyResponse {
  success: boolean;
  status: string;
  transaction_id: number;
  order_id: number;
  amount_inr: number;
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  signature_valid?: boolean;
  message: string;
}

export interface RailwayOrderResponse {
  orderId?: string;
  id?: string;
  status?: string;
  totalAmount?: number;
  currency?: string;
  razorpayOrderId?: string;
  razorpayKeyId?: string;
  [key: string]: unknown;
}

/**
 * Robust API helper with error handling and fallback support.
 */
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    }
  });
  if (!res.ok) {
    const errorBody = (await res.json().catch(() => ({ detail: res.statusText }))) as { detail?: string | object };
    const errorMsg = typeof errorBody.detail === 'string' ? errorBody.detail : JSON.stringify(errorBody.detail || errorBody);
    throw new Error(errorMsg || `HTTP error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const AGENT_BASE = process.env.NEXT_PUBLIC_AGENT_URL || '/api';

export interface AgentChatResponse {
  status: string;
  message: string;
  merchant_id: number;
  selected_product?: {
    product_id: number;
    product_name: string;
    price_inr: number;
    category?: string;
    stock_quantity?: number;
    description?: string;
    tags?: string[];
  };
  recommendations: Array<{
    id?: number;
    product_id?: number;
    name?: string;
    product_name?: string;
    price_inr: number;
    reason: string;
    source: string;
    stock?: number;
    stock_quantity?: number;
  }>;
  cart: Array<{
    product_id: number;
    product_name: string;
    price_inr: number;
    quantity: number;
    is_upsell?: boolean;
  }>;
  subtotal_inr: number;
  total_inr: number;
  policy_result?: {
    allowed: boolean;
    reason: string;
    max_transaction_inr: number;
  };
  order_id?: number;
  payment_info?: {
    razorpay_order_id?: string;
    amount?: number;
    key_id?: string;
    currency?: string;
  };
  next_action?: string;
}

export interface StructuredBuyerPayload {
  buyer_id?: string;
  intent: string;
  category: string;
  budget_inr: number;
  preferences?: {
    use_case?: string;
    priority?: string;
  };
}

export interface CuratedPromptResult {
  search_query: string;
  category: string;
  budget_inr?: number;
  use_case: string;
  priority_feature: string;
  intent: string;
  structured_request: StructuredBuyerPayload;
}

export interface RawOrderItem {
  id?: string;
  productId?: string;
  product_id?: number;
  productName?: string;
  product_name?: string;
  unitPrice?: number;
  unit_price_inr?: number;
  price?: number;
  quantity?: number;
  name?: string;
  product?: { id?: string; name?: string; price?: number };
}

export interface RawOrder {
  id?: string;
  order_id?: number;
  customerId?: string;
  buyer_id?: string;
  totalAmount?: number;
  total_inr?: number;
  subtotal_inr?: number;
  status?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt?: string;
  created_at?: string;
  policy_reason?: string;
  customer?: { name?: string; email?: string };
  items?: RawOrderItem[];
  transaction?: {
    status?: string;
    provider_reference?: string;
  };
}

export const apiService = {
  async chatAgent(payload: {
    message?: string;
    merchant_id?: number;
    buyer_id?: string;
    buyer_decision?: string;
    context?: Record<string, unknown>;
    request_id?: string;
    structured_request?: StructuredBuyerPayload;
  }): Promise<AgentChatResponse> {
    return fetchJson<AgentChatResponse>(`${AGENT_BASE}/agent/chat`, {
      method: 'POST',
      body: JSON.stringify({
        message: payload.message,
        merchant_id: payload.merchant_id || 1,
        buyer_id: payload.buyer_id || 'demo-ai-buyer',
        buyer_decision: payload.buyer_decision,
        context: payload.context,
        request_id: payload.request_id,
        structured_request: payload.structured_request
      })
    });
  },

  async getProducts(): Promise<Product[]> {
    try {
      // 1. Try fetching from live Railway E-Commerce Store
      try {
        const storeRes = await fetch(`${STORE_BASE}/api/products`);
        if (storeRes.ok) {
          const storeData = await storeRes.json();
          const items = Array.isArray(storeData) ? storeData : storeData.products || [];
          if (items.length > 0) {
            return items.map((item: BackendProductItem & { imageUrl?: string; inStock?: boolean; quantityAvailable?: number }) => {
              const rawPrice = Number(item.price || item.price_inr || 0);
              const priceInr = item.price !== undefined ? rawPrice / 100 : rawPrice;
              const stock = Number(item.quantityAvailable ?? item.stock_quantity ?? item.stock ?? 10);
              return {
                id: String(item.id || item.product_id),
                name: String(item.name || item.product_name || 'Product'),
                category: String(item.category || 'Electronics'),
                price: priceInr,
                stock: stock,
                compatibleProducts: [item.category || 'Accessories'],
                frequentlyBoughtWith: [],
                agentReadableStatus: stock > 10 ? 'Available' : stock > 0 ? 'Low Stock' : 'Out of Stock',
                description: item.description || '',
                specifications: { image: item.imageUrl || '' }
              };
            });
          }
        }
      } catch (storeErr) {
        console.warn('Live store query failed, falling back to local backend:', storeErr);
      }

      // 2. Fallback to local FastAPI backend
      const data = await fetchJson<{ items: BackendProductItem[] }>(`${API_BASE}/products?limit=100`);
      if (data && data.items && data.items.length > 0) {
        return data.items.map((item) => {
          const rawTags = typeof item.tags === 'string'
            ? (item.tags as string).split(',').map((t: string) => t.trim()).filter(Boolean)
            : Array.isArray(item.tags)
            ? item.tags
            : [];
          return {
            id: String(item.product_id || item.id),
            name: item.product_name || item.name || 'Product',
            category: item.category || 'Electronics',
            price: Number(item.price_inr || item.price || 0),
            stock: Number(item.stock_quantity || item.stock || 0),
            compatibleProducts: rawTags,
            frequentlyBoughtWith: [],
            agentReadableStatus: ((item.stock_quantity || item.stock || 0) > 10) ? 'Available' : ((item.stock_quantity || item.stock || 0) > 0) ? 'Low Stock' : 'Out of Stock',
            description: item.description || '',
            specifications: {}
          };
        });
      }
    } catch (e) {
      console.warn('Could not fetch products from backend, using default initial catalog:', e);
    }
    return INITIAL_PRODUCTS;
  },

  async getPolicy(merchantId: number = 1): Promise<MerchantPolicy> {
    try {
      const data = await fetchJson<BackendPolicyResponse>(`${API_BASE}/policies?merchant_id=${merchantId}`);
      if (data) {
        return {
          maxTransactionLimit: Number(data.max_transaction_inr || 70000),
          approvalThreshold: Number(data.approval_threshold_inr || 60000),
          allowedCategories: data.allowed_categories || ['Laptops', 'Peripherals', 'Accessories', 'Electronics'],
          status: data.is_active ? 'Active' : 'Paused',
          catalogRequired: true
        };
      }
    } catch (e) {
      console.warn('Could not fetch policy from backend, using default:', e);
    }
    return DEFAULT_POLICY;
  },

  async checkPolicy(
    amountInr: number,
    merchantId: number = 1,
    limits?: { maxLimit?: number; approvalThreshold?: number }
  ): Promise<{
    allowed: boolean;
    requiresApproval: boolean;
    isAutonomous: boolean;
    reason: string;
    maxLimit: number;
    approvalThreshold: number;
  }> {
    try {
      const data = await fetchJson<{
        allowed: boolean;
        requires_approval?: boolean;
        is_autonomous?: boolean;
        reason: string;
        max_transaction_inr: number;
        approval_threshold_inr?: number;
      }>(`${API_BASE}/policies/check`, {
        method: 'POST',
        body: JSON.stringify({
          merchant_id: merchantId,
          amount_inr: amountInr,
          max_limit: limits?.maxLimit,
          approval_threshold: limits?.approvalThreshold
        })
      });
      return {
        allowed: data.allowed,
        requiresApproval: Boolean(data.requires_approval),
        isAutonomous: Boolean(data.is_autonomous),
        reason: data.reason,
        maxLimit: data.max_transaction_inr,
        approvalThreshold: data.approval_threshold_inr || 5000
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('Policy check network error:', e);
      return {
        allowed: false,
        requiresApproval: false,
        isAutonomous: false,
        reason: `Policy check unavailable (Fail-Closed): ${msg}`,
        maxLimit: 0,
        approvalThreshold: 0
      };
    }
  },

  async createOrder(merchantId: number, buyerId: string, items: Array<{ product_id: number | string; quantity: number }>): Promise<BackendOrderResponse> {
    return fetchJson<BackendOrderResponse>(`${API_BASE}/orders`, {
      method: 'POST',
      body: JSON.stringify({ merchant_id: merchantId, buyer_id: buyerId, items })
    });
  },

  async createRailwayOrder(customerEmail: string, customerName: string, items: Array<{ productId: string; quantity: number; name?: string }>): Promise<RailwayOrderResponse | null> {
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerEmail, customerName, items })
      });
      if (res.ok) {
        return (await res.json()) as RailwayOrderResponse;
      } else {
        const errText = await res.text();
        console.error('createRailwayOrder proxy error response:', res.status, errText);
      }
    } catch (err) {
      console.warn('createRailwayOrder proxy error:', err);
    }
    return null;
  },

  async updateRailwayOrderPaid(orderId: string, razorpayPaymentId: string): Promise<Record<string, unknown> | null> {
    try {
      const res = await fetch('/api/orders/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, paymentId: razorpayPaymentId })
      });
      if (res.ok) {
        return (await res.json()) as Record<string, unknown>;
      }
    } catch (err) {
      console.warn('updateRailwayOrderPaid proxy error:', err);
    }
    return null;
  },

  async createPaymentOrder(orderId: number): Promise<PaymentOrderResponse> {
    return fetchJson<PaymentOrderResponse>(`${API_BASE}/payments/create`, {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId })
    });
  },

  async verifyPayment(orderId: number, razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string): Promise<PaymentVerifyResponse> {
    return fetchJson<PaymentVerifyResponse>(`${API_BASE}/payments/verify`, {
      method: 'POST',
      body: JSON.stringify({
        order_id: orderId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature
      })
    });
  },

  async failPayment(orderId: number, reason: string): Promise<{ success: boolean; status: string; order_id: number; reason: string }> {
    return fetchJson(`${API_BASE}/payments/fail`, {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, reason })
    });
  },

  async getAuditLogs(merchantId: number = 1): Promise<AuditEvent[]> {
    try {
      const data = await fetchJson<{ items: BackendAuditItem[] }>(`${API_BASE}/audit?merchant_id=${merchantId}&limit=50`);
      if (data && data.items && data.items.length > 0) {
        return data.items.map((item) => {
          let category: AuditEvent['category'] = 'Agent';
          if (item.action.includes('policy') || item.actor_type.includes('policy')) category = 'Policy';
          else if (item.action.includes('payment') || item.action.includes('razorpay') || item.action.includes('captured')) category = 'Payment';
          else if (item.action.includes('growth') || item.action.includes('recommend')) category = 'Growth';
          else if (item.status === 'blocked') category = 'Blocked';

          return {
            id: String(item.id),
            timestamp: new Date(item.created_at).toLocaleTimeString('en-US', { hour12: false }),
            actor: item.actor_type.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) as AuditEvent['actor'],
            action: item.action.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            reason: item.reason || '',
            amount: item.amount_inr ? Number(item.amount_inr) : undefined,
            result: item.status === 'allowed' ? 'Allowed' : item.status === 'blocked' ? 'Blocked' : item.status === 'captured' ? 'Successful' : 'Created',
            category
          };
        });
      }
    } catch (e) {
      console.warn('Could not fetch audit logs from backend, using default mock logs:', e);
    }
    return INITIAL_AUDIT_EVENTS;
  },

  async getOrders(merchantId: number = 1): Promise<Transaction[]> {
    try {
      const data = await fetchJson<RawOrder[]>(`${API_BASE}/orders?merchant_id=${merchantId}&limit=50`);
      if (Array.isArray(data) && data.length > 0) {
        return data.map((order: RawOrder) => {
          // Check if this is a live Railway store order
          if (order.id && typeof order.id === 'string' && (order.id.startsWith('cmtl') || order.totalAmount !== undefined)) {
            const isPaid = order.status === 'PAID';
            const isPending = order.status === 'PENDING';
            const rawTotal = Number(order.totalAmount || 0);
            const totalInr = rawTotal > 1000 ? rawTotal / 100.0 : rawTotal;
            const items = (order.items || []).map((it: RawOrderItem) => ({
              productId: it.productId || it.product?.id || 'item',
              productName: it.product?.name || it.name || 'Store Product',
              price: it.unitPrice ? (it.unitPrice > 1000 ? it.unitPrice / 100.0 : it.unitPrice) : totalInr,
              quantity: it.quantity || 1
            }));
            const paymentStatus: Transaction['paymentStatus'] = isPaid ? 'Captured' : isPending ? 'Pending' : 'Failed';
            return {
              id: order.id,
              orderId: order.id,
              buyer: order.customer?.name || order.customer?.email || 'AI Buyer',
              items,
              subtotal: totalInr,
              upsellTotal: 0,
              totalAmount: totalInr,
              policyStatus: 'Approved',
              paymentStatus,
              timestamp: order.createdAt ? new Date(order.createdAt).toLocaleTimeString('en-US', { hour12: false }) : 'Recent',
              policyReason: 'Approved: Within merchant limit',
              razorpayPaymentId: order.razorpayPaymentId,
              razorpayOrderId: order.razorpayOrderId,
              razorpayApiCalls: isPaid ? 2 : 1
            };
          }

          // Fallback to local FastAPI backend order shape
          const isBlocked = order.status === 'blocked';
          const txn = order.transaction;
          let paymentStatus: Transaction['paymentStatus'] = 'Not Attempted';
          if (txn) {
            if (txn.status === 'captured') paymentStatus = 'Captured';
            else if (txn.status === 'pending') paymentStatus = 'Pending';
            else if (txn.status === 'failed') paymentStatus = 'Failed';
            else if (txn.status === 'blocked') paymentStatus = 'Blocked';
          } else if (isBlocked) {
            paymentStatus = 'Not Attempted';
          }

          return {
            id: `ORD-${order.order_id || 0}`,
            orderId: order.order_id || 0,
            buyer: order.buyer_id || 'AI Buyer',
            items: (order.items || []).map((oi: RawOrderItem) => ({
              productId: String(oi.product_id || oi.productId || 'item'),
              productName: oi.product_name || oi.productName || 'Product',
              price: Number(oi.unit_price_inr || oi.unitPrice || 0),
              quantity: oi.quantity || 1
            })),
            subtotal: Number(order.subtotal_inr || 0),
            upsellTotal: 0,
            totalAmount: Number(order.total_inr || 0),
            policyStatus: isBlocked ? 'Blocked' : 'Approved',
            paymentStatus,
            timestamp: order.created_at ? new Date(order.created_at).toLocaleTimeString('en-US', { hour12: false }) : 'Recent',
            policyReason: order.policy_reason || (isBlocked ? 'Blocked by limit' : 'Approved'),
            razorpayPaymentId: txn?.provider_reference || undefined,
            razorpayOrderId: txn?.provider_reference || undefined,
            razorpayApiCalls: txn && txn.status === 'captured' ? 2 : txn ? 1 : 0
          };
        });
      }
    } catch (e) {
      console.warn('Could not fetch orders from backend, maintaining current transactions:', e);
    }
    return INITIAL_TRANSACTIONS;
  },

  async curatePrompt(prompt: string, buyerId: string = 'demo-ai-buyer'): Promise<CuratedPromptResult> {
    try {
      const res = await fetchJson<CuratedPromptResult>(`${AGENT_BASE}/agent/curate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, buyer_id: buyerId })
      });
      return res;
    } catch (e) {
      console.warn('Agent curation endpoint unavailable, falling back to local extraction:', e);
      const kMatch = prompt.match(/(?:under|below|within|upto|budget|rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*k\b/i);
      const numMatch = prompt.match(/(?:under|below|within|upto|budget|rs\.?|₹)\s*([\d,]+)/i) || prompt.match(/₹\s*([\d,]+)/) || prompt.match(/\b(\d{3,7})\b/);
      let budget = 50000;
      if (kMatch) budget = parseFloat(kMatch[1]) * 1000;
      else if (numMatch) budget = parseInt(numMatch[1].replace(/,/g, ''), 10) || 50000;

      const cleanItem = prompt
        .replace(/(?:i\s+need|i\s+want|looking\s+for|please\s+find|find|buy|get|a|an|the)\b/gi, ' ')
        .replace(/(?:under|below|within|upto|budget|for|rs\.?|₹)\s*[\d,]+(?:\s*k)?/gi, ' ')
        .replace(/[^\w\s-]/g, ' ')
        .trim();
      const sq = cleanItem || 'product';

      return {
        search_query: sq,
        category: sq,
        budget_inr: budget,
        use_case: /gaming/i.test(prompt) ? 'gaming' : /study/i.test(prompt) ? 'study' : 'work',
        priority_feature: /battery/i.test(prompt) ? 'battery' : 'productivity',
        intent: `purchase_${sq.toLowerCase().replace(/\s+/g, '_')}`,
        structured_request: {
          buyer_id: buyerId,
          intent: `purchase_${sq.toLowerCase().replace(/\s+/g, '_')}`,
          category: sq,
          budget_inr: budget,
          preferences: {
            use_case: /gaming/i.test(prompt) ? 'gaming' : 'work',
            priority: 'standard'
          }
        }
      };
    }
  }
};
