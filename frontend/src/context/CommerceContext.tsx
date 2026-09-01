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
} from '../lib/types';
import { INITIAL_PRODUCTS } from '../mock-data/products';
import { DEFAULT_POLICY } from '../mock-data/policies';
import { INITIAL_TRANSACTIONS } from '../mock-data/transactions';
import { INITIAL_AUDIT_EVENTS } from '../mock-data/audit';
import { INITIAL_AGENT_EVENTS } from '../mock-data/agent-events';
import { INITIAL_GROWTH_OPPORTUNITIES } from '../mock-data/growth';
import { apiService, PaymentOrderResponse, PaymentVerifyResponse } from '../lib/services/api';

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
    orderId: number;
    amountInr: number;
    description: string;
    onSuccess?: (verifyData: PaymentVerifyResponse) => void;
    onFailure?: (error: Error | RazorpayErrorResponse) => void;
  }) => Promise<void>;
}

const CommerceContext = createContext<CommerceContextType | undefined>(undefined);

export const CommerceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [policy, setPolicy] = useState<MerchantPolicy>(DEFAULT_POLICY);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(INITIAL_AUDIT_EVENTS);
  const [agentEvents] = useState<AgentEvent[]>(INITIAL_AGENT_EVENTS);
  const [growthOpportunities, setGrowthOpportunities] = useState<GrowthOpportunity[]>(INITIAL_GROWTH_OPPORTUNITIES);
  const [isFailureModalOpen, setIsFailureModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
        setPolicy(backendPolicy.value);
      }
      if (backendOrders.status === 'fulfilled' && backendOrders.value.length > 0) {
        setTransactions(backendOrders.value);
      }
      if (backendAudits.status === 'fulfilled' && backendAudits.value.length > 0) {
        setAuditEvents(backendAudits.value);
      }
    } catch (e) {
      console.warn('Backend sync failed, maintaining local state:', e);
    }
  }, []);

  useEffect(() => {
    refreshCommerceData();
  }, [refreshCommerceData]);

  const updatePolicy = (newPolicy: Partial<MerchantPolicy>) => {
    setPolicy((prev) => ({ ...prev, ...newPolicy }));
  };

  const addTransaction = (tx: Transaction) => {
    setTransactions((prev) => [tx, ...prev]);
  };

  const addAuditEvent = (evt: AuditEvent) => {
    setAuditEvents((prev) => [evt, ...prev]);
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
    orderId: number;
    amountInr: number;
    description: string;
    onSuccess?: (verifyData: PaymentVerifyResponse) => void;
    onFailure?: (error: Error | RazorpayErrorResponse) => void;
  }) => {
    try {
      // 1. Create Razorpay Test Order on Backend (Server-side calculation)
      const payOrder = await apiService.createPaymentOrder(params.orderId);

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
              // 2. Cryptographically verify signature server-side
              const verifyRes = await apiService.verifyPayment(
                params.orderId,
                response.razorpay_order_id,
                response.razorpay_payment_id,
                response.razorpay_signature
              );
              await refreshCommerceData();
              if (params.onSuccess) params.onSuccess(verifyRes);
            } catch (err) {
              console.error('Signature verification failed:', err);
              if (params.onFailure) params.onFailure(err instanceof Error ? err : new Error('Verification failed'));
            }
          },
          modal: {
            ondismiss: async () => {
              try {
                await apiService.failPayment(params.orderId, 'User dismissed Razorpay checkout');
                await refreshCommerceData();
              } catch (e) {
                console.warn('Fail payment notice error:', e);
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
          await apiService.failPayment(params.orderId, response.error?.description || 'Payment failed');
          await refreshCommerceData();
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
