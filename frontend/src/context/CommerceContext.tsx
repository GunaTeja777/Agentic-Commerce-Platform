'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  Product,
  MerchantPolicy,
  Transaction,
  AuditEvent,
  AgentEvent,
  GrowthOpportunity
} from '../lib/types';
import { INITIAL_PRODUCTS } from '../lib/mock-data/products';
import { DEFAULT_POLICY } from '../lib/mock-data/policies';
import { INITIAL_TRANSACTIONS } from '../lib/mock-data/transactions';
import { INITIAL_AUDIT_EVENTS } from '../lib/mock-data/audit';
import { INITIAL_AGENT_EVENTS } from '../lib/mock-data/agent-events';
import { INITIAL_GROWTH_OPPORTUNITIES } from '../lib/mock-data/growth';

interface CommerceContextType {
  products: Product[];
  policy: MerchantPolicy;
  transactions: Transaction[];
  auditEvents: AuditEvent[];
  agentEvents: AgentEvent[];
  growthOpportunities: GrowthOpportunity[];
  isFailureModalOpen: boolean;
  setIsFailureModalOpen: (open: boolean) => void;
  updatePolicy: (newPolicy: Partial<MerchantPolicy>) => void;
  addTransaction: (tx: Transaction) => void;
  addAuditEvent: (evt: AuditEvent) => void;
  toggleGrowthOpportunity: (id: string) => void;
  addProduct: (product: Product) => void;
  executeInteractiveFlow: (params: {
    buyerQuery: string;
    selectedProduct: Product;
    acceptedUpsell: boolean;
    upsellProduct?: Product;
  }) => Promise<{ allowed: boolean; transaction: Transaction }>;
}

const CommerceContext = createContext<CommerceContextType | undefined>(undefined);

export const CommerceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [policy, setPolicy] = useState<MerchantPolicy>(DEFAULT_POLICY);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(INITIAL_AUDIT_EVENTS);
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>(INITIAL_AGENT_EVENTS);
  const [growthOpportunities, setGrowthOpportunities] = useState<GrowthOpportunity[]>(INITIAL_GROWTH_OPPORTUNITIES);
  const [isFailureModalOpen, setIsFailureModalOpen] = useState<boolean>(false);

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

  const executeInteractiveFlow = async (params: {
    buyerQuery: string;
    selectedProduct: Product;
    acceptedUpsell: boolean;
    upsellProduct?: Product;
  }): Promise<{ allowed: boolean; transaction: Transaction }> => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const orderId = `order_${Math.floor(100 + Math.random() * 900)}`;

    const items = [
      {
        productId: params.selectedProduct.id,
        productName: params.selectedProduct.name,
        price: params.selectedProduct.price,
        quantity: 1
      }
    ];

    let upsellTotal = 0;
    if (params.acceptedUpsell && params.upsellProduct) {
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

    // Evaluate Policy Engine (Deterministic check)
    const allowed = totalAmount <= policy.maxTransactionLimit && policy.status === 'Active';
    const policyStatus = allowed ? 'Approved' : 'Blocked';
    const paymentStatus = allowed ? 'Successful' : 'Not Attempted';
    const policyReason = allowed
      ? `Approved: Total ₹${totalAmount.toLocaleString()} is within maximum limit ₹${policy.maxTransactionLimit.toLocaleString()}`
      : `Blocked: Total ₹${totalAmount.toLocaleString()} exceeds merchant maximum limit ₹${policy.maxTransactionLimit.toLocaleString()}. Razorpay API execution skipped.`;

    const newTx: Transaction = {
      id: orderId,
      buyer: 'AI Buyer (External Agent)',
      items,
      subtotal,
      upsellTotal,
      totalAmount,
      policyStatus,
      paymentStatus,
      timestamp: `Today, ${timestamp}`,
      policyReason,
      razorpayPaymentId: allowed ? `pay_${Math.random().toString(36).substring(2, 10)}` : undefined,
      razorpayApiCalls: allowed ? 1 : 0
    };

    // Update Transactions & Audit Logs
    addTransaction(newTx);

    const newAudits: AuditEvent[] = [
      {
        id: `aud_${Date.now()}_1`,
        timestamp,
        actor: 'AI Buyer',
        action: 'Purchase request',
        reason: params.buyerQuery,
        result: 'Received',
        category: 'Agent'
      }
    ];

    if (params.acceptedUpsell && params.upsellProduct) {
      newAudits.push({
        id: `aud_${Date.now()}_2`,
        timestamp,
        actor: 'Growth Tool',
        action: `Recommended ${params.upsellProduct.name}`,
        reason: 'Frequently bought together (catalog relationship data)',
        amount: params.upsellProduct.price,
        result: 'Suggested',
        category: 'Growth'
      });
      newAudits.push({
        id: `aud_${Date.now()}_3`,
        timestamp,
        actor: 'Buyer',
        action: 'Accepted offer',
        reason: `Added ${params.upsellProduct.name} to basket`,
        amount: params.upsellProduct.price,
        result: 'Approved',
        category: 'Growth'
      });
    }

    newAudits.push({
      id: `aud_${Date.now()}_4`,
      timestamp,
      actor: 'Policy Tool',
      action: 'Deterministic Limit Check',
      reason: policyReason,
      amount: totalAmount,
      result: allowed ? 'Allowed' : 'Blocked',
      category: allowed ? 'Policy' : 'Blocked'
    });

    if (allowed) {
      newAudits.push({
        id: `aud_${Date.now()}_5`,
        timestamp,
        actor: 'Payment Tool',
        action: 'Razorpay Test Order Creation',
        reason: `Policy check passed. Executed payment for ${orderId}`,
        amount: totalAmount,
        result: 'Successful',
        category: 'Payment'
      });
    }

    setAuditEvents((prev) => [...newAudits, ...prev]);

    return { allowed, transaction: newTx };
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
        setIsFailureModalOpen,
        updatePolicy,
        addTransaction,
        addAuditEvent,
        toggleGrowthOpportunity,
        addProduct,
        executeInteractiveFlow
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
