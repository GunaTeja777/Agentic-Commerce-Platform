import { Transaction } from '../types';

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'order_123',
    buyer: 'AI Buyer (Claude-Agent-09)',
    items: [
      { productId: 'prod_lap_a', productName: 'Laptop A', price: 65000, quantity: 1 },
      { productId: 'prod_mouse', productName: 'Wireless Mouse', price: 1500, quantity: 1, isUpsell: true }
    ],
    subtotal: 65000,
    upsellTotal: 1500,
    totalAmount: 66500,
    policyStatus: 'Approved',
    paymentStatus: 'Successful',
    timestamp: 'Today, 09:42:15',
    policyReason: 'Approved: Total ₹66,500 is below maximum transaction limit ₹70,000.',
    razorpayPaymentId: 'pay_Nz82XyL19aK001',
    razorpayApiCalls: 1
  },
  {
    id: 'order_124',
    buyer: 'AI Buyer (GPT-Procure-v4)',
    items: [
      { productId: 'prod_lap_c', productName: 'Pro Studio Laptop C', price: 75000, quantity: 1 }
    ],
    subtotal: 75000,
    upsellTotal: 0,
    totalAmount: 75000,
    policyStatus: 'Blocked',
    paymentStatus: 'Not Attempted',
    timestamp: 'Today, 08:15:22',
    policyReason: 'Blocked: Total ₹75,000 exceeds merchant maximum transaction limit ₹70,000. Razorpay execution skipped.',
    razorpayApiCalls: 0
  },
  {
    id: 'order_121',
    buyer: 'AI Buyer (AutoBuy-Bot-11)',
    items: [
      { productId: 'prod_lap_b', productName: 'Laptop B', price: 58000, quantity: 1 },
      { productId: 'prod_bag', productName: 'Laptop Bag', price: 2000, quantity: 1, isUpsell: true }
    ],
    subtotal: 58000,
    upsellTotal: 2000,
    totalAmount: 60000,
    policyStatus: 'Approved',
    paymentStatus: 'Successful',
    timestamp: 'Yesterday, 16:30:10',
    policyReason: 'Approved: Total ₹60,000 is below maximum transaction limit ₹70,000.',
    razorpayPaymentId: 'pay_Mx44PqW89bJ990',
    razorpayApiCalls: 1
  }
];
