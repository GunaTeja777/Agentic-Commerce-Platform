'use client';

import React, { useState, useRef } from 'react';
import { useCommerce } from '@/context/CommerceContext';
import { apiService } from '@/lib/services/api';
import { Product } from '@/lib/types';
import {
  Bot,
  Cpu,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Check,
  Clock,
  Send
} from 'lucide-react';

import { formatINR } from '@/lib/format';

type AgentStatus =
  | 'idle'
  | 'receiving_request'
  | 'searching_catalog'
  | 'product_selected'
  | 'growth_recommendation'
  | 'awaiting_buyer_approval'
  | 'building_basket'
  | 'checking_policy'
  | 'policy_blocked'
  | 'ready_for_payment'
  | 'payment_pending'
  | 'payment_verifying'
  | 'completed'
  | 'failed';

interface ChatMessage {
  id: string;
  sender: 'buyer' | 'merchant' | 'system';
  senderLabel: string;
  content: string;
  timestamp: string;
  structured?: boolean;
}

interface StructuredBuyerRequest {
  buyer_id: string;
  intent: string;
  category: string;
  budget_inr: number;
  preferences: {
    use_case: string;
    priority: string;
  };
}

function parsePromptDetails(prompt: string) {
  let budget = 70000;
  // Match k shorthand e.g. 60k, 50k, 70k
  const kMatch = prompt.match(/(?:under|below|budget|max|limit|rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*k\b/i);
  // Match full number e.g. 60,000 or ₹60,000 or 60000
  const numMatch = prompt.match(/(?:under|below|budget|max|limit|rs\.?|₹)\s*([\d,]+)/i) || prompt.match(/₹\s*([\d,]+)/) || prompt.match(/\b(\d{4,7})\b/);
  
  if (kMatch) {
    budget = parseFloat(kMatch[1]) * 1000;
  } else if (numMatch) {
    const cleanNum = parseInt(numMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(cleanNum) && cleanNum > 0) {
      budget = cleanNum;
    }
  }

  let category = 'laptop';
  let categoryLabel = 'Laptops';
  if (/mic|microphone/i.test(prompt)) {
    category = 'mic';
    categoryLabel = 'Audio & Microphones';
  } else if (/headphone|earphone|headset|audio|speaker/i.test(prompt)) {
    category = 'headphones';
    categoryLabel = 'Audio';
  } else if (/monitor|display|screen/i.test(prompt)) {
    category = 'monitor';
    categoryLabel = 'Monitors';
  } else if (/laptop|macbook|notebook|computer|pc/i.test(prompt)) {
    category = 'laptop';
    categoryLabel = 'Laptops';
  } else if (/mouse|trackpad/i.test(prompt)) {
    category = 'mouse';
    categoryLabel = 'Peripherals';
  } else if (/keyboard/i.test(prompt)) {
    category = 'keyboard';
    categoryLabel = 'Peripherals';
  } else if (/phone|mobile/i.test(prompt)) {
    category = 'smartphone';
    categoryLabel = 'Smartphones';
  } else if (/bag|backpack/i.test(prompt)) {
    category = 'bag';
    categoryLabel = 'Accessories';
  } else {
    // Dynamic fallback to first non-stopword
    const cleanWords = prompt.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => !['i', 'need', 'a', 'an', 'the', 'for', 'under', 'below', 'with', 'want', 'to', 'buy', 'find', 'get', 'in', 'rs', 'inr', 'rupees'].includes(w));
    if (cleanWords.length > 0) {
      category = cleanWords[0];
      categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
    }
  }

  let useCase = 'work';
  if (/gaming|game/i.test(prompt)) useCase = 'gaming';
  else if (/student|college|study/i.test(prompt)) useCase = 'study';
  else if (/creator|video|stream|audio|music|edit/i.test(prompt)) useCase = 'creative';
  else if (/travel|portable/i.test(prompt)) useCase = 'travel';

  let priority = 'productivity';
  if (/battery/i.test(prompt)) priority = 'Good battery';
  else if (/clarity|clear|sound|voice/i.test(prompt)) priority = 'High clarity';
  else if (/noise\s*cancellation|anc/i.test(prompt)) priority = 'Noise cancellation';
  else if (/wireless|bluetooth/i.test(prompt)) priority = 'Wireless';
  else if (/lightweight|portable/i.test(prompt)) priority = 'Lightweight';

  return { budget, category, categoryLabel, useCase, priority };
}

export default function LiveDemoPage() {
  const { products, policy, refreshCommerceData, payWithRazorpay, auditEvents } = useCommerce();

  // Demo flow states
  const [agentState, setAgentState] = useState<AgentStatus>('idle');
  const [buyerInput, setBuyerInput] = useState('I need a laptop for work under ₹60,000.');
  const [structuredRequest, setStructuredRequest] = useState<StructuredBuyerRequest | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Selected product & recommendation
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [recommendation, setRecommendation] = useState<{
    id: string;
    name: string;
    price: number;
    reason: string;
    source: string;
    stock: number;
  } | null>(null);
  
  // Basket & Decision states
  const [buyerDecision, setBuyerDecision] = useState<'pending' | 'accepted' | 'skipped' | null>(null);
  const [basketItems, setBasketItems] = useState<Array<{ name: string; price: number; isUpsell?: boolean; id?: string }>>([]);
  const [policyDecision, setPolicyDecision] = useState<{ allowed: boolean; reason: string; maxLimit: number } | null>(null);
  
  // Order & Payment states
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
  const [capturedPaymentId, setCapturedPaymentId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [timelineSteps, setTimelineSteps] = useState<Array<{ id: string; label: string; detail?: string; status: 'pending' | 'active' | 'done' | 'blocked' | 'failed' }>>([]);

  const auditEndRef = useRef<HTMLDivElement>(null);

  // Dynamic live parsed prompt intent
  const liveParsed = parsePromptDetails(buyerInput);
  const effectiveBudget = structuredRequest?.budget_inr || liveParsed.budget;
  const effectiveCategory = structuredRequest?.category || liveParsed.category;
  const effectiveUseCase = structuredRequest?.preferences?.use_case || liveParsed.useCase;
  const effectivePriority = structuredRequest?.preferences?.priority || liveParsed.priority;

  // Initialize products fallback
  const laptopItem: Product = products.find(p => p.category === 'Laptops') || {
    id: '1001',
    name: 'NovaBook Pro 14',
    category: 'Laptops',
    price: 65000,
    stock: 50,
    description: 'Flagship 14-inch professional laptop',
    agentReadableStatus: 'Available' as const,
    compatibleProducts: ['1021', '1022'],
    frequentlyBoughtWith: ['1021'],
    specifications: { rating: '4.7', battery: '14 Hours' }
  };

  const mouseItem: Product = products.find(p => p.name.includes('Mouse')) || {
    id: '1021',
    name: 'AeroMouse X1',
    category: 'Accessories',
    price: 1500,
    stock: 49,
    description: 'Precision wireless ergonomic mouse',
    agentReadableStatus: 'Available' as const,
    compatibleProducts: [],
    frequentlyBoughtWith: [],
    specifications: {}
  };

  const monitorItem: Product = products.find(p => p.category === 'Monitors') || {
    id: '1006',
    name: 'UltraView 27 4K Monitor',
    category: 'Monitors',
    price: 12000,
    stock: 20,
    description: '27-inch 4K UHD designer monitor',
    agentReadableStatus: 'Available' as const,
    compatibleProducts: [],
    frequentlyBoughtWith: [],
    specifications: {}
  };

  // Reset Demo State
  const handleResetDemo = (keepInput: boolean = false) => {
    setAgentState('idle');
    if (!keepInput) {
      setBuyerInput('I need a laptop for work under ₹60,000.');
      setStructuredRequest(null);
    }
    setMessages([]);
    setSelectedProduct(null);
    setRecommendation(null);
    setBuyerDecision(null);
    setBasketItems([]);
    setPolicyDecision(null);
    setCurrentOrderId(null);
    setCapturedPaymentId(null);
    setIsProcessing(false);
    setErrorMessage(null);
    setTimelineSteps([]);
  };

  // Run the primary demo flow dynamically based on user prompt & LangGraph Agent API
  const handleStartDemo = async (customPrompt?: string) => {
    const query = customPrompt || buyerInput;
    handleResetDemo(true);
    setIsProcessing(true);
    const now = new Date().toLocaleTimeString('en-US', { hour12: false });

    const parsed = parsePromptDetails(query);

    // 1. Structured Buyer Request (Curated via LLM / Rule Fallback)
    let structured: StructuredBuyerRequest = {
      buyer_id: 'demo-ai-buyer',
      intent: `purchase_${parsed.category}`,
      category: parsed.category,
      budget_inr: parsed.budget,
      preferences: {
        use_case: parsed.useCase,
        priority: parsed.priority
      }
    };

    try {
      const curated = await apiService.curatePrompt(query, 'demo-ai-buyer');
      if (curated && curated.structured_request) {
        structured = curated.structured_request;
      }
    } catch (e) {
      console.warn('Could not curate via LLM, using parsed local fallback:', e);
    }
    setStructuredRequest(structured);

    setMessages([
      {
        id: 'msg-1',
        sender: 'buyer',
        senderLabel: 'AI Buyer',
        content: query,
        timestamp: now
      }
    ]);

    // Update timeline & agent state: Searching
    setAgentState('searching_catalog');
    setTimelineSteps([
      { id: 't1', label: 'Request received', detail: `Curated intent: ${structured.category} for ${structured.preferences.use_case}, budget ₹${formatINR(structured.budget_inr)}`, status: 'done' },
      { id: 't2', label: 'LangGraph Orchestrator', detail: `Querying Catalog Tool for ${structured.category} under ₹${formatINR(structured.budget_inr)}`, status: 'active' }
    ]);

    try {
      // 2. Real API call to LangGraph Agent
      const agentRes = await apiService.chatAgent({
        message: query,
        merchant_id: 1,
        buyer_id: 'demo-ai-buyer'
      });

      if (agentRes.selected_product) {
        const prod: Product = {
          id: String(agentRes.selected_product.product_id),
          name: agentRes.selected_product.product_name,
          category: agentRes.selected_product.category || parsed.categoryLabel,
          price: agentRes.selected_product.price_inr,
          stock: agentRes.selected_product.stock_quantity || 15,
          description: agentRes.selected_product.description || '',
          compatibleProducts: agentRes.selected_product.tags || [],
          frequentlyBoughtWith: [],
          agentReadableStatus: 'Available',
          specifications: {}
        };
        setSelectedProduct(prod);

        // 3. Growth recommendation from LangGraph Growth Tool
        if (agentRes.recommendations && agentRes.recommendations.length > 0) {
          const rec = agentRes.recommendations[0];
          const recName = rec.name || 'Recommended Accessory';
          const recPrice = rec.price_inr || 0;
          setRecommendation({
            id: String(rec.id),
            name: recName,
            price: recPrice,
            reason: rec.reason || 'Frequently bought together with this product',
            source: 'Merchant catalog relationship',
            stock: rec.stock || 20
          });

          setAgentState('awaiting_buyer_approval');
          setTimelineSteps(prev => [
            ...prev.map(s => s.id === 't2' ? { ...s, status: 'done' as const } : s),
            { id: 't3', label: 'Product selected', detail: `${prod.name} — ₹${formatINR(prod.price)}`, status: 'done' },
            { id: 't4', label: 'Growth Tool', detail: 'Found data-backed upsell opportunity', status: 'done' },
            { id: 't5', label: 'Waiting for buyer approval', detail: `Proposed ${recName} (+₹${formatINR(recPrice)})`, status: 'active' }
          ]);
        } else {
          setAgentState('building_basket');
          setTimelineSteps(prev => [
            ...prev.map(s => s.id === 't2' ? { ...s, status: 'done' as const } : s),
            { id: 't3', label: 'Product selected', detail: `${prod.name} — ₹${formatINR(prod.price)}`, status: 'done' }
          ]);
        }

        setBasketItems([{ name: prod.name, price: prod.price, isUpsell: false, id: prod.id }]);

        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: 'merchant',
            senderLabel: 'Merchant AI Agent (LangGraph)',
            content: agentRes.message || `I found the ${prod.name} for ₹${formatINR(prod.price)}.`,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
          }
        ]);
      } else {
        // No product matched or blocked by search constraints
        setAgentState(agentRes.status === 'blocked' ? 'policy_blocked' : 'failed');
        setTimelineSteps(prev => [
          ...prev.map(s => s.id === 't2' ? { ...s, status: 'done' as const } : s),
          { id: 't3', label: 'Catalog search result', detail: agentRes.message || 'No products found within budget', status: 'blocked' }
        ]);

        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: 'merchant',
            senderLabel: 'Merchant AI Agent (LangGraph)',
            content: agentRes.message || `No product found matching your requirements.`,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
          }
        ]);
      }
    } catch (e: unknown) {
      console.warn('Agent API unreachable, using robust fallback workflow:', e);
      // Fallback matching in case agent server is restarting
      let matchedItem = laptopItem;
      const found = products.find(p => 
        (p.category.toLowerCase().includes(parsed.category) || p.name.toLowerCase().includes(parsed.category)) &&
        p.price <= parsed.budget
      ) || products.find(p => 
        p.category.toLowerCase().includes(parsed.category) || p.name.toLowerCase().includes(parsed.category)
      );
      if (found) matchedItem = found;

      setSelectedProduct(matchedItem);
      setAgentState('product_selected');
      setTimelineSteps(prev => [
        ...prev.map(s => s.id === 't2' ? { ...s, status: 'done' as const } : s),
        { id: 't3', label: 'Product selected', detail: `${matchedItem.name} — ₹${formatINR(matchedItem.price)}`, status: 'done' },
        { id: 't4', label: 'Growth Tool', detail: 'Checking data-backed merchant relationships', status: 'active' }
      ]);

      const recItem = mouseItem;
      setRecommendation({
        id: recItem.id,
        name: recItem.name,
        price: recItem.price,
        reason: `Frequently bought with ${matchedItem.name}`,
        source: 'Merchant catalog relationship',
        stock: recItem.stock
      });

      setAgentState('awaiting_buyer_approval');
      setTimelineSteps(prev => [
        ...prev.map(s => s.id === 't4' ? { ...s, status: 'done' as const } : s),
        { id: 't5', label: 'Waiting for buyer approval', detail: `Proposed ${recItem.name} (+₹${formatINR(recItem.price)})`, status: 'active' }
      ]);

      setBasketItems([{ name: matchedItem.name, price: matchedItem.price, isUpsell: false, id: matchedItem.id }]);

      setMessages(prev => [
        ...prev,
        {
          id: 'msg-2',
          sender: 'merchant',
          senderLabel: 'Merchant AI Agent',
          content: `I found the ${matchedItem.name} for ₹${formatINR(matchedItem.price)}. It matches your ${parsed.useCase} requirement (Budget: ₹${formatINR(parsed.budget)}). Stock: ${matchedItem.stock} available.`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
        },
        {
          id: 'msg-3',
          sender: 'merchant',
          senderLabel: 'Merchant AI Agent',
          content: `A compatible ${recItem.name} is frequently bought with this product and is available for ₹${formatINR(recItem.price)}. Would you like to add it?`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Buyer Decision Action (Accept / Skip Recommendation)
  const handleBuyerDecision = async (accepted: boolean) => {
    setIsProcessing(true);
    setBuyerDecision(accepted ? 'accepted' : 'skipped');

    const decisionTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    const recLabel = recommendation?.name || 'recommended accessory';
    const prodLabel = selectedProduct?.name || 'base product';
    const buyerMsg = accepted ? `Yes, add the ${recLabel}.` : `No, proceed with the ${prodLabel} only.`;

    setMessages(prev => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: 'buyer',
        senderLabel: 'AI Buyer',
        content: buyerMsg,
        timestamp: decisionTime
      }
    ]);

    // Update basket
    const baseProd = selectedProduct || laptopItem;
    const updatedBasket = [
      { name: baseProd.name, price: baseProd.price, isUpsell: false, id: baseProd.id }
    ];
    if (accepted && recommendation) {
      updatedBasket.push({
        name: recommendation.name,
        price: recommendation.price,
        isUpsell: true,
        id: recommendation.id
      });
    }
    setBasketItems(updatedBasket);

    // Timeline update: Basket updated -> Checking Policy
    setAgentState('checking_policy');
    const recName = recommendation?.name || mouseItem.name;
    setTimelineSteps(prev => [
      ...prev.map(s => s.id === 't5' ? { ...s, status: 'done' as const } : s),
      { id: 't6', label: 'Basket updated', detail: accepted ? `Added ${recName}` : 'Upsell skipped', status: 'done' },
      { id: 't7', label: 'Policy Tool', detail: 'Checking transaction limit', status: 'active' }
    ]);

    await new Promise(r => setTimeout(r, 600));

    const totalAmount = updatedBasket.reduce((sum, item) => sum + item.price, 0);

    // Call real backend Policy Check / Order creation
    try {
      const orderPayloadItems = [
        { product_id: Number(baseProd.id) || 1001, quantity: 1 }
      ];
      if (accepted && recommendation) {
        orderPayloadItems.push({ product_id: Number(recommendation.id) || 1021, quantity: 1 });
      }

      // 1. Create Order & Check Policy in backend
      const orderRes = await apiService.createOrder(1, 'demo-ai-buyer', orderPayloadItems);
      setCurrentOrderId(orderRes.order_id);

      const isPolicyAllowed = orderRes.policy_allowed;
      setPolicyDecision({
        allowed: isPolicyAllowed,
        reason: orderRes.policy_reason || `Transaction is within the merchant's maximum transaction limit of ₹${formatINR(policy.maxTransactionLimit)}.`,
        maxLimit: policy.maxTransactionLimit
      });

      if (isPolicyAllowed) {
        setAgentState('ready_for_payment');
        setTimelineSteps(prev => [
          ...prev.map(s => s.id === 't7' ? { ...s, status: 'done' as const } : s),
          { id: 't8', label: 'Policy approved', detail: `₹${formatINR(totalAmount)} <= ₹${formatINR(policy.maxTransactionLimit)}`, status: 'done' },
          { id: 't9', label: 'Ready for payment', detail: `Created payable order ORD-${orderRes.order_id}`, status: 'active' }
        ]);

        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            sender: 'merchant',
            senderLabel: 'Merchant AI Agent',
            content: `Your basket is ₹${formatINR(totalAmount)}. The merchant policy allows transactions up to ₹${formatINR(policy.maxTransactionLimit)}. Your order (ORD-${orderRes.order_id}) is ready for payment.`,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
          }
        ]);
      } else {
        setAgentState('policy_blocked');
        setTimelineSteps(prev => [
          ...prev.map(s => s.id === 't7' ? { ...s, status: 'blocked' as const } : s),
          { id: 't8', label: 'Policy blocked', detail: orderRes.policy_reason || 'Exceeds limit', status: 'blocked' }
        ]);
      }

      await refreshCommerceData();
    } catch (e: unknown) {
      console.warn('Backend order creation fallback:', e);
      const isAllowed = totalAmount <= policy.maxTransactionLimit;
      setPolicyDecision({
        allowed: isAllowed,
        reason: isAllowed
          ? "Transaction is within the merchant's maximum transaction limit."
          : `Total ₹${formatINR(totalAmount)} exceeds ₹${formatINR(policy.maxTransactionLimit)} limit.`,
        maxLimit: policy.maxTransactionLimit
      });
      if (isAllowed) {
        setAgentState('ready_for_payment');
        setTimelineSteps(prev => [
          ...prev.map(s => s.id === 't7' ? { ...s, status: 'done' as const } : s),
          { id: 't8', label: 'Policy approved', detail: `₹${formatINR(totalAmount)} <= ₹${formatINR(policy.maxTransactionLimit)}`, status: 'done' },
          { id: 't9', label: 'Ready for payment', detail: 'Ready for Razorpay checkout', status: 'active' }
        ]);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Run Blocked Scenario Demo: Laptop (₹65,000) + Monitor (₹12,000) = ₹77,000 > ₹70,000
  const handleRunBlockedScenario = async () => {
    handleResetDemo();
    setIsProcessing(true);
    const now = new Date().toLocaleTimeString('en-US', { hour12: false });

    const promptText = 'I need a workstation laptop with an UltraView 4K monitor.';
    setBuyerInput(promptText);

    // 1. Structured Buyer Request
    const structured: StructuredBuyerRequest = {
      buyer_id: 'demo-ai-buyer',
      intent: 'purchase',
      category: 'workstation',
      budget_inr: 80000,
      preferences: {
        use_case: 'video_editing',
        priority: 'high_resolution'
      }
    };
    setStructuredRequest(structured);

    setMessages([
      {
        id: 'msg-1',
        sender: 'buyer',
        senderLabel: 'AI Buyer',
        content: promptText,
        timestamp: now
      }
    ]);

    setAgentState('searching_catalog');
    setTimelineSteps([
      { id: 't1', label: 'Request received', detail: 'High-end multi-item request', status: 'done' },
      { id: 't2', label: 'Catalog Tool', detail: 'Selecting NovaBook Pro 14 & UltraView Monitor', status: 'active' }
    ]);

    await new Promise(r => setTimeout(r, 600));

    setSelectedProduct(laptopItem);
    const blockedBasket = [
      { name: laptopItem.name, price: laptopItem.price, isUpsell: false },
      { name: monitorItem.name, price: monitorItem.price, isUpsell: true }
    ];
    setBasketItems(blockedBasket);
    const totalBlockedAmount = laptopItem.price + monitorItem.price; // ₹77,000

    setTimelineSteps(prev => [
      ...prev.map(s => s.id === 't2' ? { ...s, status: 'done' as const } : s),
      { id: 't3', label: 'Products selected', detail: `${laptopItem.name} + ${monitorItem.name} (₹${totalBlockedAmount.toLocaleString()})`, status: 'done' },
      { id: 't4', label: 'Policy Tool', detail: 'Evaluating ₹77,000 against policy limit ₹70,000', status: 'active' }
    ]);
    setAgentState('checking_policy');

    await new Promise(r => setTimeout(r, 600));

    // Send order to backend - policy engine strictly flags blocked
    try {
      const orderRes = await apiService.createOrder(1, 'demo-ai-buyer', [
        { product_id: Number(laptopItem.id), quantity: 1 },
        { product_id: Number(monitorItem.id), quantity: 1 }
      ]);
      setCurrentOrderId(orderRes.order_id);
    } catch (e) {
      console.warn('Backend policy error:', e);
    }

    setPolicyDecision({
      allowed: false,
      reason: `Transaction total ₹${totalBlockedAmount.toLocaleString()} exceeds merchant's maximum limit of ₹${policy.maxTransactionLimit.toLocaleString()}. Payment Tool was NOT called.`,
      maxLimit: policy.maxTransactionLimit
    });

    setAgentState('policy_blocked');
    setTimelineSteps(prev => [
      ...prev.map(s => s.id === 't4' ? { ...s, status: 'blocked' as const } : s),
      { id: 't5', label: '✕ Policy Blocked', detail: `Total ₹${totalBlockedAmount.toLocaleString()} > ₹${policy.maxTransactionLimit.toLocaleString()}`, status: 'blocked' },
      { id: 't6', label: 'Payment Tool: NOT CALLED', detail: '0 Razorpay API calls made', status: 'blocked' }
    ]);

    setMessages(prev => [
      ...prev,
      {
        id: 'msg-2',
        sender: 'merchant',
        senderLabel: 'Merchant AI Agent',
        content: `I selected the ${laptopItem.name} (₹${laptopItem.price.toLocaleString()}) and ${monitorItem.name} (₹${monitorItem.price.toLocaleString()}).`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
      },
      {
        id: 'msg-3',
        sender: 'merchant',
        senderLabel: 'Merchant AI Agent',
        content: `I can't proceed because the transaction total of ₹${totalBlockedAmount.toLocaleString()} exceeds the merchant's ₹${policy.maxTransactionLimit.toLocaleString()} transaction limit. No payment was attempted.`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
      }
    ]);

    await refreshCommerceData();
    setIsProcessing(false);
  };

  // Simulate Payment Failure Demo
  const handleSimulatePaymentFailure = async () => {
    if (!currentOrderId) {
      // First start standard demo to get an order
      await handleStartDemo();
      return;
    }
    try {
      setIsProcessing(true);
      await apiService.failPayment(currentOrderId, 'Simulated payment failure (Bank declined)');
      setAgentState('failed');
      setErrorMessage('Payment was not completed. No successful transaction was recorded.');
      
      setTimelineSteps(prev => [
        ...prev,
        { id: 't_fail', label: 'Payment Failed', detail: 'Bank declined in Test Mode. No auto-retry.', status: 'failed' }
      ]);

      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'merchant',
          senderLabel: 'Merchant AI Agent',
          content: 'The payment was not completed. No successful transaction was recorded.',
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
        }
      ]);

      await refreshCommerceData();
    } catch (e: unknown) {
      console.error('Failure trigger error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Pay with Razorpay Checkout Modal
  const handlePayWithRazorpay = async () => {
    if (!currentOrderId) return;
    const totalAmount = basketItems.reduce((sum, item) => sum + item.price, 0);

    setAgentState('payment_pending');
    setErrorMessage(null);

    setTimelineSteps(prev => [
      ...prev.map(s => s.id === 't9' ? { ...s, status: 'done' as const } : s),
      { id: 't10', label: 'Razorpay Checkout', detail: 'Opening secure Test Mode checkout', status: 'active' }
    ]);

    try {
      await payWithRazorpay({
        orderId: currentOrderId,
        amountInr: totalAmount,
        description: `Order #${currentOrderId} - Agentic Commerce (Test Mode)`,
        onSuccess: async (verifyData) => {
          setAgentState('completed');
          setCapturedPaymentId(verifyData.razorpay_payment_id || `pay_test_${Math.random().toString(36).substring(2, 9)}`);
          
          setTimelineSteps(prev => [
            ...prev.map(s => s.id === 't10' ? { ...s, status: 'done' as const } : s),
            { id: 't11', label: 'Payment verified', detail: `Cryptographic HMAC SHA-256 signature verified (${verifyData.razorpay_payment_id})`, status: 'done' },
            { id: 't12', label: 'Transaction captured', detail: `Recorded in PostgreSQL & Audit Trail (₹${totalAmount.toLocaleString()})`, status: 'done' }
          ]);

          setMessages(prev => [
            ...prev,
            {
              id: `msg-${Date.now()}`,
              sender: 'merchant',
              senderLabel: 'Merchant AI Agent',
              content: `Payment verified (${verifyData.razorpay_payment_id}). Your order is complete and captured in Razorpay Test Mode.`,
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
            },
            {
              id: `msg-${Date.now() + 1}`,
              sender: 'buyer',
              senderLabel: 'AI Buyer',
              content: 'Purchase completed successfully. Transaction receipt stored.',
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
            }
          ]);

          await refreshCommerceData();
        },
        onFailure: async (err) => {
          setAgentState('failed');
          const errDesc = 'description' in err && typeof err.description === 'string'
            ? err.description
            : err instanceof Error
            ? err.message
            : 'Payment failed';
          setErrorMessage(errDesc);

          setTimelineSteps(prev => [
            ...prev.map(s => s.id === 't10' ? { ...s, status: 'failed' as const } : s),
            { id: 't11', label: 'Payment Failed', detail: errDesc, status: 'failed' }
          ]);

          setMessages(prev => [
            ...prev,
            {
              id: `msg-${Date.now()}`,
              sender: 'merchant',
              senderLabel: 'Merchant AI Agent',
              content: `The payment was not completed: ${errDesc}. No successful transaction was recorded.`,
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
            }
          ]);

          await refreshCommerceData();
        }
      });
    } catch (err: unknown) {
      console.error('Razorpay initialization error:', err);
      const msg = err instanceof Error ? err.message : 'Checkout invocation failed';
      setErrorMessage(msg);
      setAgentState('failed');
    }
  };

  const calculatedTotal = basketItems.reduce((acc, curr) => acc + curr.price, 0);
  const isBasketWithinBudget = calculatedTotal <= effectiveBudget;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Agentic Commerce
            </h1>
            <span className="text-slate-400 font-medium">|</span>
            <span className="text-sm font-semibold text-slate-700">Demo Merchant</span>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              TEST MODE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Agent-to-agent commerce with merchant-side revenue optimization and deterministic policy enforcement.
          </p>
        </div>

        {/* Demo Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleStartDemo()}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-xs disabled:bg-slate-300"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Demo</span>
          </button>

          <button
            onClick={handleRunBlockedScenario}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs transition-colors disabled:opacity-50"
            title="Demonstrate policy gate blocking ₹77,000 basket (0 Razorpay calls)"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Run Blocked Scenario</span>
          </button>

          <button
            onClick={handleSimulatePaymentFailure}
            disabled={isProcessing || !currentOrderId}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors disabled:opacity-40"
            title="Simulate a declined payment"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Simulate Payment Failure</span>
          </button>

          <button
            onClick={() => handleResetDemo(false)}
            disabled={isProcessing}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-medium text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* Main 3-Column Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: AI BUYER (4 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col space-y-4">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">AI Buyer</h2>
                <p className="text-[11px] text-purple-700 font-medium">Buyer-side agent</p>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-semibold border border-purple-200">
              demo-ai-buyer
            </span>
          </div>

          {/* Buyer Profile Card */}
          <div className="px-5 space-y-3">
            <div className="bg-purple-50/70 border border-purple-200/80 rounded-lg p-3.5 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-600">
                <span>Buyer:</span>
                <span className="font-semibold text-slate-900">Demo Buyer</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Intent:</span>
                <span className="font-medium text-purple-950 font-mono text-[11px]">&quot;Buy {effectiveCategory} for {effectiveUseCase}&quot;</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Budget:</span>
                <span className="font-mono font-bold text-slate-900 text-xs" suppressHydrationWarning>₹{formatINR(effectiveBudget)}</span>
              </div>
              <div className="border-t border-purple-200/60 pt-2 space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 block">Preferences:</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 bg-white text-purple-900 border border-purple-200 rounded text-[10px]">
                    {effectivePriority}
                  </span>
                  <span className="px-2 py-0.5 bg-white text-purple-900 border border-purple-200 rounded text-[10px]">
                    Suitable for {effectiveUseCase}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-purple-200/60">
                <span className="text-[11px]">Authorization:</span>
                <span className="text-[11px] text-emerald-700 font-medium">Accessories under ₹2,000</span>
              </div>
            </div>

            {/* Editable Request Prompt Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Buyer Prompt / Intent:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={buyerInput}
                  onChange={(e) => setBuyerInput(e.target.value)}
                  disabled={isProcessing || agentState !== 'idle'}
                  placeholder="e.g. I need a mic for work under ₹60,000."
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600 disabled:bg-slate-100"
                />
                <button
                  onClick={() => handleStartDemo(buyerInput)}
                  disabled={isProcessing || agentState !== 'idle' || !buyerInput.trim()}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs disabled:bg-slate-300 transition-colors shrink-0"
                >
                  <Send className="w-3 h-3" />
                  <span>Send Request</span>
                </button>
              </div>
            </div>

            {/* Structured Agent-to-Agent Message Card */}
            <div className="space-y-1.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                <span>Structured Commerce Payload</span>
                <span className="font-mono text-[10px] text-purple-600">A2A Format</span>
              </div>
              <div className="bg-slate-900 text-slate-200 p-3 rounded-lg text-[11px] font-mono border border-slate-800 space-y-1 shadow-inner">
                <div className="text-purple-400 font-bold">{'// AI BUYER REQUEST'}</div>
                <div><span className="text-slate-400">intent:</span> &quot;{structuredRequest?.intent || `purchase_${effectiveCategory}`}&quot;</div>
                <div><span className="text-slate-400">category:</span> &quot;{effectiveCategory}&quot;</div>
                <div><span className="text-slate-400">budget:</span> <span suppressHydrationWarning>₹{formatINR(effectiveBudget)}</span></div>
                <div><span className="text-slate-400">use_case:</span> &quot;{effectiveUseCase}&quot;</div>
                <div><span className="text-slate-400">priority:</span> &quot;{effectivePriority}&quot;</div>
              </div>
            </div>

            {/* Conversation Messages Thread */}
            <div className="border-t border-slate-200 pt-3 pb-4 space-y-2.5 max-h-[300px] overflow-y-auto">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Agent Conversation Thread
              </span>

              {messages.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-3 text-center">
                  Click &quot;Start Demo&quot; or &quot;Send Request&quot; to initiate agent conversation.
                </p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-start gap-2 text-xs p-2.5 rounded-lg ${
                      m.sender === 'buyer'
                        ? 'bg-purple-50 text-purple-950 border border-purple-200'
                        : 'bg-indigo-50 text-indigo-950 border border-indigo-200'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5 text-white bg-slate-700">
                      {m.sender === 'buyer' ? 'AB' : 'MA'}
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className={m.sender === 'buyer' ? 'text-purple-900' : 'text-indigo-900'}>
                          {m.senderLabel}
                        </span>
                        <span className="text-slate-400 font-mono font-normal">{m.timestamp}</span>
                      </div>
                      <p className="leading-relaxed">{m.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CENTER COLUMN: MERCHANT AGENT (4.5 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col space-y-4">
          {/* Header Bar */}
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">Merchant AI Agent</h2>
                <p className="text-[11px] text-indigo-700 font-medium">LangGraph Tool Orchestrator</p>
              </div>
            </div>

            {/* Status Pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 border border-slate-200">
              <span className={`w-2 h-2 rounded-full ${
                agentState === 'completed' ? 'bg-emerald-500' :
                agentState === 'policy_blocked' || agentState === 'failed' ? 'bg-rose-500' :
                agentState === 'idle' ? 'bg-slate-400' : 'bg-indigo-600 animate-ping'
              }`} />
              <span className="text-slate-700">{agentState.replace(/_/g, ' ')}</span>
            </div>
          </div>

          <div className="px-5 space-y-4 pb-5">
            {/* Execution Timeline */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Execution Timeline
              </span>
              
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
                {timelineSteps.length === 0 ? (
                  <p className="text-slate-400 italic text-[11px]">Timeline awaits incoming purchase request...</p>
                ) : (
                  timelineSteps.map((step) => (
                    <div key={step.id} className="flex items-start gap-2.5">
                      {step.status === 'done' ? (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : step.status === 'blocked' ? (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      ) : step.status === 'failed' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <Clock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5 animate-spin" />
                      )}
                      <div className="space-y-0.5">
                        <span className={`font-semibold ${
                          step.status === 'done' ? 'text-slate-900' :
                          step.status === 'blocked' ? 'text-rose-700' :
                          step.status === 'failed' ? 'text-amber-700' : 'text-indigo-700'
                        }`}>
                          {step.label}
                        </span>
                        {step.detail && (
                          <p className="text-[11px] text-slate-500">{step.detail}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Product Result Card */}
            {selectedProduct && (
              <div className="border border-slate-200 bg-white rounded-lg p-4 space-y-3 shadow-2xs animate-in fade-in duration-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{selectedProduct.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{selectedProduct.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-sm text-slate-900">
                      ₹{selectedProduct.price.toLocaleString()}
                    </span>
                    <span className="block text-[10px] text-emerald-700 font-semibold">
                      In stock: {selectedProduct.stock}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium">
                    Rating: 4.7 ★
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium">
                    work
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium">
                    battery
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium">
                    portable
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[11px]">
                  <span className="text-indigo-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Selected by Merchant Agent
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">Catalog Tool</span>
                </div>
              </div>
            )}

            {/* Growth Recommendation Card (With Add / Skip buttons) */}
            {recommendation && (
              <div className="border border-indigo-200 bg-indigo-50/40 rounded-lg p-4 space-y-3 shadow-2xs animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-900">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Growth Opportunity</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-900">
                    ₹{recommendation.price.toLocaleString()}
                  </span>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-900">{recommendation.name}</div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Reason: <span className="font-medium text-indigo-950">&quot;{recommendation.reason}&quot;</span>
                  </p>
                </div>

                <div className="text-[10px] space-y-1 bg-white/70 p-2 rounded border border-indigo-100 text-slate-600">
                  <div className="flex justify-between">
                    <span>Source:</span>
                    <span className="font-semibold text-slate-800">{recommendation.source}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stock Available:</span>
                    <span className="font-bold text-emerald-700">{recommendation.stock} in stock</span>
                  </div>
                </div>

                <p className="text-[10px] font-medium text-indigo-700 italic">
                  Recommendation generated from merchant catalog data.
                </p>

                {/* Explicit Separation: Recommendation ≠ Buyer Approval ≠ Policy Approval */}
                {buyerDecision === null ? (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleBuyerDecision(true)}
                      disabled={isProcessing}
                      className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs disabled:bg-slate-300"
                    >
                      [ Add to Basket ]
                    </button>
                    <button
                      onClick={() => handleBuyerDecision(false)}
                      disabled={isProcessing}
                      className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      [ Skip ]
                    </button>
                  </div>
                ) : (
                  <div className="p-2 rounded bg-white border border-slate-200 text-xs font-semibold flex items-center justify-between">
                    <span>Buyer Decision:</span>
                    <span className={buyerDecision === 'accepted' ? 'text-emerald-700 font-bold' : 'text-slate-600'}>
                      {buyerDecision === 'accepted' ? '✓ Recommendation Approved' : '✕ Recommendation Skipped'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: TRANSACTION PANEL & POLICY GATE (3.5 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col space-y-4">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">Transaction</h2>
                <p className="text-[11px] text-emerald-700 font-medium">Policy Gate &amp; Payment Service</p>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold border border-emerald-200">
              ₹70,000 Limit
            </span>
          </div>

          <div className="px-5 space-y-4 pb-5">
            {/* Basket Breakdown Card */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Basket Calculation
              </span>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs">
                {basketItems.length === 0 ? (
                  <div className="flex justify-between text-slate-600">
                    <span>{selectedProduct?.name || laptopItem.name}</span>
                    <span className="font-mono font-medium" suppressHydrationWarning>₹{formatINR(selectedProduct?.price || laptopItem.price)}</span>
                  </div>
                ) : (
                  basketItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{item.name}</span>
                        {item.isUpsell && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 text-[9px] font-bold">
                            Upsell
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold" suppressHydrationWarning>₹{formatINR(item.price)}</span>
                    </div>
                  ))
                )}

                <div className="border-t border-slate-200 pt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-mono font-bold text-slate-900" suppressHydrationWarning>₹{formatINR(calculatedTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Buyer Budget:</span>
                    <span className="font-mono font-bold text-slate-700" suppressHydrationWarning>₹{formatINR(effectiveBudget)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Policy Limit:</span>
                    <span className="font-mono font-bold text-slate-700" suppressHydrationWarning>₹{formatINR(policy.maxTransactionLimit)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-900">Total Calculated:</span>
                  <span className="font-mono font-extrabold text-sm text-slate-900" suppressHydrationWarning>
                    ₹{formatINR(calculatedTotal)}
                  </span>
                </div>

                {isBasketWithinBudget ? (
                  <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 pt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>✓ Within buyer budget</span>
                  </div>
                ) : (
                  <div className="text-[11px] font-bold text-rose-700 flex items-center gap-1 pt-0.5">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>✕ Exceeds buyer budget</span>
                  </div>
                )}
              </div>
            </div>

            {/* POLICY GATE CARD */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Policy Gate
              </span>

              {policyDecision ? (
                <div className={`p-4 rounded-lg border space-y-2 text-xs ${
                  policyDecision.allowed
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50/60 border-rose-200 text-rose-950'
                }`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 font-bold">
                      {policyDecision.allowed ? (
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                      )}
                      <span>POLICY GATE: {policyDecision.allowed ? 'APPROVED' : 'BLOCKED'}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      policyDecision.allowed ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {policyDecision.allowed ? 'ALLOW' : 'BLOCK'}
                    </span>
                  </div>

                  <p className="text-[11px] leading-relaxed text-slate-700">
                    {policyDecision.reason}
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-xs text-center italic">
                  Awaiting basket finalization &amp; policy evaluation.
                </div>
              )}
            </div>

            {/* Error Message if payment failed */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Pay with Razorpay Action Button */}
            {agentState === 'completed' ? (
              <div className="bg-emerald-950 text-white p-4 rounded-xl space-y-3 shadow-md animate-in fade-in duration-300">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>✓ Purchase Completed</span>
                </div>
                <div className="space-y-1 text-xs border-t border-emerald-900/60 pt-2 font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span>Amount:</span>
                    <span className="font-bold text-white">₹{calculatedTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Payment:</span>
                    <span className="text-emerald-400 font-bold">Verified</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Transaction:</span>
                    <span className="text-emerald-400 font-bold">Captured</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Environment:</span>
                    <span>Razorpay Test Mode</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Order ID:</span>
                    <span>ORD-{currentOrderId || '123'}</span>
                  </div>
                  {capturedPaymentId && (
                    <div className="flex justify-between text-slate-300">
                      <span>Payment ID:</span>
                      <span className="text-amber-300">{capturedPaymentId}</span>
                    </div>
                  )}
                </div>
                <a
                  href="#audit-trail-section"
                  className="w-full py-2 px-3 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors block text-center"
                >
                  <span>View Audit Trail</span>
                </a>
              </div>
            ) : policyDecision && policyDecision.allowed && agentState !== 'policy_blocked' && agentState !== 'failed' ? (
              <button
                onClick={handlePayWithRazorpay}
                disabled={isProcessing || agentState === 'payment_pending'}
                className="w-full py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:bg-slate-300"
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {agentState === 'payment_pending'
                    ? 'Opening Razorpay Modal...'
                    : `Pay ₹${calculatedTotal.toLocaleString()} with Razorpay`}
                </span>
              </button>
            ) : agentState === 'policy_blocked' ? (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Payment Tool Not Called (Policy Blocked)</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM AREA: LIVE AUDIT TRAIL */}
      {/* ========================================================================= */}
      <div id="audit-trail-section" className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Live Audit Trail</h2>
            <p className="text-xs text-slate-500">
              Real-time authoritative execution ledger recorded in PostgreSQL
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-600 font-medium">Real Backend Sync</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Reason / Details</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {auditEvents.slice(0, 10).map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                    {evt.timestamp}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      evt.actor === 'AI Buyer' ? 'bg-purple-100 text-purple-800' :
                      evt.actor === 'Policy Tool' ? 'bg-purple-100 text-purple-900 font-bold' :
                      evt.actor === 'Payment Tool' ? 'bg-emerald-100 text-emerald-900 font-bold' :
                      evt.actor === 'Growth Tool' ? 'bg-blue-100 text-blue-900 font-bold' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {evt.actor}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-800 font-semibold">{evt.action}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={evt.reason}>
                    {evt.reason}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">
                    {evt.amount ? `₹${evt.amount.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                      evt.result === 'Allowed' || evt.result === 'Successful'
                        ? 'bg-emerald-100 text-emerald-800'
                        : evt.result === 'Blocked'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {evt.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div ref={auditEndRef} />
      </div>
    </div>
  );
}
