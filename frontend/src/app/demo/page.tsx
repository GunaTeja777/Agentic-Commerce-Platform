'use client';

import React, { useState, useRef } from 'react';
import { useCommerce } from '@/context/CommerceContext';
import { apiService } from '@/lib/services/api';
import { Product, Transaction, AuditEvent } from '@/lib/types';
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
  Send,
  UserCheck
} from 'lucide-react';

import { formatINR } from '@/lib/format';

type AgentStatus =
  | 'idle'
  | 'receiving_request'
  | 'searching_catalog'
  | 'awaiting_product_selection'
  | 'product_selected'
  | 'growth_recommendation'
  | 'awaiting_buyer_approval'
  | 'building_basket'
  | 'checking_policy'
  | 'policy_blocked'
  | 'awaiting_human_authorization'
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
  // Match k shorthand e.g. 60k, 50k, 70k, 1k
  const kMatch = prompt.match(/(?:under|below|budget|within|upto|up to|max|limit|around|for|rs\.?|₹|inr)?\s*(\d+(?:\.\d+)?)\s*k\b/i);
  // Match numbers with prefix or 3-7 digit number e.g. within 1000, 60,000, ₹1000
  const numMatch = prompt.match(/(?:under|below|budget|within|upto|up to|max|limit|around|for|rs\.?|₹|inr)\s*([\d,]+)/i) ||
                   prompt.match(/(?:₹|rs\.?|inr)\s*([\d,]+)/i) ||
                   prompt.match(/\b(\d{3,7})\b/);
  
  if (kMatch) {
    budget = Math.round(parseFloat(kMatch[1]) * 1000);
  } else if (numMatch) {
    const cleanNum = parseInt(numMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(cleanNum) && cleanNum > 0) {
      budget = cleanNum;
    }
  }

  // Extract clean item query
  const cleanedItem = prompt
    .replace(/(?:i\s+need|i\s+want|looking\s+for|please\s+find|find\s+me|get\s+me|buy|order\s+this|order|purchase|checkout|a|an|the)\b/gi, ' ')
    .replace(/(?:under|below|budget|within|upto|up to|max|limit|around|for|rs\.?|₹|inr)\s*[\d,]+(?:\s*k)?/gi, ' ')
    .replace(/\b\d+(?:\.\d+)?\s*k\b/gi, ' ')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let category = cleanedItem || 'laptop';
  let categoryLabel = cleanedItem || 'Laptops';

  if (/mouse\s*pad|mousepad|strikepad|desk\s*pad|mat/i.test(prompt)) {
    category = cleanedItem || 'Mouse Pad';
    categoryLabel = 'Gaming Accessories';
  } else if (/mic|microphone/i.test(prompt)) {
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
  } else if (/organizer|cable|stand|dock|hub|holder|case|sleeve/i.test(prompt)) {
    category = cleanedItem || 'Cable Organizer';
    categoryLabel = 'Accessories';
  }

  let useCase = 'work';
  if (/gaming|game/i.test(prompt)) useCase = 'gaming';
  else if (/student|college|study/i.test(prompt)) useCase = 'study';
  else if (/creator|video|stream|audio|music|edit/i.test(prompt)) useCase = 'creative';
  else if (/travel|portable/i.test(prompt)) useCase = 'travel';

  let priority = 'standard';
  if (/battery/i.test(prompt)) priority = 'Good battery';
  else if (/clarity|clear|sound|voice/i.test(prompt)) priority = 'High clarity';
  else if (/noise\s*cancellation|anc/i.test(prompt)) priority = 'Noise cancellation';
  else if (/wireless|bluetooth/i.test(prompt)) priority = 'Wireless';
  else if (/lightweight|portable/i.test(prompt)) priority = 'Lightweight';
  else if (/budget|cheap|affordable/i.test(prompt)) priority = 'Budget-friendly';

  return { budget, category, categoryLabel, useCase, priority };
}

export default function LiveDemoPage() {
  const { products, policy, refreshCommerceData, auditEvents, addTransaction, addAuditEvent } = useCommerce();

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
  const [candidates, setCandidates] = useState<Array<{
    id: string;
    name: string;
    category: string;
    price_inr: number;
    stock?: number;
    description?: string;
    imageUrl?: string;
  }>>([]);
  
  // Basket & Decision states
  const [buyerDecision, setBuyerDecision] = useState<'pending' | 'accepted' | 'skipped' | null>(null);
  const [basketItems, setBasketItems] = useState<Array<{ name: string; price: number; isUpsell?: boolean; id?: string }>>([]);
  const [policyDecision, setPolicyDecision] = useState<{
    allowed: boolean;
    requiresApproval?: boolean;
    isAutonomous?: boolean;
    reason: string;
    maxLimit: number;
    approvalThreshold?: number;
  } | null>(null);
  
  // Order & Payment states
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);
  const [capturedRazorpayOrderId, setCapturedRazorpayOrderId] = useState<string | null>(null);
  const [capturedPaymentId, setCapturedPaymentId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [timelineSteps, setTimelineSteps] = useState<Array<{ id: string; label: string; detail?: string; status: 'pending' | 'active' | 'done' | 'blocked' | 'failed' }>>([]);

  const auditEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keep policy decision in sync with current basket total and policy limits
  React.useEffect(() => {
    if (!selectedProduct) {
      setPolicyDecision(null);
      return;
    }
    const currentTotal = basketItems.length > 0
      ? basketItems.reduce((acc, curr) => acc + curr.price, 0)
      : selectedProduct.price;

    apiService.checkPolicy(currentTotal, 1, {
      maxLimit: policy.maxTransactionLimit,
      approvalThreshold: policy.approvalThreshold
    }).then(polCheck => {
      setPolicyDecision({
        allowed: polCheck.allowed,
        requiresApproval: polCheck.requiresApproval,
        isAutonomous: polCheck.isAutonomous,
        reason: polCheck.reason,
        maxLimit: polCheck.maxLimit || policy.maxTransactionLimit,
        approvalThreshold: polCheck.approvalThreshold || policy.approvalThreshold
      });
    }).catch(err => {
      console.warn('Policy evaluation sync notice:', err);
    });
  }, [basketItems, selectedProduct, policy.approvalThreshold, policy.maxTransactionLimit]);

  // Dynamic live parsed prompt intent
  const liveParsed = parsePromptDetails(buyerInput);
  const effectiveBudget = structuredRequest?.budget_inr || liveParsed.budget;
  const effectiveCategory = structuredRequest?.category || liveParsed.category;
  const effectiveUseCase = structuredRequest?.preferences?.use_case || liveParsed.useCase;
  const effectivePriority = structuredRequest?.preferences?.priority || liveParsed.priority;

  // Dynamic LLM query curation whenever prompt changes (debounced 400ms)
  React.useEffect(() => {
    if (!buyerInput.trim()) return;
    const timer = setTimeout(async () => {
      try {
        const curated = await apiService.curatePrompt(buyerInput, 'demo-ai-buyer');
        if (curated && curated.structured_request) {
          setStructuredRequest({
            buyer_id: curated.structured_request.buyer_id || 'demo-ai-buyer',
            intent: curated.structured_request.intent || `purchase_${(curated.search_query || curated.category || 'product').toLowerCase().replace(/\s+/g, '_')}`,
            category: curated.search_query || curated.category,
            budget_inr: Number(curated.budget_inr) || liveParsed.budget,
            preferences: {
              use_case: curated.use_case || liveParsed.useCase,
              priority: curated.priority_feature || liveParsed.priority
            }
          });
        }
      } catch {
        // Fallback silently to live parsed local values
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [buyerInput, liveParsed.budget, liveParsed.useCase, liveParsed.priority]);

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

  // Restore demo session from localStorage on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('agentic_commerce_demo_session');
        if (saved) {
          const s = JSON.parse(saved);
          if (s.agentState && s.agentState !== 'idle') setAgentState(s.agentState);
          if (s.buyerInput) setBuyerInput(s.buyerInput);
          if (Array.isArray(s.messages) && s.messages.length > 0) setMessages(s.messages);
          if (Array.isArray(s.timelineSteps) && s.timelineSteps.length > 0) setTimelineSteps(s.timelineSteps);
          if (s.selectedProduct) setSelectedProduct(s.selectedProduct);
          if (s.recommendation) setRecommendation(s.recommendation);
          if (s.buyerDecision) setBuyerDecision(s.buyerDecision);
          if (Array.isArray(s.basketItems) && s.basketItems.length > 0) setBasketItems(s.basketItems);
          if (s.policyDecision) setPolicyDecision(s.policyDecision);
          if (s.currentBookingId) setCurrentBookingId(s.currentBookingId);
          if (s.capturedPaymentId) setCapturedPaymentId(s.capturedPaymentId);
          if (s.capturedRazorpayOrderId) setCapturedRazorpayOrderId(s.capturedRazorpayOrderId);
          if (s.structuredRequest) setStructuredRequest(s.structuredRequest);
        }
      } catch (e) {
        console.warn('Could not restore demo session:', e);
      }
    }
  }, []);

  // Persist demo session to localStorage when active
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      if (agentState !== 'idle') {
        try {
          localStorage.setItem('agentic_commerce_demo_session', JSON.stringify({
            agentState,
            buyerInput,
            messages,
            timelineSteps,
            selectedProduct,
            recommendation,
            buyerDecision,
            basketItems,
            policyDecision,
            currentBookingId,
            capturedPaymentId,
            capturedRazorpayOrderId,
            structuredRequest
          }));
        } catch (e) {
          console.warn('Could not persist demo session:', e);
        }
      }
    }
  }, [
    agentState,
    buyerInput,
    messages,
    timelineSteps,
    selectedProduct,
    recommendation,
    buyerDecision,
    basketItems,
    policyDecision,
    currentBookingId,
    capturedPaymentId,
    capturedRazorpayOrderId,
    structuredRequest
  ]);

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
    setCurrentBookingId(null);
    setCapturedRazorpayOrderId(null);
    setCapturedPaymentId(null);
    setIsProcessing(false);
    setErrorMessage(null);
    setTimelineSteps([]);
    setCandidates([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('agentic_commerce_demo_session');
    }
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

    let action = 'ORDER';
    let targetOrderId: string | undefined = undefined;

    try {
      const curated = await apiService.curatePrompt(query, 'demo-ai-buyer');
      if (curated && curated.structured_request) {
        action = curated.action_type || (
          /\b(?:what\s+are\s+my\s+orders|show\s+my\s+orders|list\s+orders|my\s+orders|order\s+history|what\s+did\s+i\s+buy)\b/i.test(query) ? 'LIST_ORDERS' :
          /\b(?:cancel|abort)\b/i.test(query) ? 'CANCEL_ORDER' :
          /\b(?:order\s+status|status\s+of|track)\b/i.test(query) ? 'ORDER_STATUS' :
          /\b(?:limit|threshold|how\s+much\s+can\s+i\s+spend|allowance)\b/i.test(query) ? 'POLICY_INQUIRY' :
          /^(?:help|what\s+can\s+you\s+do|commands|hi|hello)\b/i.test(query) ? 'HELP' :
          'ORDER'
        );
        targetOrderId = curated.target_order_id;
        structured = {
          buyer_id: curated.structured_request.buyer_id || 'demo-ai-buyer',
          action_type: action,
          intent: curated.structured_request.intent || `purchase_${parsed.category}`,
          category: curated.structured_request.category || parsed.category,
          target_order_id: targetOrderId,
          budget_inr: Number(curated.structured_request.budget_inr) || parsed.budget,
          preferences: {
            use_case: curated.structured_request.preferences?.use_case || parsed.useCase,
            priority: curated.structured_request.preferences?.priority || parsed.priority
          }
        };
      }
    } catch (e) {
      console.warn('Could not curate via LLM, using parsed local fallback:', e);
    }
    setStructuredRequest(structured);

    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'buyer',
        senderLabel: 'AI Buyer',
        content: query,
        timestamp: now
      }
    ]);

    // =========================================================================
    // ACTION 1: LIST MY ORDERS (MCP get_customer_orders)
    // =========================================================================
    if (action === 'LIST_ORDERS') {
      setAgentState('searching_catalog');
      setTimelineSteps([
        { id: 't1', label: 'Intent Curated (Hugging Face)', detail: 'User requested: Retrieve live store orders', status: 'done' },
        { id: 't2', label: 'MCP Client (Groq)', detail: 'Calling MCP tool get_customer_orders on Railway store', status: 'active' }
      ]);
      try {
        const agentRes = await apiService.chatAgent({
          message: query,
          merchant_id: 1,
          buyer_id: 'demo-ai-buyer',
          structured_request: structured
        });
        setTimelineSteps(prev => [
          ...prev.map(s => s.id === 't2' ? { ...s, status: 'done' as const } : s),
          { id: 't3', label: 'Orders Retrieved (MCP)', detail: 'Parsed live orders from PostgreSQL database', status: 'done' }
        ]);
        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            sender: 'merchant',
            senderLabel: 'Merchant AI Agent (Groq MCP)',
            content: agentRes.message || 'Retrieved your orders.',
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
          }
        ]);
        setAgentState('idle');
      } catch (err) {
        console.error('List orders error:', err);
        setAgentState('idle');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // =========================================================================
    // ACTION 2: CANCEL ORDER (MCP cancel_order)
    // =========================================================================
    if (action === 'CANCEL_ORDER') {
      const orderToCancel = targetOrderId || currentBookingId || undefined;
      setAgentState('payment_pending');
      setTimelineSteps([
        { id: 't1', label: 'Intent Curated (Hugging Face)', detail: `User requested cancellation${orderToCancel ? ` of ${orderToCancel}` : ''}`, status: 'done' },
        { id: 't2', label: 'MCP Client (Groq)', detail: 'Calling MCP tool cancel_order on Railway store', status: 'active' }
      ]);
      try {
        const agentRes = await apiService.chatAgent({
          message: query,
          merchant_id: 1,
          buyer_id: 'demo-ai-buyer',
          context: { current_booking_id: orderToCancel },
          structured_request: structured
        });
        setTimelineSteps(prev => [
          ...prev.map(s => s.id === 't2' ? { ...s, status: 'done' as const } : s),
          { id: 't3', label: 'Order Cancelled (MCP)', detail: 'Stock released back to live catalog', status: 'done' }
        ]);
        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            sender: 'merchant',
            senderLabel: 'Merchant AI Agent (Groq MCP)',
            content: agentRes.message || 'Order cancelled.',
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
          }
        ]);
        setAgentState('failed');
        setErrorMessage(agentRes.message || 'Order cancelled via MCP');
        addAuditEvent({
          id: `audit-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          actor: 'AI Buyer',
          action: 'Order Cancelled via MCP',
          reason: agentRes.message || 'User requested cancellation',
          amount: 0,
          result: 'Allowed',
          category: 'Payment'
        });
      } catch (err) {
        console.error('Cancel order error:', err);
        setAgentState('failed');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // =========================================================================
    // ACTION 3: ORDER STATUS, POLICY INQUIRY, HELP
    // =========================================================================
    if (action === 'ORDER_STATUS' || action === 'POLICY_INQUIRY' || action === 'HELP') {
      setTimelineSteps([
        { id: 't1', label: 'Intent Curated (Hugging Face)', detail: `Curated query: ${action}`, status: 'done' },
        { id: 't2', label: 'MCP Client (Groq)', detail: 'Formulating agentic response', status: 'active' }
      ]);
      try {
        const agentRes = await apiService.chatAgent({
          message: query,
          merchant_id: 1,
          buyer_id: 'demo-ai-buyer',
          context: { current_booking_id: currentBookingId },
          structured_request: structured
        });
        setTimelineSteps(prev => [
          ...prev.map(s => s.id === 't2' ? { ...s, status: 'done' as const } : s),
          { id: 't3', label: 'Response Generated', detail: 'Sent to conversation feed', status: 'done' }
        ]);
        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            sender: 'merchant',
            senderLabel: 'Merchant AI Agent (Groq MCP)',
            content: agentRes.message,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
          }
        ]);
        setAgentState('idle');
      } catch (err) {
        console.error('Inquiry error:', err);
        setAgentState('idle');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // =========================================================================
    // ACTION 4: PRODUCT SEARCH & ORDER PLACEMENT (Default flow)
    // =========================================================================
    // Update timeline & agent state: Searching
    setAgentState('searching_catalog');
    setTimelineSteps([
      { id: 't1', label: 'Intent Curated (Hugging Face)', detail: `Curated intent: ${structured.category} for ${structured.preferences.use_case}, budget ₹${formatINR(structured.budget_inr)}`, status: 'done' },
      { id: 't2', label: 'MCP Client (Groq)', detail: `Querying Catalog Tools (search_products, get_product) for ${structured.category}`, status: 'active' }
    ]);

    try {
      // 2. Real API call to Groq Agent
      const agentRes = await apiService.chatAgent({
        message: query,
        merchant_id: 1,
        buyer_id: 'demo-ai-buyer',
        structured_request: structured
      });

      if (agentRes.message) {
        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: 'merchant',
            senderLabel: 'Merchant AI Agent (Groq MCP)',
            content: agentRes.message,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
          }
        ]);
      }

      if (agentRes.is_generic_query && agentRes.candidates && agentRes.candidates.length > 0) {
        setCandidates(agentRes.candidates);
        setAgentState('awaiting_product_selection');
        setTimelineSteps(prev => [
          ...prev.map(s => s.id === 't2' ? { ...s, status: 'done' as const } : s),
          { id: 't3', label: 'Matching Options Recommended', detail: `Found ${agentRes.candidates?.length} options for "${query}". Awaiting your selection.`, status: 'active' }
        ]);
        return;
      }

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

        const singleBasket = [{ name: prod.name, price: prod.price, isUpsell: false, id: prod.id }];
        setBasketItems(singleBasket);

        if (agentRes.recommendations && agentRes.recommendations.length > 0) {
          const rec = agentRes.recommendations[0];
          setRecommendation({
            id: String(rec.id),
            name: rec.name || 'Recommended Accessory',
            price: rec.price_inr || 0,
            reason: rec.reason || 'Frequently bought together with this product',
            source: 'Merchant catalog relationship',
            stock: rec.stock || 20
          });
        }

        try {
          const polCheck = await apiService.checkPolicy(prod.price, 1, {
            maxLimit: policy.maxTransactionLimit,
            approvalThreshold: policy.approvalThreshold
          });
          setPolicyDecision({
            allowed: polCheck.allowed,
            requiresApproval: polCheck.requiresApproval,
            isAutonomous: polCheck.isAutonomous,
            reason: polCheck.reason,
            maxLimit: polCheck.maxLimit || policy.maxTransactionLimit,
            approvalThreshold: polCheck.approvalThreshold || policy.approvalThreshold
          });

          if (!polCheck.allowed) {
            // TIER 3: HARD POLICY BLOCK (> maxTransactionLimit)
            setAgentState('policy_blocked');
            setTimelineSteps(prev => [
              ...prev.map(s => s.id === 't2' ? { ...s, status: 'done' as const } : s),
              { id: 't3', label: 'Product selected', detail: `${prod.name} — ₹${formatINR(prod.price)}`, status: 'done' },
              { id: 't_block', label: '✕ Policy Blocked', detail: polCheck.reason, status: 'blocked' },
              { id: 't_nopay', label: 'Payment Tool: NOT CALLED', detail: '0 MCP / Razorpay calls made', status: 'blocked' }
            ]);
            setMessages(prev => [
              ...prev,
              {
                id: `msg-${Date.now()}`,
                sender: 'merchant',
                senderLabel: 'Merchant AI Agent (LangGraph)',
                content: `I found ${prod.name} (₹${formatINR(prod.price)}), but this transaction exceeds your maximum limit of ₹${formatINR(policy.maxTransactionLimit)}. Blocked by Policy Gate. 0 payment calls made.`,
                timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
              }
            ]);
          } else if (polCheck.requiresApproval) {
            // TIER 2: HUMAN AUTHORIZATION REQUIRED (> approvalThreshold)
            setAgentState('awaiting_human_authorization');
            setTimelineSteps(prev => [
              ...prev.map(s => s.id === 't2' ? { ...s, status: 'done' as const } : s),
              { id: 't3', label: 'Product selected', detail: `${prod.name} — ₹${formatINR(prod.price)}`, status: 'done' },
              { id: 't_hitl', label: 'Human Authorization Required', detail: `₹${formatINR(prod.price)} > ₹${formatINR(policy.approvalThreshold)} (Approval threshold exceeded)`, status: 'active' }
            ]);
            setMessages(prev => [
              ...prev,
              {
                id: `msg-${Date.now()}`,
                sender: 'merchant',
                senderLabel: 'Merchant AI Agent (LangGraph)',
                content: `I selected ${prod.name} for ₹${formatINR(prod.price)}. Because this price exceeds your autonomous threshold of ₹${formatINR(policy.approvalThreshold)}, user permission is required. Please authorize the transaction in the Policy Gate box to place the order on the store website.`,
                timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
              }
            ]);
          } else {
            // TIER 1: ZERO-TOUCH AUTONOMOUS ORDER (<= approvalThreshold)
            // Directly orders on the website without asking for permission!
            setAgentState('payment_pending');
            setTimelineSteps(prev => [
              ...prev.map(s => s.id === 't2' ? { ...s, status: 'done' as const } : s),
              { id: 't3', label: 'Product selected', detail: `${prod.name} — ₹${formatINR(prod.price)}`, status: 'done' },
              { id: 't_auto', label: 'Autonomous Policy Approval', detail: `₹${formatINR(prod.price)} <= ₹${formatINR(policy.approvalThreshold)} (Zero-touch auto-buy)`, status: 'done' }
            ]);
            setMessages(prev => [
              ...prev,
              {
                id: `msg-${Date.now()}`,
                sender: 'merchant',
                senderLabel: 'Merchant AI Agent (LangGraph)',
                content: `⚡ Autonomous Policy Approval! Price ₹${formatINR(prod.price)} is within your autonomous threshold of ₹${formatINR(policy.approvalThreshold)}. Placing order on the live store website automatically via MCP without asking for permission...`,
                timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
              }
            ]);
            setTimeout(() => {
              handleExecuteOrderPlacement(singleBasket, true);
            }, 400);
          }
        } catch (polErr) {
          console.warn('Policy evaluation notice:', polErr);
        }
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
      console.error('Agent query notice:', e);
      // Dynamically query live Railway store products
      const liveList = await apiService.getProducts();

      // Score candidates by query token matches
      const qTokens = query.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2 && !['want', 'need', 'buy', 'for', 'the', 'with', 'under', 'below', 'within', 'order', 'this'].includes(t));
      const sortedLive = [...liveList].sort((a, b) => {
        let aScore = 0;
        let bScore = 0;
        const aText = `${a.name} ${a.category} ${a.description || ''}`.toLowerCase();
        const bText = `${b.name} ${b.category} ${b.description || ''}`.toLowerCase();
        for (const tok of qTokens) {
          if (a.name.toLowerCase().includes(tok)) aScore += 20;
          else if (aText.includes(tok)) aScore += 5;
          if (b.name.toLowerCase().includes(tok)) bScore += 20;
          else if (bText.includes(tok)) bScore += 5;
        }
        return bScore - aScore;
      });

      const matched = sortedLive[0] || liveList[0];
      const accMatched = liveList.find(p => (p.category === 'Accessories' || p.category === 'Peripherals' || p.category === 'Office') && p.id !== matched.id && p.price <= 3000) ||
                         liveList.find(p => p.category === 'Accessories' && p.id !== matched.id) ||
                         liveList[1];

      setSelectedProduct(matched);

      const singleBasket = [{ name: matched.name, price: matched.price, isUpsell: false, id: matched.id }];
      setBasketItems(singleBasket);
      setRecommendation({
        id: accMatched.id,
        name: accMatched.name,
        price: accMatched.price,
        reason: `Compatible accessory pairing for ${matched.name}`,
        source: 'Live MCP Store relationship',
        stock: accMatched.stock
      });

      const polCheck = await apiService.checkPolicy(matched.price, 1, {
        maxLimit: policy.maxTransactionLimit,
        approvalThreshold: policy.approvalThreshold
      });
      setPolicyDecision({
        allowed: polCheck.allowed,
        requiresApproval: polCheck.requiresApproval,
        isAutonomous: polCheck.isAutonomous,
        reason: polCheck.reason,
        maxLimit: polCheck.maxLimit || policy.maxTransactionLimit,
        approvalThreshold: polCheck.approvalThreshold || policy.approvalThreshold
      });

      if (!polCheck.allowed) {
        setAgentState('policy_blocked');
        setTimelineSteps(prev => [
          ...prev.map(s => s.id === 't2' ? { ...s, status: 'done' as const } : s),
          { id: 't3', label: 'Product selected', detail: `${matched.name} — ₹${formatINR(matched.price)}`, status: 'done' },
          { id: 't_block', label: '✕ Policy Blocked', detail: polCheck.reason, status: 'blocked' },
          { id: 't_nopay', label: 'Payment Tool: NOT CALLED', detail: '0 MCP / Razorpay calls made', status: 'blocked' }
        ]);
        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: 'merchant',
            senderLabel: 'Merchant AI Agent',
            content: `I found ${matched.name} (₹${formatINR(matched.price)}), but this exceeds your maximum limit of ₹${formatINR(policy.maxTransactionLimit)}. Transaction blocked. 0 payment calls made.`,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
          }
        ]);
      } else if (polCheck.requiresApproval) {
        setAgentState('awaiting_human_authorization');
        setTimelineSteps(prev => [
          ...prev.map(s => s.id === 't2' ? { ...s, status: 'done' as const } : s),
          { id: 't3', label: 'Product selected', detail: `${matched.name} — ₹${formatINR(matched.price)}`, status: 'done' },
          { id: 't_hitl', label: 'Human Authorization Required', detail: `₹${formatINR(matched.price)} > ₹${formatINR(policy.approvalThreshold)} (Approval threshold exceeded)`, status: 'active' }
        ]);
        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: 'merchant',
            senderLabel: 'Merchant AI Agent',
            content: `I selected ${matched.name} for ₹${formatINR(matched.price)}. Because this price exceeds your autonomous threshold of ₹${formatINR(policy.approvalThreshold)}, user permission is required. Please authorize the transaction in the Policy Gate box to place the order on the store website.`,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
          }
        ]);
      } else {
        setAgentState('payment_pending');
        setTimelineSteps(prev => [
          ...prev.map(s => s.id === 't2' ? { ...s, status: 'done' as const } : s),
          { id: 't3', label: 'Product selected', detail: `${matched.name} — ₹${formatINR(matched.price)}`, status: 'done' },
          { id: 't_auto', label: 'Autonomous Policy Approval', detail: `₹${formatINR(matched.price)} <= ₹${formatINR(policy.approvalThreshold)} (Zero-touch auto-buy)`, status: 'done' }
        ]);
        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: 'merchant',
            senderLabel: 'Merchant AI Agent',
            content: `⚡ Autonomous Policy Approval! Price ₹${formatINR(matched.price)} is within your autonomous threshold of ₹${formatINR(policy.approvalThreshold)}. Placing order on the live store website automatically via MCP without asking for permission...`,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
          }
        ]);
        setTimeout(() => {
          handleExecuteOrderPlacement(singleBasket, true);
        }, 400);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // User selects one of the recommended candidate products
  const handleSelectCandidate = async (candidate: { id: string; name: string; category?: string; price_inr: number; description?: string; stock?: number; imageUrl?: string }) => {
    setIsProcessing(true);
    setCandidates([]);
    
    // 1. Set as selected product
    const prod: Product = {
      id: candidate.id,
      name: candidate.name,
      category: candidate.category || 'Peripherals',
      price: candidate.price_inr,
      stock: candidate.stock || 25,
      description: candidate.description || '',
      compatibleProducts: [],
      frequentlyBoughtWith: [],
      agentReadableStatus: 'Available',
      specifications: {}
    };
    setSelectedProduct(prod);

    const singleBasket = [{ name: prod.name, price: prod.price, isUpsell: false, id: prod.id }];
    setBasketItems(singleBasket);

    // 2. Add Buyer message to chat
    setMessages(prev => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: 'buyer',
        senderLabel: 'AI Buyer',
        content: `I selected **${prod.name}** (₹${formatINR(prod.price)}). Proceed with order placement.`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
      }
    ]);

    // 3. Evaluate Policy Gate immediately
    try {
      const polCheck = await apiService.checkPolicy(prod.price, 1, {
        maxLimit: policy.maxTransactionLimit,
        approvalThreshold: policy.approvalThreshold
      });

      setPolicyDecision({
        allowed: polCheck.allowed,
        requiresApproval: polCheck.requiresApproval,
        isAutonomous: polCheck.isAutonomous,
        reason: polCheck.reason,
        maxLimit: polCheck.maxLimit || policy.maxTransactionLimit,
        approvalThreshold: polCheck.approvalThreshold || policy.approvalThreshold
      });

      if (!polCheck.allowed) {
        // TIER 3: HARD POLICY BLOCK
        setAgentState('policy_blocked');
        setTimelineSteps(prev => [
          ...prev.filter(s => s.id !== 't_hitl' && s.id !== 't_auto'),
          { id: 't_sel', label: 'Product Selected', detail: `${prod.name} — ₹${formatINR(prod.price)}`, status: 'done' },
          { id: 't_block', label: '✕ Policy Blocked', detail: polCheck.reason, status: 'blocked' },
          { id: 't_nopay', label: 'Payment Tool: NOT CALLED', detail: '0 MCP / Razorpay calls made', status: 'blocked' }
        ]);
        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            sender: 'merchant',
            senderLabel: 'Merchant AI Agent (Groq MCP)',
            content: `Transaction blocked by Policy Gate! Price ₹${formatINR(prod.price)} exceeds your maximum limit of ₹${formatINR(policy.maxTransactionLimit)}. 0 payment calls made.`,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
          }
        ]);
      } else if (polCheck.requiresApproval) {
        // TIER 2: HUMAN AUTHORIZATION REQUIRED
        setAgentState('awaiting_human_authorization');
        setTimelineSteps(prev => [
          ...prev.filter(s => s.id !== 't_hitl' && s.id !== 't_auto'),
          { id: 't_sel', label: 'Product Selected', detail: `${prod.name} — ₹${formatINR(prod.price)}`, status: 'done' },
          { id: 't_hitl', label: 'Human Authorization Required', detail: `₹${formatINR(prod.price)} > ₹${formatINR(policy.approvalThreshold)} (Approval threshold exceeded)`, status: 'active' }
        ]);
        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            sender: 'merchant',
            senderLabel: 'Merchant AI Agent (Groq MCP)',
            content: `🔒 **Human Authorization Required!** ${prod.name} costs ₹${formatINR(prod.price)}, exceeding your autonomous threshold of ₹${formatINR(policy.approvalThreshold)}. Please click **[ Approve & Place Order on Website ]** in the Transaction box or reply **"approve"** in this chat.`,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
          }
        ]);
      } else {
        // TIER 1: ZERO-TOUCH AUTONOMOUS ORDER
        setAgentState('payment_pending');
        setTimelineSteps(prev => [
          ...prev.filter(s => s.id !== 't_hitl' && s.id !== 't_auto'),
          { id: 't_sel', label: 'Product Selected', detail: `${prod.name} — ₹${formatINR(prod.price)}`, status: 'done' },
          { id: 't_auto', label: 'Autonomous Policy Approval', detail: `₹${formatINR(prod.price)} <= ₹${formatINR(policy.approvalThreshold)} (Zero-touch auto-buy)`, status: 'done' }
        ]);
        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            sender: 'merchant',
            senderLabel: 'Merchant AI Agent (Groq MCP)',
            content: `⚡ **Autonomous Policy Approval!** Price ₹${formatINR(prod.price)} is within your autonomous threshold of ₹${formatINR(policy.approvalThreshold)}. Placing order on the live store website automatically via MCP without asking for permission...`,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
          }
        ]);
        setTimeout(() => {
          handleExecuteOrderPlacement(singleBasket, true);
        }, 400);
      }
    } catch (err) {
      console.error('Candidate selection policy error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject/Cancel transaction when human authorization is required
  const handleRejectTransaction = () => {
    setAgentState('failed');
    setErrorMessage('Transaction authorization was declined by the user. No order was placed.');
    setTimelineSteps(prev => [
      ...prev,
      { id: 't_declined', label: 'Human Authorization Declined', detail: 'User rejected transaction approval', status: 'blocked' }
    ]);
    setMessages(prev => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: 'buyer',
        senderLabel: 'AI Buyer',
        content: 'I decided not to authorize this purchase. Transaction cancelled.',
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
      }
    ]);
  };

  // Place order on live Railway store website via MCP server (autonomous or human-authorized)
  const handleExecuteOrderPlacement = async (
    customBasket?: Array<{ name: string; price: number; isUpsell?: boolean; id?: string }>,
    isAutonomousOrder: boolean = false
  ) => {
    setIsProcessing(true);
    setErrorMessage(null);

    const activeBasket = customBasket && customBasket.length > 0 ? customBasket : basketItems;
    const baseProd = selectedProduct || laptopItem;
    const totalAmount = activeBasket.length > 0
      ? activeBasket.reduce((sum, item) => sum + item.price, 0)
      : baseProd.price;

    setAgentState('payment_pending');
    setTimelineSteps(prev => [
      ...prev.filter(s => s.id !== 't_mcp_exec'),
      {
        id: 't_mcp_exec',
        label: isAutonomousOrder ? 'Autonomous MCP Booking' : 'Authorized MCP Booking',
        detail: `Executing MCP tool create_order on Railway store for ₹${formatINR(totalAmount)}`,
        status: 'active'
      }
    ]);

    try {
      // 1. Buy on live Railway MCP Store (create_order)
      const orderItems = activeBasket.map(it => ({
        productId: String(it.id || '1001'),
        quantity: 1,
        name: it.name
      }));

      const railwayOrder = await apiService.createRailwayOrder('buyer@demo.com', 'Demo Buyer', orderItems);
      const bookingId = railwayOrder?.orderId || railwayOrder?.id || `ORD-${Date.now().toString().slice(-6)}`;
      const rzpOrderId = railwayOrder?.razorpayOrderId;

      // 2. Also record in local backend for PostgreSQL audit trail
      try {
        const backendOrderItems = activeBasket.map(it => ({
          product_id: Number(it.id) || 1001,
          quantity: 1
        }));
        const beOrder = await apiService.createOrder(1, 'demo-ai-buyer', backendOrderItems);
        setCurrentOrderId(beOrder.order_id);
      } catch (beErr) {
        console.warn('Backend order recording notice:', beErr);
      }

      setCurrentBookingId(bookingId);
      setCapturedRazorpayOrderId(rzpOrderId || null);

      // 3. Autonomous Agent Checkout & Settlement on Railway Store via MCP Server
      const agentPaymentId = `pay_agent_mcp_${Math.random().toString(36).substring(2, 10)}`;

      if (bookingId && typeof bookingId === 'string' && (bookingId.startsWith('cmt') || bookingId.length > 8)) {
        await apiService.updateRailwayOrderPaid(bookingId, agentPaymentId);
      }

      setAgentState('completed');
      setCapturedPaymentId(agentPaymentId);
      setCapturedRazorpayOrderId(rzpOrderId || null);

      setTimelineSteps(prev => [
        ...prev.map(s => s.id === 't_mcp_exec' ? { ...s, status: 'done' as const } : s),
        { id: 't_mcp', label: 'Railway MCP Store', detail: `Created live order ${bookingId}`, status: 'done' },
        { id: 't_paid', label: isAutonomousOrder ? 'Autonomous Settlement' : 'Authorized Settlement', detail: `Booking & settlement (${agentPaymentId})`, status: 'done' },
        { id: 't_cap', label: 'Railway Store Confirmed', detail: `Order ${bookingId} marked PAID in live DB`, status: 'done' }
      ]);

      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'merchant',
          senderLabel: 'Merchant AI Agent',
          content: `${isAutonomousOrder ? '⚡ Autonomous Zero-Touch Checkout' : '✓ User-Authorized Checkout'} Completed! Order ${bookingId} was booked on the live Railway platform using MCP tools. Razorpay Order: ${rzpOrderId || 'N/A'}, Settlement: ${agentPaymentId}.`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
        },
        {
          id: `msg-${Date.now() + 1}`,
          sender: 'buyer',
          senderLabel: 'AI Buyer',
          content: `Purchase confirmed directly on store website via MCP. Booking ID: ${bookingId}, Settlement: ${agentPaymentId}.`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
        }
      ]);

      // Record transaction and audit event in CommerceContext & localStorage
      const finalItems = activeBasket.map(it => ({
        productId: String(it.id || 'item'),
        productName: it.name,
        price: it.price,
        quantity: 1,
        isUpsell: Boolean(it.isUpsell)
      }));

      const newTx: Transaction = {
        id: String(bookingId),
        orderId: typeof bookingId === 'string' ? bookingId : `ORD-${Date.now().toString().slice(-4)}`,
        buyer: isAutonomousOrder ? 'AI Buyer (Autonomous Agent)' : 'AI Buyer (Human-Authorized)',
        items: finalItems,
        subtotal: baseProd.price,
        upsellTotal: activeBasket.filter(it => it.isUpsell).reduce((s, it) => s + it.price, 0),
        totalAmount: totalAmount,
        policyStatus: 'Approved',
        paymentStatus: 'Captured',
        timestamp: `Today, ${new Date().toLocaleTimeString('en-US', { hour12: false })}`,
        policyReason: policyDecision?.reason || (isAutonomousOrder ? 'Autonomous approval (under threshold)' : 'Human authorized payment'),
        razorpayPaymentId: agentPaymentId,
        razorpayOrderId: rzpOrderId || `order_${Math.random().toString(36).substring(2, 12)}`,
        razorpayApiCalls: 2
      };
      addTransaction(newTx);

      const newAudit: AuditEvent = {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        actor: 'AI Buyer',
        action: isAutonomousOrder ? 'Autonomous MCP Purchase Executed' : 'User-Authorized MCP Purchase Executed',
        reason: `${isAutonomousOrder ? 'Autonomous checkout (< ₹' + formatINR(policy.approvalThreshold) + ')' : 'Authorized by user'} — Railway order ${bookingId} booked & settled (${agentPaymentId})`,
        amount: totalAmount,
        result: 'Allowed',
        category: 'Payment'
      };
      addAuditEvent(newAudit);

      await refreshCommerceData();
    } catch (err: unknown) {
      console.error('Checkout error:', err);
      const msg = err instanceof Error ? err.message : 'Checkout invocation failed';
      setErrorMessage(msg);
      setAgentState('failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Buyer Decision Action (Accept / Skip Recommendation) with Dynamic Policy Engine
  const handleBuyerDecision = async (accepted: boolean) => {
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

    const totalAmount = updatedBasket.reduce((sum, item) => sum + item.price, 0);
    const recName = recommendation?.name || mouseItem.name;

    // Evaluate Dynamic Merchant Policy Gate
    setAgentState('checking_policy');
    setTimelineSteps(prev => [
      ...prev.map(s => s.id === 't5' ? { ...s, status: 'done' as const } : s),
      { id: 't6', label: 'Basket updated', detail: accepted ? `Added ${recName}` : 'Upsell skipped', status: 'done' },
      { id: 't_pol', label: 'Policy Gate Tool', detail: `Evaluating ₹${formatINR(totalAmount)} against threshold ₹${formatINR(policy.approvalThreshold)} (Limit: ₹${formatINR(policy.maxTransactionLimit)})`, status: 'active' }
    ]);

    try {
      const polCheck = await apiService.checkPolicy(totalAmount, 1, {
        maxLimit: policy.maxTransactionLimit,
        approvalThreshold: policy.approvalThreshold
      });

      setPolicyDecision({
        allowed: polCheck.allowed,
        requiresApproval: polCheck.requiresApproval,
        isAutonomous: polCheck.isAutonomous,
        reason: polCheck.reason,
        maxLimit: polCheck.maxLimit || policy.maxTransactionLimit,
        approvalThreshold: polCheck.approvalThreshold || policy.approvalThreshold
      });

      if (!polCheck.allowed) {
        // TIER 3: HARD POLICY BLOCK (> maxTransactionLimit)
        setAgentState('policy_blocked');
        setTimelineSteps(prev => [
          ...prev.map(s => s.id === 't_pol' ? { ...s, status: 'blocked' as const } : s),
          { id: 't_block', label: '✕ Policy Blocked', detail: polCheck.reason, status: 'blocked' },
          { id: 't_nopay', label: 'Payment Tool: NOT CALLED', detail: '0 MCP / Razorpay calls made', status: 'blocked' }
        ]);

        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            sender: 'merchant',
            senderLabel: 'Merchant AI Agent',
            content: `Transaction blocked by Policy Gate! Total of ₹${formatINR(totalAmount)} exceeds your maximum limit of ₹${formatINR(policy.maxTransactionLimit)}. No order was placed and 0 payment calls were made.`,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
          }
        ]);

        const blockedTx: Transaction = {
          id: `ORD-BLK-${Date.now().toString().slice(-4)}`,
          orderId: `BLK-${Date.now().toString().slice(-4)}`,
          buyer: 'AI Buyer (Autonomous Agent)',
          items: updatedBasket.map(it => ({
            productId: it.id || 'item',
            productName: it.name,
            price: it.price,
            quantity: 1,
            isUpsell: it.isUpsell
          })),
          subtotal: baseProd.price,
          upsellTotal: accepted && recommendation ? recommendation.price : 0,
          totalAmount,
          policyStatus: 'Blocked',
          paymentStatus: 'Blocked',
          timestamp: `Today, ${new Date().toLocaleTimeString('en-US', { hour12: false })}`,
          policyReason: polCheck.reason,
          razorpayApiCalls: 0
        };
        addTransaction(blockedTx);

        const blockedAudit: AuditEvent = {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          actor: 'Policy Engine',
          action: 'Policy Limit Evaluated',
          reason: polCheck.reason,
          amount: totalAmount,
          result: 'Blocked',
          category: 'Blocked'
        };
        addAuditEvent(blockedAudit);
        return;
      }

      if (polCheck.requiresApproval) {
        // TIER 2: HUMAN-IN-THE-LOOP REQUIRED (> approvalThreshold && <= maxTransactionLimit)
        setAgentState('awaiting_human_authorization');
        setTimelineSteps(prev => [
          ...prev.map(s => s.id === 't_pol' ? { ...s, status: 'done' as const } : s),
          {
            id: 't_hitl',
            label: 'Human Authorization Required',
            detail: `₹${formatINR(totalAmount)} > ₹${formatINR(policy.approvalThreshold)} (Approval threshold exceeded)`,
            status: 'active'
          }
        ]);

        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            sender: 'merchant',
            senderLabel: 'Merchant AI Agent',
            content: `Basket calculated at ₹${formatINR(totalAmount)}. Because this payment exceeds your autonomous threshold of ₹${formatINR(policy.approvalThreshold)}, user permission is required. Please authorize the transaction in the Policy Gate box to place the order on the store website.`,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
          }
        ]);
        return;
      }

      // TIER 1: ZERO-TOUCH AUTONOMOUS PURCHASE (<= approvalThreshold)
      setTimelineSteps(prev => [
        ...prev.map(s => s.id === 't_pol' ? { ...s, status: 'done' as const } : s),
        {
          id: 't_auto',
          label: 'Autonomous Approval',
          detail: `₹${formatINR(totalAmount)} <= ₹${formatINR(policy.approvalThreshold)} (Zero-touch auto-buy)`,
          status: 'done'
        }
      ]);

      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          sender: 'merchant',
          senderLabel: 'Merchant AI Agent',
          content: `⚡ Autonomous Policy Approval! Total ₹${formatINR(totalAmount)} is within your autonomous threshold of ₹${formatINR(policy.approvalThreshold)}. Placing order on the live store website automatically via MCP without asking for permission...`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
        }
      ]);

      // Trigger autonomous purchase without asking user permission
      setTimeout(() => {
        handleExecuteOrderPlacement(updatedBasket, true);
      }, 400);

    } catch (e: unknown) {
      console.error('Policy evaluation error:', e);
      setAgentState('ready_for_payment');
    }
  };

  // Interactive Chatbot Handler for AI Buyer
  const handleChatSubmit = () => {
    const trimmed = buyerInput.trim();
    if (!trimmed || isProcessing) return;

    const lower = trimmed.toLowerCase();

    // 1. If currently awaiting buyer approval on an upsell recommendation:
    if (agentState === 'awaiting_buyer_approval') {
      if (/^(yes|add|accept|include|ok|sure|yeah|yep|proceed with all)\b/i.test(lower)) {
        handleBuyerDecision(true);
        setBuyerInput('');
        return;
      } else if (/^(no|skip|decline|pass|cancel|nope|only|just|skip this|without)\b/i.test(lower)) {
        handleBuyerDecision(false);
        setBuyerInput('');
        return;
      }
    }

    // 2. If currently awaiting candidate product selection:
    if (agentState === 'awaiting_product_selection' && candidates.length > 0) {
      if (/^(1|first|one|option\s*1)\b/i.test(lower)) {
        handleSelectCandidate(candidates[0]);
        setBuyerInput('');
        return;
      } else if (/^(2|second|two|option\s*2)\b/i.test(lower) && candidates.length > 1) {
        handleSelectCandidate(candidates[1]);
        setBuyerInput('');
        return;
      } else if (/^(3|third|three|option\s*3)\b/i.test(lower) && candidates.length > 2) {
        handleSelectCandidate(candidates[2]);
        setBuyerInput('');
        return;
      }
      const matchedCand = candidates.find(c => lower.includes(c.name.toLowerCase()) || c.name.toLowerCase().split(' ').some(w => w.length > 3 && lower.includes(w)));
      if (matchedCand) {
        handleSelectCandidate(matchedCand);
        setBuyerInput('');
        return;
      }
    }

    // 3. If currently awaiting human authorization at the Policy Gate:
    if (agentState === 'awaiting_human_authorization') {
      if (/^(yes|approve|pay|confirm|authorize|proceed|place\s*order|ok|sure)\b/i.test(lower)) {
        handleExecuteOrderPlacement(basketItems, false);
        setBuyerInput('');
        return;
      } else if (/^(no|reject|cancel|decline|abort|stop|nope)\b/i.test(lower)) {
        handleRejectTransaction();
        setBuyerInput('');
        return;
      }
    }

    // 3. Otherwise treat as a shopping intent or direct order command
    handleStartDemo(trimmed);
    setBuyerInput('');
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
      { id: 't4', label: 'Policy Tool', detail: `Evaluating ₹${totalBlockedAmount.toLocaleString()} against policy limit ₹${policy.maxTransactionLimit.toLocaleString()}`, status: 'active' }
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
      requiresApproval: false,
      isAutonomous: false,
      reason: `Transaction total ₹${totalBlockedAmount.toLocaleString()} exceeds merchant's maximum limit of ₹${policy.maxTransactionLimit.toLocaleString()}. Payment Tool was NOT called.`,
      maxLimit: policy.maxTransactionLimit,
      approvalThreshold: policy.approvalThreshold
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

  const calculatedTotal = basketItems.length > 0
    ? basketItems.reduce((acc, curr) => acc + curr.price, 0)
    : (selectedProduct?.price || 0);
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

            {/* Structured Agent-to-Agent Message Card */}
            <div className="space-y-1.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                <span>Structured Commerce Payload</span>
                <span className="font-mono text-[10px] text-purple-600">A2A Format</span>
              </div>
              <div className="bg-slate-900 text-slate-200 p-3 rounded-lg text-[11px] font-mono border border-slate-800 space-y-1 shadow-inner">
                <div className="text-purple-400 font-bold">{'// AI BUYER REQUEST'}</div>
                <div><span className="text-slate-400">intent:</span> &quot;{structuredRequest?.intent || `purchase_${effectiveCategory.toLowerCase().replace(/\s+/g, '_')}`}&quot;</div>
                <div><span className="text-slate-400">category:</span> &quot;{effectiveCategory}&quot;</div>
                <div><span className="text-slate-400">budget:</span> <span suppressHydrationWarning>₹{formatINR(effectiveBudget)}</span></div>
                <div><span className="text-slate-400">use_case:</span> &quot;{effectiveUseCase}&quot;</div>
                <div><span className="text-slate-400">priority:</span> &quot;{effectivePriority}&quot;</div>
              </div>
            </div>

            {/* Conversation Messages Thread */}
            <div className="border-t border-slate-200 pt-3 space-y-2.5 max-h-[260px] overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Agent Conversation Thread
                </span>
                <span className="text-[10px] text-purple-600 font-medium">Interactive Chat</span>
              </div>

              {messages.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-3 text-center">
                  Type a product command below or click &quot;Start Demo&quot; to begin chatting.
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
              {candidates.length > 0 && agentState === 'awaiting_product_selection' && (
                <div className="p-3 bg-purple-50/95 border border-purple-200 rounded-xl space-y-2.5 my-2 shadow-2xs animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      Recommended Matching Options:
                    </span>
                    <span className="text-[9px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full font-semibold">
                      Select one to proceed
                    </span>
                  </div>
                  <div className="space-y-2">
                    {candidates.map((c, idx) => (
                      <div
                        key={c.id}
                        className="p-2.5 bg-white rounded-lg border border-purple-100 shadow-2xs flex items-center justify-between gap-2.5 hover:border-purple-300 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <h4 className="font-bold text-xs text-slate-900 truncate">
                              {c.name}
                            </h4>
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                            {c.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono font-bold text-xs text-purple-700">
                              ₹{c.price_inr.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              {c.category}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectCandidate(c)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold shrink-0 shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span>⚡ Select &amp; Order</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Interactive Chatbot Input & Fast Triggers */}
            <div className="border-t border-slate-200 pt-3 pb-4 space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Chat with AI Buyer / Order Command:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={buyerInput}
                  onChange={(e) => {
                    setBuyerInput(e.target.value);
                    setStructuredRequest(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleChatSubmit();
                  }}
                  disabled={isProcessing}
                  placeholder="e.g. 'i want a mouse' or 'what are my orders' or 'cancel this order'"
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600 disabled:bg-slate-100"
                />
                <button
                  onClick={handleChatSubmit}
                  disabled={isProcessing || !buyerInput.trim()}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs disabled:bg-slate-300 transition-colors shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>

              {/* Quick suggestion prompt chips */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    handleStartDemo('i want a mouse');
                  }}
                  disabled={isProcessing}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors text-left cursor-pointer"
                >
                  ⚡ i want a mouse (Auto-buy &lt; ₹5k)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleStartDemo('order NovaBook Pro 14');
                  }}
                  disabled={isProcessing}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors text-left cursor-pointer"
                >
                  🔒 order NovaBook Pro 14 (&gt; ₹5k HITL)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleStartDemo('what are my orders');
                  }}
                  disabled={isProcessing}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors text-left cursor-pointer"
                >
                  📦 what are my orders
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleStartDemo('cancel this order');
                  }}
                  disabled={isProcessing}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors text-left cursor-pointer"
                >
                  🛑 cancel this order
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleStartDemo('what is my spending limit');
                  }}
                  disabled={isProcessing}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors text-left cursor-pointer"
                >
                  🛡️ spending limits
                </button>
              </div>
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
                  <div className="pt-1">
                    <div className="p-2 rounded bg-white border border-slate-200 text-xs font-semibold flex items-center justify-between">
                      <span>Buyer Decision:</span>
                      <span className={buyerDecision === 'accepted' ? 'text-emerald-700 font-bold' : 'text-slate-600'}>
                        {buyerDecision === 'accepted' ? '✓ Recommendation Approved' : '✕ Recommendation Skipped'}
                      </span>
                    </div>
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
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-bold text-slate-900 leading-tight">Transaction</h2>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300 tracking-wide">
                    UAP
                  </span>
                </div>
                <p className="text-[10.5px] text-emerald-700 font-medium">By following Unified Agent Protocol (UAP) • Policy Gate</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[10px]">
              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold border border-indigo-200" title="Autonomous Purchase Threshold">
                Auto &le; ₹{formatINR(policy.approvalThreshold)}
              </span>
              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold border border-emerald-200" title="Maximum Transaction Limit">
                Max ₹{formatINR(policy.maxTransactionLimit)}
              </span>
            </div>
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
                    <span>Autonomous Threshold:</span>
                    <span className="font-mono font-bold text-indigo-700" suppressHydrationWarning>₹{formatINR(policy.approvalThreshold)}</span>
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
                  !policyDecision.allowed
                    ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                    : policyDecision.requiresApproval
                      ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                      : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                }`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 font-bold">
                      {!policyDecision.allowed ? (
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                      ) : policyDecision.requiresApproval ? (
                        <UserCheck className="w-4 h-4 text-amber-600" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      )}
                      <span>
                        POLICY GATE: {!policyDecision.allowed
                          ? 'BLOCKED'
                          : policyDecision.requiresApproval
                            ? 'HUMAN APPROVAL REQUIRED'
                            : 'APPROVED'}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      !policyDecision.allowed
                        ? 'bg-rose-600 text-white'
                        : policyDecision.requiresApproval
                          ? 'bg-amber-600 text-white'
                          : 'bg-emerald-600 text-white'
                    }`}>
                      {!policyDecision.allowed
                        ? 'BLOCK'
                        : policyDecision.requiresApproval
                          ? 'APPROVAL NEEDED'
                          : 'ALLOW'}
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

            {/* Autonomous MCP Order & Payment Action */}
            {agentState === 'completed' ? (
              <div className="bg-slate-950 text-white p-4 rounded-xl space-y-3 shadow-lg border border-emerald-500/40 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>✓ Booked on Live Website (via MCP)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                    PAID
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Store Booking ID:</span>
                    <span className="font-bold text-white text-[11px] truncate max-w-[200px]" title={currentBookingId || 'ORD-123'}>
                      {currentBookingId || `ORD-${currentOrderId || '123'}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Razorpay Order ID:</span>
                    <span className="font-bold text-indigo-300 text-[11px]">{capturedRazorpayOrderId || 'order_TXVE...'}</span>
                  </div>
                  {capturedPaymentId && (
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Agent Settlement ID:</span>
                      <span className="text-amber-300 font-bold text-[11px]">{capturedPaymentId}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Total Amount:</span>
                    <span className="font-extrabold text-emerald-400 text-sm">₹{calculatedTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Store Status:</span>
                    <span className="text-emerald-400 font-bold">CONFIRMED &amp; PAID (Live DB)</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Protocol Standard:</span>
                    <span className="text-purple-300 font-semibold text-[11px]">Unified Agent Protocol (UAP) + MCP</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Checkout Mode:</span>
                    <span className="text-indigo-300 font-semibold">
                      {policyDecision?.isAutonomous ? 'Autonomous Zero-Touch MCP Booking (UAP Flow)' : 'Human-Authorized Agent MCP Booking (UAP Flow)'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                  <a
                    href="https://ai-growth-agentic-commerce-production.up.railway.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md text-center"
                  >
                    <span>↗ View Order on Railway Store Website</span>
                  </a>
                  <a
                    href="#audit-trail-section"
                    className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors text-center"
                  >
                    <span>View PostgreSQL Audit Trail</span>
                  </a>
                </div>
              </div>
            ) : agentState === 'awaiting_human_authorization' || (selectedProduct && policyDecision?.requiresApproval && agentState !== 'idle') ? (
              <div className="bg-amber-50/80 border border-amber-300 p-4 rounded-xl space-y-3 shadow-xs animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-950">
                    <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Human Authorization Required</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300 font-mono">
                    &gt; ₹{formatINR(policy.approvalThreshold)} Threshold
                  </span>
                </div>

                <p className="text-[11px] leading-relaxed text-amber-900">
                  Transaction total of <strong>₹{formatINR(calculatedTotal)}</strong> exceeds your autonomous threshold of <strong>₹{formatINR(policy.approvalThreshold)}</strong>. The agent is paused at the Policy Gate awaiting your authorization to book on the live store website.
                </p>

                {recommendation && agentState === 'awaiting_buyer_approval' && (
                  <div className="p-2 rounded bg-indigo-50/80 border border-indigo-200 text-[11px] text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Growth recommendation pending: <strong>{recommendation.name} (+₹{formatINR(recommendation.price)})</strong>. You can add it in the center column or approve current basket below.</span>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    onClick={() => handleExecuteOrderPlacement(basketItems, false)}
                    disabled={isProcessing}
                    className="w-full py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-300"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isProcessing ? 'Placing Order on Store Website...' : `Approve & Place Order on Website (Pay ₹${formatINR(calculatedTotal)})`}</span>
                  </button>
                  <button
                    onClick={handleRejectTransaction}
                    disabled={isProcessing}
                    className="w-full py-2 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-300 text-center transition-colors cursor-pointer"
                  >
                    Reject / Cancel Order
                  </button>
                </div>
              </div>
            ) : agentState === 'policy_blocked' || (selectedProduct && policyDecision && !policyDecision.allowed && agentState !== 'idle') ? (
              <div className="p-4 bg-rose-50 border border-rose-300 text-rose-950 rounded-xl text-xs space-y-1.5 shadow-xs">
                <div className="flex items-center gap-1.5 font-bold text-rose-900">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Payment Tool Blocked by Policy</span>
                </div>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  Transaction total of ₹{formatINR(calculatedTotal)} exceeds the merchant maximum limit of ₹{formatINR(policy.maxTransactionLimit)}. 0 Razorpay API and MCP calls were made.
                </p>
              </div>
            ) : agentState === 'payment_pending' ? (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-center gap-3 text-indigo-950 text-xs font-bold animate-pulse">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Executing Autonomous Zero-Touch Order on Store Website...</span>
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
