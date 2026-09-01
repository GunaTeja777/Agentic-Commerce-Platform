import { GrowthOpportunity } from '../types';

export const INITIAL_GROWTH_OPPORTUNITIES: GrowthOpportunity[] = [
  {
    id: 'growth_01',
    mainProductId: 'prod_lap_a',
    mainProductName: 'Laptop A',
    recommendedProductId: 'prod_mouse',
    recommendedProductName: 'Wireless Mouse',
    reason: 'Frequently bought together with Laptop A based on 84% historical order pairing.',
    price: 1500,
    stock: 25,
    confidenceScore: 0.84,
    dataProof: 'Catalog relationship index & 142 co-purchases in past 90 days',
    enabled: true
  },
  {
    id: 'growth_02',
    mainProductId: 'prod_lap_b',
    mainProductName: 'Laptop B',
    recommendedProductId: 'prod_bag',
    recommendedProductName: 'Laptop Bag',
    reason: 'Frequently bought together during checkout for mobility category.',
    price: 2000,
    stock: 15,
    confidenceScore: 0.76,
    dataProof: 'Merchant cross-sell mapping rule #409',
    enabled: true
  },
  {
    id: 'growth_03',
    mainProductId: 'prod_lap_a',
    mainProductName: 'Laptop A',
    recommendedProductId: 'prod_hub',
    recommendedProductName: 'USB-C Docking Station',
    reason: 'High compatibility match for developer workstation expansion.',
    price: 3500,
    stock: 18,
    confidenceScore: 0.68,
    dataProof: 'Hardware port specification pairing',
    enabled: true
  }
];
