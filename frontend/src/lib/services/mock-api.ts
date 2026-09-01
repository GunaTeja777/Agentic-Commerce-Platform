import { INITIAL_PRODUCTS } from '../mock-data/products';
import { INITIAL_GROWTH_OPPORTUNITIES } from '../mock-data/growth';
import { INITIAL_AUDIT_EVENTS } from '../mock-data/audit';
import { DEFAULT_POLICY } from '../mock-data/policies';
import { Product, GrowthOpportunity, MerchantPolicy, AuditEvent } from '../types';

/**
 * Mock API services.
 * In a future phase, these functions will be replaced with real FastAPI calls:
 * e.g., fetch(`${API_URL}/catalog/search`) or fetch(`${API_URL}/policy/check`)
 */

export const mockSearchProducts = async (query: string, maxPrice: number = 100000): Promise<Product[]> => {
  await new Promise((res) => setTimeout(res, 300));
  const lower = query.toLowerCase();
  return INITIAL_PRODUCTS.filter((p) => {
    const matchesCategory = p.category.toLowerCase().includes(lower);
    const matchesName = p.name.toLowerCase().includes(lower);
    const matchesDesc = p.description.toLowerCase().includes(lower);
    const matchesPrice = p.price <= maxPrice;
    return (matchesCategory || matchesName || matchesDesc) && matchesPrice;
  });
};

export const mockGetGrowthRecommendations = async (productId: string): Promise<GrowthOpportunity[]> => {
  await new Promise((res) => setTimeout(res, 200));
  return INITIAL_GROWTH_OPPORTUNITIES.filter(
    (g) => g.mainProductId === productId && g.enabled
  );
};

export const mockCheckPolicy = async (
  totalAmount: number,
  category: string = 'Electronics',
  policy: MerchantPolicy = DEFAULT_POLICY
): Promise<{ allowed: boolean; reason: string }> => {
  await new Promise((res) => setTimeout(res, 300));

  if (policy.status !== 'Active') {
    return { allowed: false, reason: 'Merchant policy status is currently inactive.' };
  }

  if (totalAmount > policy.maxTransactionLimit) {
    return {
      allowed: false,
      reason: `Blocked: Purchase total ₹${totalAmount.toLocaleString()} exceeds merchant maximum limit of ₹${policy.maxTransactionLimit.toLocaleString()}. Razorpay API will not be invoked.`
    };
  }

  if (!policy.allowedCategories.includes(category)) {
    return {
      allowed: false,
      reason: `Blocked: Category '${category}' is not in merchant allowed list (${policy.allowedCategories.join(', ')}).`
    };
  }

  return {
    allowed: true,
    reason: `Allowed: Total ₹${totalAmount.toLocaleString()} is within merchant ₹${policy.maxTransactionLimit.toLocaleString()} limit.`
  };
};

export const mockCreateRazorpayOrder = async (
  _totalAmount: number,
  _orderId: string
): Promise<{ success: boolean; paymentId: string; apiCalls: number }> => {
  await new Promise((res) => setTimeout(res, 400));
  return {
    success: true,
    paymentId: `pay_${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
    apiCalls: 1
  };
};

export const mockGetAuditEvents = async (): Promise<AuditEvent[]> => {
  return INITIAL_AUDIT_EVENTS;
};
