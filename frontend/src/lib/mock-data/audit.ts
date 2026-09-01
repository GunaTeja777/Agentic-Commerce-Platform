import { AuditEvent } from '../types';

export const INITIAL_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'aud_001',
    timestamp: '09:42:01',
    actor: 'AI Buyer',
    action: 'Purchase request',
    reason: 'I need a laptop for work under ₹70,000 with good battery life.',
    result: 'Received',
    category: 'Agent'
  },
  {
    id: 'aud_002',
    timestamp: '09:42:03',
    actor: 'Growth Tool',
    action: 'Recommended mouse',
    reason: 'Frequently bought together with Laptop A (84% historical pairing rate)',
    amount: 1500,
    result: 'Suggested',
    category: 'Growth'
  },
  {
    id: 'aud_003',
    timestamp: '09:42:07',
    actor: 'Buyer',
    action: 'Accepted offer',
    reason: 'User approved cross-sell add-on of Wireless Mouse',
    amount: 1500,
    result: 'Approved',
    category: 'Growth'
  },
  {
    id: 'aud_004',
    timestamp: '09:42:08',
    actor: 'Policy Tool',
    action: 'Transaction check',
    reason: 'Total ₹66,500 is within merchant ₹70,000 limit & Electronics category',
    amount: 66500,
    result: 'Allowed',
    category: 'Policy'
  },
  {
    id: 'aud_005',
    timestamp: '09:42:09',
    actor: 'Payment Tool',
    action: 'Create Razorpay order',
    reason: 'Policy engine verification passed successfully',
    amount: 66500,
    result: 'Created',
    category: 'Payment'
  },
  {
    id: 'aud_006',
    timestamp: '09:42:15',
    actor: 'Payment Tool',
    action: 'Test payment execution',
    reason: 'Razorpay webhook confirmation: order_123 paid',
    amount: 66500,
    result: 'Successful',
    category: 'Payment'
  },
  {
    id: 'aud_007',
    timestamp: '08:15:20',
    actor: 'AI Buyer',
    action: 'Purchase request',
    reason: 'Request for Pro Studio Laptop C (₹75,000)',
    amount: 75000,
    result: 'Received',
    category: 'Agent'
  },
  {
    id: 'aud_008',
    timestamp: '08:15:22',
    actor: 'Policy Tool',
    action: 'Transaction limit check',
    reason: 'Purchase total ₹75,000 exceeds merchant maximum limit ₹70,000',
    amount: 75000,
    result: 'Blocked',
    category: 'Blocked'
  }
];
