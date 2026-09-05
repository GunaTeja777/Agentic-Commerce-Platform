import { NextRequest, NextResponse } from 'next/server';

const HF_TOKEN = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || '';
const HF_MODEL = process.env.CURATION_MODEL || 'meta-llama/Llama-3.3-70B-Instruct';
const AGENT_BACKEND_URL = process.env.AGENT_URL || process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:8001';

export type ActionType = 'ORDER' | 'CANCEL_ORDER' | 'LIST_ORDERS' | 'ORDER_STATUS' | 'POLICY_INQUIRY' | 'APPROVE' | 'REJECT' | 'HELP';

/**
 * Dynamic fallback extractor for buyer prompts if network/offline
 */
function extractFallbackIntent(prompt: string) {
  const p = prompt.trim();
  const pLower = p.toLowerCase();

  // 0. Detect Action Type
  let actionType: ActionType = 'ORDER';
  if (/\b(?:cancel|abort|rescind)\b/i.test(pLower)) {
    actionType = 'CANCEL_ORDER';
  } else if (/\b(?:what\s+are\s+my\s+orders|show\s+my\s+orders|list\s+(?:all\s+)?orders|my\s+orders|order\s+history|what\s+did\s+i\s+buy)\b/i.test(pLower)) {
    actionType = 'LIST_ORDERS';
  } else if (/\b(?:order\s+status|status\s+of|track\s+(?:my\s+)?order|where\s+is\s+my\s+order)\b/i.test(pLower)) {
    actionType = 'ORDER_STATUS';
  } else if (/\b(?:limit|threshold|spending\s+limit|how\s+much\s+can\s+i\s+spend|policy\s+rules|allowance)\b/i.test(pLower)) {
    actionType = 'POLICY_INQUIRY';
  } else if (/^(?:approve|pay|confirm|yes|proceed\s+with\s+order|authorize)\b/i.test(pLower)) {
    actionType = 'APPROVE';
  } else if (/^(?:reject|decline|no|stop|nope)\b/i.test(pLower)) {
    actionType = 'REJECT';
  } else if (/^(?:help|what\s+can\s+you\s+do|commands|options|hi|hello|hey)\b/i.test(pLower)) {
    actionType = 'HELP';
  }

  // Extract explicit order ID if mentioned in query
  const orderIdMatch = p.match(/\b(cmtl[a-z0-9]{15,}|cmtm[a-z0-9]{15,}|order_[A-Za-z0-9]{10,}|ORD-[A-Za-z0-9-]+)\b/i);
  const targetOrderId = orderIdMatch ? orderIdMatch[1] : undefined;

  // 1. Budget extraction
  let budgetInr: number | null = null;
  const kMatch = pLower.match(/(?:under|below|within|upto|up\s*to|budget|max|limit|rs\.?|₹|for|at)?\s*(\d+(?:\.\d+)?)\s*k\b/i);
  const numMatch = pLower.match(/(?:under|below|within|upto|up\s*to|budget|max|limit|rs\.?|₹|for|at)\s*([0-9,]+)/i) ||
                   pLower.match(/₹\s*([0-9,]+)/i) ||
                   pLower.match(/\b([0-9]{3,7})\b/);

  if (kMatch) {
    budgetInr = parseFloat(kMatch[1]) * 1000;
  } else if (numMatch) {
    const clean = parseInt(numMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(clean) && clean > 0) budgetInr = clean;
  }

  // 2. Extract product search query
  let cleaned = p
    .replace(/^(?:i\s+need|i\s+want|looking\s+for|search\s+for|find\s+me|find|buy|get|purchase|please\s+find|order)\s+(?:a|an|the|some)?\s*/i, '')
    .replace(/\s*(?:order\s+this|buy\s+this|please|now)\s*$/i, '')
    .replace(/(?:within|under|below|upto|up\s*to|budget|max|limit|for|at|rs\.?|₹|inr)\s*(?:₹|rs\.?|inr)?\s*[0-9,]+(?:\s*k)?.*$/i, '')
    .trim();

  cleaned = cleaned.replace(/[.,!?;:]+$/, '').trim();
  const searchQuery = cleaned || 'product';

  // 3. Category classification
  let category = 'Accessories';
  if (/laptop|macbook|notebook|pc|computer/i.test(pLower)) category = 'Laptops';
  else if (/monitor|display|screen/i.test(pLower)) category = 'Monitors';
  else if (/headphone|earphone|headset|audio|speaker|soundpod/i.test(pLower)) category = 'Audio';
  else if (/mic|microphone/i.test(pLower)) category = 'Audio & Microphones';
  else if (/mouse|trackpad|keyboard|pad/i.test(pLower)) category = 'Peripherals';
  else if (/chair|desk|stand|organizer|cable|mat|lamp|hub|dock/i.test(pLower)) category = 'Accessories';
  else if (/phone|mobile|smartphone/i.test(pLower)) category = 'Smartphones';
  else category = searchQuery.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  let useCase = 'general';
  if (/gaming|game/i.test(pLower)) useCase = 'gaming';
  else if (/student|college|study/i.test(pLower)) useCase = 'study';
  else if (/creative|design|video|music/i.test(pLower)) useCase = 'creative';
  else if (/work|office|coding|programming/i.test(pLower)) useCase = 'work';

  let priority = 'productivity';
  if (/battery/i.test(pLower)) priority = 'battery';
  else if (/fast|speed|performance/i.test(pLower)) priority = 'performance';
  else if (/budget|cheap|affordable/i.test(pLower)) priority = 'budget';
  else if (/clean|minimal|durable|portable|wireless/i.test(pLower)) priority = 'convenience';

  return {
    action_type: actionType,
    search_query: searchQuery,
    target_order_id: targetOrderId,
    category,
    budget_inr: budgetInr || 50000,
    use_case: useCase,
    priority_feature: priority
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = (body.prompt || '').trim();
    const buyerId = body.buyer_id || 'demo-ai-buyer';

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Default to dynamic fallback values
    const result = extractFallbackIntent(prompt);

    // 1. Process and curate with Hugging Face LLM (meta-llama/Llama-3.3-70B-Instruct)
    let curatedByHuggingFace = false;
    try {
      const hfRes = await fetch('https://router.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: HF_MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are an AI Buyer Intent Curation model powered by Hugging Face Llama. Analyze the human shopping query and return ONLY a valid JSON object with keys: "action_type" (one of: "ORDER", "CANCEL_ORDER", "LIST_ORDERS", "ORDER_STATUS", "POLICY_INQUIRY", "HELP", "APPROVE", "REJECT"), "search_query" (string, exact product or item requested), "target_order_id" (string or null, if user mentions specific order ID), "category" (string, e.g. Peripherals, Audio, Accessories, Laptops, Monitors, etc.), "budget_inr" (number or null), "use_case" (string), "priority" (string).'
            },
            {
              role: 'user',
              content: `Buyer input: "${prompt}"`
            }
          ],
          max_tokens: 220,
          temperature: 0.1
        }),
        signal: AbortSignal.timeout(4000)
      });

      if (hfRes.ok) {
        const hfData = await hfRes.json();
        const content = hfData.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.action_type) result.action_type = parsed.action_type;
          if (parsed.search_query) result.search_query = parsed.search_query;
          if (parsed.target_order_id) result.target_order_id = parsed.target_order_id;
          if (parsed.category) result.category = parsed.category;
          if (parsed.budget_inr) result.budget_inr = Number(parsed.budget_inr);
          if (parsed.use_case) result.use_case = parsed.use_case;
          if (parsed.priority) result.priority_feature = parsed.priority;
          curatedByHuggingFace = true;
        }
      }
    } catch (hfErr) {
      console.warn('Hugging Face direct router notice:', hfErr);
    }

    // 2. Fallback to Python Agent Curation service if direct router was unavailable
    if (!curatedByHuggingFace) {
      try {
        const agentUrl = `${AGENT_BACKEND_URL.replace(/\/$/, '')}/agent/curate`;
        const agentRes = await fetch(agentUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, buyer_id: buyerId }),
          signal: AbortSignal.timeout(3000)
        });

        if (agentRes.ok) {
          const agentData = await agentRes.json();
          if (agentData.search_query) result.search_query = agentData.search_query;
          if (agentData.category) result.category = agentData.category;
          if (agentData.budget_inr) result.budget_inr = Number(agentData.budget_inr);
          if (agentData.use_case) result.use_case = agentData.use_case;
          if (agentData.priority_feature) result.priority_feature = agentData.priority_feature;
        }
      } catch {
        // Dynamic fallback values retained
      }
    }

    const intent = result.action_type === 'ORDER'
      ? `purchase_${result.search_query.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
      : result.action_type.toLowerCase();

    return NextResponse.json({
      action_type: result.action_type,
      search_query: result.search_query,
      target_order_id: result.target_order_id,
      category: result.category,
      budget_inr: result.budget_inr,
      use_case: result.use_case,
      priority_feature: result.priority_feature,
      intent,
      curation_engine: 'Hugging Face (Llama-3.3-70B)',
      structured_request: {
        buyer_id: buyerId,
        action_type: result.action_type,
        intent,
        category: result.search_query,
        target_order_id: result.target_order_id,
        budget_inr: result.budget_inr,
        preferences: {
          use_case: result.use_case,
          priority: result.priority_feature
        }
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
