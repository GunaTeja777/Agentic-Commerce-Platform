export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  compatibleProducts: string[];
  frequentlyBoughtWith: string[];
  agentReadableStatus: 'Available' | 'Low Stock' | 'Out of Stock';
  description: string;
  specifications: Record<string, string>;
}

export interface MerchantPolicy {
  maxTransactionLimit: number;
  approvalThreshold: number;
  allowedCategories: string[];
  status: 'Active' | 'Paused';
  catalogRequired: boolean;
}

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  isUpsell?: boolean;
}

export interface Transaction {
  id: string;
  buyer: string;
  items: OrderItem[];
  subtotal: number;
  upsellTotal: number;
  totalAmount: number;
  policyStatus: 'Approved' | 'Blocked';
  paymentStatus: 'Successful' | 'Not Attempted' | 'Blocked' | 'Pending';
  timestamp: string;
  policyReason: string;
  razorpayPaymentId?: string;
  razorpayApiCalls: number;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: 'AI Buyer' | 'Merchant Agent' | 'Catalog Tool' | 'Growth Tool' | 'Policy Tool' | 'Payment Tool' | 'Buyer';
  action: string;
  reason: string;
  amount?: number;
  result: 'Received' | 'Suggested' | 'Approved' | 'Allowed' | 'Created' | 'Successful' | 'Blocked';
  category: 'Agent' | 'Policy' | 'Payment' | 'Growth' | 'Blocked';
}

export interface AgentEvent {
  id: string;
  toolName: 'CATALOG TOOL' | 'GROWTH TOOL' | 'POLICY TOOL' | 'PAYMENT TOOL' | 'ORCHESTRATOR';
  timestamp: string;
  status: 'Completed' | 'Approved' | 'Blocked' | 'Running' | 'Pending';
  explanation: string;
  inputData?: string;
  outputData?: string;
}

export interface GrowthOpportunity {
  id: string;
  mainProductId: string;
  mainProductName: string;
  recommendedProductId: string;
  recommendedProductName: string;
  reason: string;
  price: number;
  stock: number;
  confidenceScore: number;
  dataProof: string;
  enabled: boolean;
}
