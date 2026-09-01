import { Product, MerchantPolicy, Transaction, AuditEvent } from '../types';
import { INITIAL_PRODUCTS } from '../mock-data/products';
import { DEFAULT_POLICY } from '../mock-data/policies';
import { INITIAL_AUDIT_EVENTS } from '../mock-data/audit';
import { INITIAL_TRANSACTIONS } from '../mock-data/transactions';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

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
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    const errorMsg = typeof errorBody.detail === 'string' ? errorBody.detail : JSON.stringify(errorBody.detail || errorBody);
    throw new Error(errorMsg || `HTTP error ${res.status}`);
  }
  return res.json();
}

export const apiService = {
  async getProducts(): Promise<Product[]> {
    try {
      const data = await fetchJson<{ items: any[] }>(`${API_BASE}/products?limit=50`);
      if (data && data.items && data.items.length > 0) {
        return data.items.map((item: any) => ({
          id: String(item.product_id || item.id),
          name: item.product_name || item.name,
          category: item.category || 'Electronics',
          price: Number(item.price_inr || item.price),
          stock: Number(item.stock_quantity || item.stock),
          compatibleProducts: item.tags || [],
          frequentlyBoughtWith: [],
          agentReadableStatus: (item.stock_quantity || item.stock) > 10 ? 'Available' : (item.stock_quantity || item.stock) > 0 ? 'Low Stock' : 'Out of Stock',
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
      const data = await fetchJson<any>(`${API_BASE}/policies?merchant_id=${merchantId}`);
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
    } catch (e: any) {
      console.error('Policy check network error:', e);
      return {
        allowed: false,
        reason: `Policy check unavailable (Fail-Closed): ${e.message}`,
        maxLimit: 0
      };
    }
  },

  async createOrder(merchantId: number, buyerId: string, items: Array<{ product_id: number; quantity: number }>): Promise<any> {
    return fetchJson(`${API_BASE}/orders`, {
      method: 'POST',
      body: JSON.stringify({ merchant_id: merchantId, buyer_id: buyerId, items })
    });
  },

  async createPaymentOrder(orderId: number): Promise<{
    success: boolean;
    order_id: number;
    razorpay_order_id: string;
    amount: number;
    amount_inr: number;
    currency: string;
    key_id: string;
    status: string;
    receipt: string;
  }> {
    return fetchJson(`${API_BASE}/payments/create`, {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId })
    });
  },

  async verifyPayment(orderId: number, razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string): Promise<any> {
    return fetchJson(`${API_BASE}/payments/verify`, {
      method: 'POST',
      body: JSON.stringify({
        order_id: orderId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature
      })
    });
  },

  async failPayment(orderId: number, reason: string): Promise<any> {
    return fetchJson(`${API_BASE}/payments/fail`, {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, reason })
    });
  },

  async getAuditLogs(merchantId: number = 1): Promise<AuditEvent[]> {
    try {
      const data = await fetchJson<{ items: any[] }>(`${API_BASE}/audit?merchant_id=${merchantId}&limit=50`);
      if (data && data.items && data.items.length > 0) {
        return data.items.map((item: any) => {
          let category: AuditEvent['category'] = 'Agent';
          if (item.action.includes('policy') || item.actor_type.includes('policy')) category = 'Policy';
          else if (item.action.includes('payment') || item.action.includes('razorpay') || item.action.includes('captured')) category = 'Payment';
          else if (item.action.includes('growth') || item.action.includes('recommend')) category = 'Growth';
          else if (item.status === 'blocked') category = 'Blocked';

          return {
            id: String(item.id),
            timestamp: new Date(item.created_at).toLocaleTimeString('en-US', { hour12: false }),
            actor: item.actor_type.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) as any,
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
      const data = await fetchJson<any[]>(`${API_BASE}/orders?merchant_id=${merchantId}&limit=50`);
      if (Array.isArray(data) && data.length > 0) {
        return data.map((order: any) => {
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
            items: (order.items || []).map((oi: any) => ({
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
