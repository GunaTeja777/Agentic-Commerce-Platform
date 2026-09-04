import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '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';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const HF_TOKEN = process.env.HF_TOKEN || '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';
const STORE_API_URL = process.env.STORE_API_URL || 'https://ai-growth-agentic-commerce-production.up.railway.app';

interface RailwayProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  quantityAvailable?: number;
  inStock?: boolean;
  description?: string;
  imageUrl?: string;
}

/**
 * Call High-Speed LLM (Groq first, Hugging Face fallback)
 */
async function callLLM(prompt: string, systemPrompt?: string): Promise<string> {
  // 1. Try Groq (ultra-fast 120B model)
  try {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        max_tokens: 450,
        temperature: 0.1
      }),
      signal: AbortSignal.timeout(4000)
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim() || '';
      if (content) return content;
    }
  } catch (groqErr) {
    console.warn('Groq LLM call failed, trying Hugging Face fallback:', groqErr);
  }

  // 2. Fallback to Hugging Face Router
  try {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const hfRes = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.3-70B-Instruct',
        messages,
        max_tokens: 300,
        temperature: 0.1
      }),
      signal: AbortSignal.timeout(4000)
    });

    if (hfRes.ok) {
      const data = await hfRes.json();
      return data.choices?.[0]?.message?.content?.trim() || '';
    }
  } catch (hfErr) {
    console.warn('Hugging Face fallback also failed:', hfErr);
  }

  return '';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message: string = body.message || 'I need a product';
    const structuredReq = body.structured_request || {};

    // 1. Fetch live products from Railway MCP Store
    const productsRes = await fetch(`${STORE_API_URL}/api/products`, { cache: 'no-store' });
    let liveProducts: RailwayProduct[] = [];
    if (productsRes.ok) {
      liveProducts = await productsRes.json();
    }

    if (!liveProducts || liveProducts.length === 0) {
      return NextResponse.json({
        status: 'blocked',
        message: 'No live products found on the MCP store platform.',
        selected_product: null,
        recommendations: [],
        cart: [],
        items: []
      });
    }

    // 2. Filter candidates based on buyer query & budget
    const budget = Number(structuredReq.budget_inr || structuredReq.max_price || 0) || 100000;
    const queryLower = message.toLowerCase();

    // Extract significant query tokens (ignoring stop words)
    const tokens = queryLower
      .split(/[^a-z0-9]+/)
      .filter((t: string) => t.length > 2 && !['want', 'need', 'buy', 'for', 'the', 'with', 'under', 'below', 'within', 'upto', 'order', 'this', 'please', 'find', 'get', 'item'].includes(t));

    // Priority pool 1: products matching both keywords and budget
    let candidatePool = liveProducts.filter((p: RailwayProduct) => {
      const priceInr = p.price / 100.0;
      const text = `${p.name} ${p.category} ${p.description || ''}`.toLowerCase();
      const hasKeyword = tokens.some((tok: string) => text.includes(tok));
      return hasKeyword && priceInr <= budget * 1.15;
    });

    // Priority pool 2: if keyword match within budget is empty, match keyword regardless of strict budget
    if (candidatePool.length === 0 && tokens.length > 0) {
      candidatePool = liveProducts.filter((p: RailwayProduct) => {
        const text = `${p.name} ${p.category} ${p.description || ''}`.toLowerCase();
        return tokens.some((tok: string) => text.includes(tok));
      });
    }

    // Priority pool 3: if still empty, products within budget
    if (candidatePool.length === 0) {
      candidatePool = liveProducts.filter((p: RailwayProduct) => (p.price / 100.0) <= budget);
    }

    // Default fallback to live products
    if (candidatePool.length === 0) {
      candidatePool = liveProducts;
    }

    // Sort candidates so the most relevant title match appears first
    candidatePool.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aDesc = (a.description || '').toLowerCase();
      const bDesc = (b.description || '').toLowerCase();
      
      let aScore = 0;
      let bScore = 0;
      for (const t of tokens) {
        if (aName.includes(t)) aScore += 15;
        else if (aDesc.includes(t)) aScore += 2;
        if (bName.includes(t)) bScore += 15;
        else if (bDesc.includes(t)) bScore += 2;
      }
      return bScore - aScore;
    });

    // 3. Groq LLM MCP Client: Select the single best product
    let selected = candidatePool[0];

    try {
      const candidateListStr = candidatePool.slice(0, 10).map((p: RailwayProduct) => 
        `ID: "${p.id}", Name: "${p.name}", Category: "${p.category}", Price: ₹${(p.price / 100).toLocaleString()}, Description: "${p.description || ''}"`
      ).join('\n');

      const selectionPrompt = `You are a precision commerce matching agent.
Buyer Request: "${message}"
Buyer Budget: ₹${budget}

Available Candidate Products from Live Store:
${candidateListStr}

Select the single best product that accurately matches what the buyer wants and respects their budget.
Return ONLY valid JSON in this format:
{"selected_id": "<exact ID of the selected product>"}`;

      const llmSelection = await callLLM(selectionPrompt, 'You are an autonomous AI shopping agent. Respond with valid JSON only.');
      const jsonMatch = llmSelection.match(/\{\s*"selected_id"\s*:\s*"([^"]+)"\s*\}/) || llmSelection.match(/"selected_id"\s*:\s*"([^"]+)"/);
      if (jsonMatch && jsonMatch[1]) {
        const found = candidatePool.find((p: RailwayProduct) => p.id === jsonMatch[1]);
        if (found) selected = found;
      }
    } catch (llmErr) {
      console.warn('LLM product selection notice:', llmErr);
    }

    const prodPriceInr = selected.price / 100.0;

    // 4. Groq LLM MCP Client: Select Growth & Upsell Opportunity from Accessories
    const accessories = liveProducts.filter((p: RailwayProduct) => 
      p.id !== selected.id && 
      (p.category === 'Accessories' || p.category === 'Peripherals' || p.category === 'Office') &&
      (p.price / 100.0) <= Math.max(3000, prodPriceInr * 0.5)
    );

    let growthItem = accessories[0] || liveProducts.find(p => p.id !== selected.id && (p.price / 100.0) <= 2500) || liveProducts[1];
    let growthReason = `Complementary accessory paired with ${selected.name}`;

    try {
      const accList = accessories.slice(0, 8);
      if (accList.length > 0) {
        const accListStr = accList.map((a: RailwayProduct) => 
          `ID: "${a.id}", Name: "${a.name}", Price: ₹${(a.price / 100).toLocaleString()}, Description: "${a.description || ''}"`
        ).join('\n');

        const growthPrompt = `You are the Merchant Growth AI Agent.
Main Selected Product: ${selected.name} (₹${prodPriceInr.toLocaleString()})
Buyer Request: "${message}"

Candidate Complementary Accessories:
${accListStr}

Pick the single best complementary accessory and write a persuasive, 1-sentence reason (under 18 words) explaining why it pairs well with ${selected.name}.
Return ONLY valid JSON:
{
  "accessory_id": "<ID of chosen accessory>",
  "reason": "<1-sentence reason>"
}`;

        const llmGrowth = await callLLM(growthPrompt, 'You are an autonomous merchant growth AI. Respond with valid JSON only.');
        const idMatch = llmGrowth.match(/"accessory_id"\s*:\s*"([^"]+)"/);
        const reasonMatch = llmGrowth.match(/"reason"\s*:\s*"([^"]+)"/);

        if (idMatch && idMatch[1]) {
          const foundAcc = accList.find((a: RailwayProduct) => a.id === idMatch[1]);
          if (foundAcc) growthItem = foundAcc;
        }
        if (reasonMatch && reasonMatch[1]) {
          growthReason = reasonMatch[1];
        }
      }
    } catch (llmErr) {
      console.warn('LLM growth opportunity notice:', llmErr);
    }

    const recPriceInr = growthItem.price / 100.0;

    // 5. Build Merchant Response
    const formattedMessage = `I found the **${selected.name}** for ₹${prodPriceInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.

💡 **Recommendation**: ${growthReason} — ${growthItem.name} for ₹${recPriceInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.
Would you like to add it to your basket?`;

    return NextResponse.json({
      status: 'awaiting_buyer_approval',
      message: formattedMessage,
      merchant_id: body.merchant_id || 1,
      selected_product: {
        product_id: selected.id,
        product_name: selected.name,
        category: selected.category,
        price_inr: prodPriceInr,
        stock_quantity: selected.quantityAvailable || 25,
        rating: 4.6,
        description: selected.description || '',
        tags: [selected.category.toLowerCase()],
        image_url: selected.imageUrl || 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=700&auto=format&fit=crop&q=80'
      },
      recommendations: [
        {
          id: growthItem.id,
          name: growthItem.name,
          price_inr: recPriceInr,
          stock: growthItem.quantityAvailable || 50,
          relationship_type: 'frequently_bought_with',
          reason: growthReason
        }
      ],
      cart: [],
      items: [],
      subtotal_inr: 0,
      total_inr: 0,
      policy_result: null,
      policy: null,
      order_id: null,
      payment_info: null,
      next_action: 'buyer_confirmation_required',
      request_id: null
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Agent chat route error:', err);
    return NextResponse.json(
      { status: 'error', message: `Agent Chat Error: ${msg}` },
      { status: 500 }
    );
  }
}
