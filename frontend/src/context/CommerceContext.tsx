'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  Product,
  MerchantPolicy,
  Transaction,
  AuditEvent,
  AgentEvent,
  GrowthOpportunity,
  OrderItem
} from '@/lib/types';
import { INITIAL_PRODUCTS } from '@/lib/mock-data/products';
import { DEFAULT_POLICY } from '@/lib/mock-data/policies';
import { INITIAL_TRANSACTIONS } from '@/lib/mock-data/transactions';
import { INITIAL_AUDIT_EVENTS } from '@/lib/mock-data/audit';
import { INITIAL_AGENT_EVENTS } from '@/lib/mock-data/agent-events';
import { INITIAL_GROWTH_OPPORTUNITIES } from '@/lib/mock-data/growth';
import { apiService, PaymentOrderResponse, PaymentVerifyResponse } from '@/lib/services/api';

interface RazorpayCheckoutResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayErrorResponse {
  code?: string;
  description?: string;
  source?: string;
  step?: string;
  reason?: string;
}

interface CommerceContextType {
  products: Product[];
  policy: MerchantPolicy;
  transactions: Transaction[];
  auditEvents: AuditEvent[];
  agentEvents: AgentEvent[];
  growthOpportunities: GrowthOpportunity[];
  isFailureModalOpen: boolean;
  isLoading: boolean;
  setIsFailureModalOpen: (open: boolean) => void;
  updatePolicy: (newPolicy: Partial<MerchantPolicy>) => void;
  addTransaction: (tx: Transaction) => void;
  addAuditEvent: (evt: AuditEvent) => void;
  toggleGrowthOpportunity: (id: string) => void;
  addProduct: (product: Product) => void;
  refreshCommerceData: () => Promise<void>;
  executeInteractiveFlow: (params: {
    buyerQuery: string;
    selectedProduct: Product;
    acceptedUpsell: boolean;
    upsellProduct?: Product;
  }) => Promise<{ allowed: boolean; transaction: Transaction; razorpayOrder?: PaymentOrderResponse | null; error?: string }>;
  payWithRazorpay: (params: {
    orderId: number | string;
    amountInr: number;
    description: string;
    razorpayOrderId?: string;
    razorpayKeyId?: string;
    onSuccess?: (verifyData: PaymentVerifyResponse & { bookingId?: string }) => void;
    onFailure?: (error: Error | RazorpayErrorResponse) => void;
  }) => Promise<void>;
}

const CommerceContext = createContext<CommerceContextType | undefined>(undefined);

const TX_STORAGE_KEY = 'agentic_commerce_transactions';
const AUDIT_STORAGE_KEY = 'agentic_commerce_audit_events';
const POLICY_STORAGE_KEY = 'agentic_commerce_policy';

export const CommerceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [policy, setPolicy] = useState<MerchantPolicy>(DEFAULT_POLICY);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(INITIAL_AUDIT_EVENTS);
  const [agentEvents] = useState<AgentEvent[]>(INITIAL_AGENT_EVENTS);
  const [growthOpportunities, setGrowthOpportunities] = useState<GrowthOpportunity[]>(INITIAL_GROWTH_OPPORTUNITIES);
  const [isFailureModalOpen, setIsFailureModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 1. Initialize from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedTx = localStorage.getItem(TX_STORAGE_KEY);
        if (savedTx) {
          const parsed = JSON.parse(savedTx);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTransactions(parsed);
          }
        }
        const savedAudits = localStorage.getItem(AUDIT_STORAGE_KEY);
        if (savedAudits) {
          const parsed = JSON.parse(savedAudits);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAuditEvents(parsed);
          }
        }
        const savedPolicy = localStorage.getItem(POLICY_STORAGE_KEY);
        if (savedPolicy) {
          const parsed = JSON.parse(savedPolicy);
          if (parsed && typeof parsed === 'object') {
            setPolicy((prev) => ({ ...prev, ...parsed }));
          }
        }
      } catch (err) {
        console.warn('Error reading from localStorage:', err);
      }
    }
  }, []);

  const refreshCommerceData = useCallback(async () => {
    try {
      const [backendProducts, backendPolicy, backendOrders, backendAudits] = await Promise.allSettled([
        apiService.getProducts(),
        apiService.getPolicy(1),
        apiService.getOrders(1),
        apiService.getAuditLogs(1)
      ]);

      if (backendProducts.status === 'fulfilled' && backendProducts.value.length > 0) {
        setProducts(backendProducts.value);
      }
      if (backendPolicy.status === 'fulfilled') {
        setPolicy((prev) => {
          let saved: Partial<MerchantPolicy> | null = null;
          if (typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem(POLICY_STORAGE_KEY);
              if (raw) saved = JSON.parse(raw);
            } catch {}
          }
          return {
            ...backendPolicy.value,
            ...(saved || prev)
          };
        });
      }
      if (backendOrders.status === 'fulfilled' && backendOrders.value.length > 0) {
        setTransactions((prev) => {
          // Preserve live user-created orders that aren't in initial mock set
          const userOrders = prev.filter(p => p.id && !INITIAL_TRANSACTIONS.some(it => it.id === p.id));
          const existingIds = new Set(backendOrders.value.map(o => o.id));
          const toAdd = userOrders.filter(p => !existingIds.has(p.id));
          const merged = [...toAdd, ...backendOrders.value];
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(TX_STORAGE_KEY, JSON.stringify(merged));
            } catch (e) {
              console.warn('Could not save merged transactions:', e);
            }
          }
          return merged;
        });
      }
      if (backendAudits.status === 'fulfilled' && backendAudits.value.length > 0) {
        setAuditEvents((prev) => {
          const userAudits = prev.filter(a => a.id && !INITIAL_AUDIT_EVENTS.some(ia => ia.id === a.id));
          const existingIds = new Set(backendAudits.value.map(a => a.id));
          const toAdd = userAudits.filter(a => !existingIds.has(a.id));
          const merged = [...toAdd, ...backendAudits.value];
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(merged));
            } catch (e) {
              console.warn('Could not save merged audits:', e);
            }
          }
          return merged;
        });
      }
    } catch (e) {
      console.warn('Backend sync failed, maintaining local state:', e);
    }
  }, []);

  useEffect(() => {
    refreshCommerceData();
  }, [refreshCommerceData]);

  const updatePolicy = (newPolicy: Partial<MerchantPolicy>) => {
    setPolicy((prev) => {
      const updated = { ...prev, ...newPolicy };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(POLICY_STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
          console.warn('Could not save policy:', e);
        }
      }
      return updated;
    });
  };

  const addTransaction = (tx: Transaction) => {
    setTransactions((prev) => {
      const filtered = prev.filter(t => t.id !== tx.id);
      const updated = [tx, ...filtered];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(TX_STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
          console.warn('Could not save transactions:', e);
        }
      }
      return updated;
    });
  };

  const addAuditEvent = (evt: AuditEvent) => {
    setAuditEvents((prev) => {
      const filtered = prev.filter(e => e.id !== evt.id);
      const updated = [evt, ...filtered];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
          console.warn('Could not save audit events:', e);
        }
      }
      return updated;
    });
  };

  const toggleGrowthOpportunity = (id: string) => {
    setGrowthOpportunities((prev) =>
      prev.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g))
    );
  };

  const addProduct = (prod: Product) => {
    setProducts((prev) => [prod, ...prev]);
  };

  const payWithRazorpay = async (params: {
    orderId: number | string;
    amountInr: number;
    description: string;
    razorpayOrderId?: string;
    razorpayKeyId?: string;
    onSuccess?: (verifyData: PaymentVerifyResponse & { bookingId?: string }) => void;
    onFailure?: (error: Error | RazorpayErrorResponse) => void;
  }) => {
    try {
      let payOrder: PaymentOrderResponse;
      if (params.razorpayOrderId && params.razorpayKeyId) {
        payOrder = {
          success: true,
          status: 'created',
          order_id: typeof params.orderId === 'number' ? params.orderId : 0,
          razorpay_order_id: params.razorpayOrderId,
          amount: Math.round(params.amountInr * 100),
          amount_inr: params.amountInr,
          currency: 'INR',
          key_id: params.razorpayKeyId,
          receipt: `rcpt_${params.orderId}`
        };
      } else {
        payOrder = await apiService.createPaymentOrder(typeof params.orderId === 'number' ? params.orderId : 1);
      }

      // Check if Razorpay standard checkout script is loaded
      if (typeof window !== 'undefined' && 'Razorpay' in window) {
        const RazorpayClass = (window as unknown as { Razorpay: new (opts: object) => { open: () => void; on: (event: string, handler: (resp: { error?: RazorpayErrorResponse }) => void) => void } }).Razorpay;
        const options = {
          key: payOrder.key_id,
          amount: payOrder.amount, // in paise
          currency: payOrder.currency || 'INR',
          name: 'Demo Merchant AI Store',
          description: params.description || `Order #${params.orderId} (Test Mode)`,
          order_id: payOrder.razorpay_order_id,
          handler: async (response: RazorpayCheckoutResponse) => {
            try {
              // Update Railway store order status to PAID
              if (typeof params.orderId === 'string' && params.orderId.startsWith('cmtl')) {
                await apiService.updateRailwayOrderPaid(params.orderId, response.razorpay_payment_id);
              }

              let verifyRes: PaymentVerifyResponse = {
                success: true,
                status: 'captured',
                transaction_id: typeof params.orderId === 'number' ? params.orderId : 1,
                order_id: typeof params.orderId === 'number' ? params.orderId : 0,
                amount_inr: params.amountInr,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                signature_valid: true,
                message: 'Payment verified successfully'
              };

              if (typeof params.orderId === 'number') {
                try {
                  verifyRes = await apiService.verifyPayment(
                    params.orderId,
                    response.razorpay_order_id,
                    response.razorpay_payment_id,
                    response.razorpay_signature
                  );
                } catch (e) {
                  console.warn('Backend payment verify fallback:', e);
                }
              }

              await refreshCommerceData();
              if (params.onSuccess) params.onSuccess({ ...verifyRes, bookingId: String(params.orderId) });
            } catch (err) {
              console.error('Signature verification failed:', err);
              if (params.onFailure) params.onFailure(err instanceof Error ? err : new Error('Verification failed'));
            }
          },
          modal: {
            ondismiss: async () => {
              if (typeof params.orderId === 'number') {
                try {
                  await apiService.failPayment(params.orderId, 'User dismissed Razorpay checkout');
                  await refreshCommerceData();
                } catch (e) {
                  console.warn('Fail payment notice error:', e);
                }
              }
              if (params.onFailure) params.onFailure(new Error('Checkout dismissed by user'));
            }
          },
          theme: {
            color: '#4f46e5'
          }
        };

        const rzp = new RazorpayClass(options);
        rzp.on('payment.failed', async (response: { error?: RazorpayErrorResponse }) => {
          if (typeof params.orderId === 'number') {
            await apiService.failPayment(params.orderId, response.error?.description || 'Payment failed');
            await refreshCommerceData();
          }
          if (params.onFailure) params.onFailure(response.error || new Error('Payment failed'));
        });
        rzp.open();
      } else {
        console.warn('Razorpay SDK script not loaded yet, creating simulated test order.');
      }
    } catch (err: unknown) {
      console.error('Payment initiation error:', err);
      const errorObj = err instanceof Error ? err : new Error(String(err));
      if (params.onFailure) params.onFailure(errorObj);
      throw errorObj;
    }
  };

  const executeInteractiveFlow = async (params: {
    buyerQuery: string;
    selectedProduct: Product;
    acceptedUpsell: boolean;
    upsellProduct?: Product;
  }): Promise<{ allowed: boolean; transaction: Transaction; razorpayOrder?: PaymentOrderResponse | null; error?: string }> => {
    setIsLoading(true);
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });

    const orderItemsPayload: Array<{ product_id: number; quantity: number }> = [
      { product_id: Number(params.selectedProduct.id), quantity: 1 }
    ];

    const items: OrderItem[] = [
      {
        productId: params.selectedProduct.id,
        productName: params.selectedProduct.name,
        price: params.selectedProduct.price,
        quantity: 1
      }
    ];

    let upsellTotal = 0;
    if (params.acceptedUpsell && params.upsellProduct) {
      orderItemsPayload.push({ product_id: Number(params.upsellProduct.id), quantity: 1 });
      items.push({
        productId: params.upsellProduct.id,
        productName: params.upsellProduct.name,
        price: params.upsellProduct.price,
        quantity: 1,
        isUpsell: true
      });
      upsellTotal = params.upsellProduct.price;
    }

    const subtotal = params.selectedProduct.price;
    const totalAmount = subtotal + upsellTotal;

    try {
      // 1. Send Order to Backend PostgreSQL & Policy Engine
      const orderRes = await apiService.createOrder(1, 'AI Buyer (External Agent)', orderItemsPayload);
      const isAllowed = orderRes.policy_allowed;
      const orderIdNum = orderRes.order_id;
      const orderIdStr = `ORD-${orderIdNum}`;

      let razorpayOrderData: PaymentOrderResponse | null = null;

      // 2. If policy is ALLOWED, create Razorpay Test Order
      if (isAllowed) {
        try {
          razorpayOrderData = await apiService.createPaymentOrder(orderIdNum);
        } catch (e) {
          console.error('Payment order creation error:', e);
        }
      }

      const newTx: Transaction = {
        id: orderIdStr,
        orderId: orderIdNum,
        buyer: 'AI Buyer (External Agent)',
        items,
        subtotal,
        upsellTotal,
        totalAmount,
        policyStatus: isAllowed ? 'Approved' : 'Blocked',
        paymentStatus: isAllowed ? (razorpayOrderData ? 'Pending' : 'Successful') : 'Not Attempted',
        timestamp: `Today, ${timestamp}`,
        policyReason: orderRes.policy_reason || (isAllowed ? 'Approved' : 'Blocked by limit'),
        razorpayOrderId: razorpayOrderData?.razorpay_order_id,
        razorpayApiCalls: isAllowed ? 1 : 0
      };

      addTransaction(newTx);
      await refreshCommerceData();
      setIsLoading(false);

      return {
        allowed: isAllowed,
        transaction: newTx,
        razorpayOrder: razorpayOrderData
      };
    } catch (e: unknown) {
      console.error('Backend flow error, using policy engine evaluation fallback:', e);

      const isAllowed = totalAmount <= policy.maxTransactionLimit && policy.status === 'Active';
      const policyReason = isAllowed
        ? `Approved: Total ₹${totalAmount.toLocaleString()} is within maximum limit ₹${policy.maxTransactionLimit.toLocaleString()}`
        : `Blocked: Total ₹${totalAmount.toLocaleString()} exceeds merchant maximum limit ₹${policy.maxTransactionLimit.toLocaleString()}. Razorpay API execution skipped.`;

      const fallbackTx: Transaction = {
        id: `ORD-${Math.floor(100 + Math.random() * 900)}`,
        buyer: 'AI Buyer (External Agent)',
        items,
        subtotal,
        upsellTotal,
        totalAmount,
        policyStatus: isAllowed ? 'Approved' : 'Blocked',
        paymentStatus: isAllowed ? 'Successful' : 'Not Attempted',
        timestamp: `Today, ${timestamp}`,
        policyReason,
        razorpayPaymentId: isAllowed ? `pay_${Math.random().toString(36).substring(2, 10)}` : undefined,
        razorpayApiCalls: isAllowed ? 1 : 0
      };

      addTransaction(fallbackTx);
      setIsLoading(false);
      return {
        allowed: isAllowed,
        transaction: fallbackTx,
        error: e instanceof Error ? e.message : String(e)
      };
    }
  };

  return (
    <CommerceContext.Provider
      value={{
        products,
        policy,
        transactions,
        auditEvents,
        agentEvents,
        growthOpportunities,
        isFailureModalOpen,
        isLoading,
        setIsFailureModalOpen,
        updatePolicy,
        addTransaction,
        addAuditEvent,
        toggleGrowthOpportunity,
        addProduct,
        refreshCommerceData,
        executeInteractiveFlow,
        payWithRazorpay
      }}
    >
      {children}
    </CommerceContext.Provider>
  );
};

export const useCommerce = () => {
  const context = useContext(CommerceContext);
  if (!context) {
    throw new Error('useCommerce must be used within a CommerceProvider');
  }
  return context;
};
