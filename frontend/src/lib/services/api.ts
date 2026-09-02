import { Product, MerchantPolicy, Transaction, AuditEvent } from '@/lib/types';
import { INITIAL_PRODUCTS } from '@/lib/mock-data/products';
import { DEFAULT_POLICY } from '@/lib/mock-data/policies';
import { INITIAL_AUDIT_EVENTS } from '@/lib/mock-data/audit';
import { INITIAL_TRANSACTIONS } from '@/lib/mock-data/transactions';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

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
  message: string;
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

export const AGENT_BASE = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:8001';

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

export const apiService = {
  async chatAgent(payload: {
    message: string;
    merchant_id?: number;
    buyer_id?: string;
    buyer_decision?: string;
    context?: Record<string, unknown>;
  }): Promise<AgentChatResponse> {
    return fetchJson<AgentChatResponse>(`${AGENT_BASE}/agent/chat`, {
      method: 'POST',
      body: JSON.stringify({
        message: payload.message,
        merchant_id: payload.merchant_id || 1,
        buyer_id: payload.buyer_id || 'demo-ai-buyer',
        buyer_decision: payload.buyer_decision,
        context: payload.context
      })
    });
  },

  async getProducts(): Promise<Product[]> {
    try {
      const data = await fetchJson<{ items: BackendProductItem[] }>(`${API_BASE}/products?limit=50`);
      if (data && data.items && data.items.length > 0) {
        return data.items.map((item) => ({
          id: String(item.product_id || item.id),
          name: item.product_name || item.name || 'Product',
          category: item.category || 'Electronics',
          price: Number(item.price_inr || item.price || 0),
          stock: Number(item.stock_quantity || item.stock || 0),
          compatibleProducts: Array.isArray(item.tags) ? item.tags : [],
          frequentlyBoughtWith: [],
          agentReadableStatus: ((item.stock_quantity || item.stock || 0) > 10) ? 'Available' : ((item.stock_quantity || item.stock || 0) > 0) ? 'Low Stock' : 'Out of Stock',
          description: item.description || '',
          specifications: {}
        }));
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

  async checkPolicy(amountInr: number, merchantId: number = 1): Promise<{ allowed: boolean; reason: string; maxLimit: number }> {
    try {
      const data = await fetchJson<{ allowed: boolean; reason: string; max_transaction_inr: number }>(`${API_BASE}/policies/check`, {
        method: 'POST',
        body: JSON.stringify({ merchant_id: merchantId, amount_inr: amountInr })
      });
      return {
        allowed: data.allowed,
        reason: data.reason,
        maxLimit: data.max_transaction_inr
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('Policy check network error:', e);
      return {
        allowed: false,
        reason: `Policy check unavailable (Fail-Closed): ${msg}`,
        maxLimit: 0
      };
    }
  },

  async createOrder(merchantId: number, buyerId: string, items: Array<{ product_id: number; quantity: number }>): Promise<BackendOrderResponse> {
    return fetchJson<BackendOrderResponse>(`${API_BASE}/orders`, {
      method: 'POST',
      body: JSON.stringify({ merchant_id: merchantId, buyer_id: buyerId, items })
    });
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
      const data = await fetchJson<BackendOrderResponse[]>(`${API_BASE}/orders?merchant_id=${merchantId}&limit=50`);
      if (Array.isArray(data) && data.length > 0) {
        return data.map((order) => {
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
            id: `ORD-${order.order_id}`,
            orderId: order.order_id,
            buyer: order.buyer_id || 'AI Buyer',
            items: (order.items || []).map((oi) => ({
              productId: String(oi.product_id),
              productName: oi.product_name,
              price: Number(oi.unit_price_inr),
              quantity: oi.quantity
            })),
            subtotal: Number(order.subtotal_inr),
            upsellTotal: 0,
            totalAmount: Number(order.total_inr),
            policyStatus: isBlocked ? 'Blocked' : 'Approved',
            paymentStatus,
            timestamp: new Date(order.created_at).toLocaleTimeString('en-US', { hour12: false }),
            policyReason: order.policy_reason || (isBlocked ? 'Blocked by limit' : 'Approved'),
            razorpayPaymentId: txn?.provider_reference || undefined,
            razorpayOrderId: txn?.provider_reference || undefined,
            razorpayApiCalls: txn && txn.status === 'captured' ? 2 : txn ? 1 : 0
          };
        });
      }
    } catch (e) {
      console.warn('Could not fetch orders from backend, using default mock transactions:', e);
    }
    return INITIAL_TRANSACTIONS;
  }
};
