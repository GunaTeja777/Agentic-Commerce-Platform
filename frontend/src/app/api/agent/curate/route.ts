import { NextRequest, NextResponse } from 'next/server';

const HF_TOKEN = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || '';
const HF_MODEL = process.env.CURATION_MODEL || 'meta-llama/Llama-3.3-70B-Instruct';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const AGENT_BACKEND_URL = process.env.AGENT_URL || process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:8001';

export type ActionType = 'ORDER' | 'CANCEL_ORDER' | 'LIST_ORDERS' | 'ORDER_STATUS' | 'POLICY_INQUIRY' | 'APPROVE' | 'REJECT' | 'HELP';

/**
 * Fallback intent extractor if both cloud LLM routers are offline
 */
function extractFallbackIntent(prompt: string) {
  const p = prompt.trim();
  const pLower = p.toLowerCase();

  let actionType: ActionType = 'ORDER';
  if (/\b(?:cancel|abort|rescind)\b/i.test(pLower)) {
    actionType = 'CANCEL_ORDER';
  } else if (/\b(?:(?:what\s+are\s+)?my\s+(?:previous|previors|past|recent|all|last|earlier)?\s*orders|previous\s+orders|previors\s+orders|past\s+orders|recent\s+orders|show\s+(?:my\s+)?(?:previous|previors|past|recent|all)?\s*orders|list\s+(?:all\s+)?(?:previous|previors|past|recent)?\s*orders|order\s+history|what\s+did\s+i\s+buy|orders\s+placed)\b/i.test(pLower)) {
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

  const orderIdMatch = p.match(/\b(cmtl[a-z0-9]{15,}|cmtm[a-z0-9]{15,}|order_[A-Za-z0-9]{10,}|ORD-[A-Za-z0-9-]+)\b/i);
  const targetOrderId = orderIdMatch ? orderIdMatch[1] : undefined;

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

  let cleaned = p
    .replace(/^(?:i\s+need|i\s+want|looking\s+for|search\s+for|find\s+me|find|buy|get|purchase|please\s+find|order)\s+(?:a|an|the|some)?\s*/i, '')
    .replace(/\s*(?:order\s+this|buy\s+this|please|now)\s*$/i, '')
    .replace(/(?:within|under|below|upto|up\s*to|budget|max|limit|for|at|rs\.?|₹|inr)\s*(?:₹|rs\.?|inr)?\s*[0-9,]+(?:\s*k)?.*$/i, '')
    .trim();

  cleaned = cleaned.replace(/[.,!?;:]+$/, '').trim();
  const searchQuery = cleaned || 'product';

  let category = 'Accessories';
  if (/laptop|macbook|notebook|pc|computer/i.test(pLower)) category = 'Laptops';
  else if (/monitor|display|screen/i.test(pLower)) category = 'Monitors';
  else if (/headphone|earphone|headset|audio|speaker|soundpod/i.test(pLower)) category = 'Audio';
  else if (/mic|microphone/i.test(pLower)) category = 'Audio';
  else if (/mouse|trackpad|keyboard|pad/i.test(pLower)) category = 'Peripherals';
  else if (/chair|desk|stand|organizer|cable|mat|lamp|hub|dock/i.test(pLower)) category = 'Accessories';
  else if (/phone|mobile|smartphone/i.test(pLower)) category = 'Smartphones';

  return {
    action_type: actionType,
    search_query: searchQuery,
    target_order_id: targetOrderId,
    category,
    budget_inr: budgetInr || 50000,
    use_case: 'general',
    priority_feature: 'standard'
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

    const result = {
      action_type: 'ORDER' as ActionType,
      search_query: prompt.trim(),
      target_order_id: undefined as string | undefined,
      category: 'General',
      budget_inr: 50000,
      use_case: 'general',
      priority_feature: 'standard'
    };
    let curatedByLLM = false;
    let engineUsed = 'Hugging Face (Llama-3.3-70B)';

    const systemPrompt = `You are the Buyer-Side AI Agent in an Agentic Commerce platform.
Analyze the human shopping or account request and output ONLY a valid JSON object with the exact keys:
- "action_type": string, MUST BE one of:
  * "LIST_ORDERS": User asks to see, view, list, or check previous, past, recent, or earlier orders (e.g. "what are my previous orders", "give me list of previores order", "show my orders", "my orders")
  * "CANCEL_ORDER": User asks to cancel, abort, or stop an order (e.g. "cancel orede", "cancel this order", "cancel order cmtl...")
  * "ORDER_STATUS": User asks to track or check status of an order (e.g. "track my order", "order status", "where is my order")
  * "POLICY_INQUIRY": User asks about spending limits, budget rules, or thresholds (e.g. "what is my spending limit", "how much can i spend")
  * "HELP": User asks what commands are available or says hello/greetings
  * "ORDER": User wants to search for, browse, or buy any product (e.g. "i want a laptop", "order mouse", "i need a laptop bag", "buy headphones under 2000")
- "search_query": string (the exact item/product being requested, e.g. "laptop", "laptop bag", "mouse", or "" if not an order)
- "target_order_id": string or null (if an explicit order ID is provided or mentioned)
- "category": string (e.g. "Laptops", "Accessories", "Peripherals", "Monitors", "Audio", "Smartphones", "Gaming", "Office")
- "budget_inr": number or null (budget in INR as a pure number if specified, e.g. 50000, 60000, 2000, or null if unmentioned)
- "use_case": string ("work", "gaming", "study", "general", "creative")
- "priority": string ("standard", "performance", "battery", "budget", "portability")

Return valid JSON only. No markdown formatting, no explanations.`;

    // 1. Try Hugging Face Router
    if (HF_TOKEN) {
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
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Buyer query: "${prompt}"` }
            ],
            max_tokens: 250,
            temperature: 0.1
          }),
          signal: AbortSignal.timeout(3000)
        });

        if (hfRes.ok) {
          const hfData = await hfRes.json();
          const content = hfData.choices?.[0]?.message?.content || '';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.action_type) result.action_type = parsed.action_type;
            if (parsed.search_query !== undefined) result.search_query = parsed.search_query;
            if (parsed.target_order_id) result.target_order_id = parsed.target_order_id;
            if (parsed.category) result.category = parsed.category;
            if (parsed.budget_inr) result.budget_inr = Number(parsed.budget_inr);
            if (parsed.use_case) result.use_case = parsed.use_case;
            if (parsed.priority) result.priority_feature = parsed.priority;
            curatedByLLM = true;
            engineUsed = 'Hugging Face (Llama-3.3-70B)';
          }
        }
      } catch (hfErr) {
        console.warn('Hugging Face direct router notice, using Groq LLM fallback:', hfErr);
      }
    }

    // 2. High-Speed Groq LLM Fallback (if HF token expired or unavailable)
    if (!curatedByLLM && GROQ_API_KEY) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Buyer query: "${prompt}"` }
            ],
            max_tokens: 250,
            temperature: 0.1,
            response_format: { type: 'json_object' }
          }),
          signal: AbortSignal.timeout(3000)
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          const content = groqData.choices?.[0]?.message?.content || '';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.action_type) result.action_type = parsed.action_type;
            if (parsed.search_query !== undefined) result.search_query = parsed.search_query;
            if (parsed.target_order_id) result.target_order_id = parsed.target_order_id;
            if (parsed.category) result.category = parsed.category;
            if (parsed.budget_inr) result.budget_inr = Number(parsed.budget_inr);
            if (parsed.use_case) result.use_case = parsed.use_case;
            if (parsed.priority) result.priority_feature = parsed.priority;
            curatedByLLM = true;
            engineUsed = 'Groq Cloud (LLM Orchestrator)';
          }
        }
      } catch (groqErr) {
        console.warn('Groq curation notice:', groqErr);
      }
    }

    // 3. Fallback to Python Agent Curation service if cloud routers were offline
    if (!curatedByLLM) {
      try {
        const agentUrl = `${AGENT_BACKEND_URL.replace(/\/$/, '')}/agent/curate`;
        const agentRes = await fetch(agentUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, buyer_id: buyerId }),
          signal: AbortSignal.timeout(2500)
        });

        if (agentRes.ok) {
          const agentData = await agentRes.json();
          if (agentData.search_query) result.search_query = agentData.search_query;
          if (agentData.category) result.category = agentData.category;
          if (agentData.budget_inr) result.budget_inr = Number(agentData.budget_inr);
          if (agentData.use_case) result.use_case = agentData.use_case;
          if (agentData.priority_feature) result.priority_feature = agentData.priority_feature;
          curatedByLLM = true;
          engineUsed = 'Agent Python Microservice';
        }
      } catch {
        // Retain fallback values
      }
    }

    // If all LLMs failed, use basic fallback extraction
    if (!curatedByLLM) {
      const fb = extractFallbackIntent(prompt);
      result.action_type = fb.action_type;
      result.search_query = fb.search_query;
      result.category = fb.category;
      result.budget_inr = fb.budget_inr;
      result.target_order_id = fb.target_order_id;
      engineUsed = 'Offline Emergency Fallback';
    }

    const intent = result.action_type === 'ORDER'
      ? `purchase_${(result.search_query || result.category || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
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
      curation_engine: engineUsed,
      structured_request: {
        buyer_id: buyerId,
        action_type: result.action_type,
        intent,
        category: result.category || result.search_query,
        search_query: result.search_query || '',
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
