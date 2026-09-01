import { MerchantPolicy } from '../types';

export const DEFAULT_POLICY: MerchantPolicy = {
  maxTransactionLimit: 70000,
  approvalThreshold: 50000,
  allowedCategories: ['Electronics', 'Accessories'],
  status: 'Active',
  catalogRequired: true
};
