import { AgentEvent } from '../types';

export const INITIAL_AGENT_EVENTS: AgentEvent[] = [
  {
    id: 'evt_1',
    toolName: 'ORCHESTRATOR',
    timestamp: '09:42:01',
    status: 'Completed',
    explanation: 'Buyer request received: "Buy a work laptop under ₹70,000". Initializing tool execution chain.',
    inputData: 'Query: "work laptop under ₹70,000 with good battery life"',
    outputData: 'Intent: Purchase, Category: Electronics, Max Budget: ₹70,000'
  },
  {
    id: 'evt_2',
    toolName: 'CATALOG TOOL',
    timestamp: '09:42:02',
    status: 'Completed',
    explanation: 'Found 3 laptops matching budget and work requirements in structured merchant catalog.',
    inputData: 'Filter: { category: "Electronics", maxPrice: 70000 }',
    outputData: 'Matched: Laptop A (₹65,000), Laptop B (₹58,000)'
  },
  {
    id: 'evt_3',
    toolName: 'GROWTH TOOL',
    timestamp: '09:42:04',
    status: 'Completed',
    explanation: 'Mouse recommended because it is frequently bought with Laptop A (84% co-purchase correlation).',
    inputData: 'Main Product: "Laptop A" (prod_lap_a)',
    outputData: 'Recommendation: "Wireless Mouse" (prod_mouse, ₹1,500, stock: 25)'
  },
  {
    id: 'evt_4',
    toolName: 'POLICY TOOL',
    timestamp: '09:42:08',
    status: 'Approved',
    explanation: 'Total ₹66,500 is below maximum transaction limit ₹70,000. All items belong to allowed categories.',
    inputData: 'Order Total: ₹66,500, Limit: ₹70,000',
    outputData: 'Status: ALLOWED'
  },
  {
    id: 'evt_5',
    toolName: 'PAYMENT TOOL',
    timestamp: '09:42:09',
    status: 'Completed',
    explanation: 'Razorpay test order created. Payment link generated and authorized.',
    inputData: 'Order ID: order_123, Amount: 6650000 (paise)',
    outputData: 'Razorpay Payment ID: pay_Nz82XyL19aK001, Status: SUCCESSFUL'
  }
];
