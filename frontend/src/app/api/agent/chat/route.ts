import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6K9pubdEL0SGKX0UQlMyG6i11zEKVzNHKUEcwbpmcLcfw';
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

async function callGemini(prompt: string, systemPrompt?: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const contents = [];
  if (systemPrompt) {
    contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood. I will act as instructed.' }] });
  }
  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
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

    // Candidate selection: match query tokens
    const tokens = queryLower.split(/\s+/).filter((t: string) => t.length > 2 && !['want', 'need', 'buy', 'for', 'the', 'with', 'under'].includes(t));
    
    let candidatePool = liveProducts.filter((p: RailwayProduct) => {
      const priceInr = p.price / 100.0;
      return priceInr <= budget * 1.3;
    });

    if (tokens.length > 0) {
      const matched = candidatePool.filter((p: RailwayProduct) => {
        const text = `${p.name} ${p.category} ${p.description || ''}`.toLowerCase();
        return tokens.some((tok: string) => text.includes(tok));
      });
      if (matched.length > 0) {
        candidatePool = matched;
      }
    }

    // 3. Gemini LLM MCP Client: Select the single best product
    let selected = candidatePool[0] || liveProducts[0];
    try {
      const candidateListStr = candidatePool.slice(0, 8).map((p: RailwayProduct) => 
        `ID: "${p.id}", Name: "${p.name}", Category: "${p.category}", Price: ₹${(p.price / 100).toLocaleString()}, Description: "${p.description || ''}"`
      ).join('\n');

      const selectionPrompt = `You are a precision commerce matching agent.
Buyer Request: "${message}"
Budget Limit: ₹${budget}

Available Products from Live Store:
${candidateListStr}

Select the single best product that matches the buyer's query.
Return ONLY valid JSON in this format:
{"selected_id": "<ID of the selected product>"}`;

      const geminiSelection = await callGemini(selectionPrompt, 'You are an MCP client agent selecting catalog products. Return only JSON.');
      const jsonMatch = geminiSelection.match(/\{\s*"selected_id"\s*:\s*"([^"]+)"\s*\}/);
      if (jsonMatch && jsonMatch[1]) {
        const found = candidatePool.find((p: RailwayProduct) => p.id === jsonMatch[1]);
        if (found) selected = found;
      }
    } catch (llmErr) {
      console.warn('Gemini product selection fallback:', llmErr);
    }

    const prodPriceInr = selected.price / 100.0;

    // 4. Gemini LLM MCP Client: Select Growth & Upsell Opportunity from Accessories
    const accessories = liveProducts.filter((p: RailwayProduct) => 
      p.id !== selected.id && (p.category === 'Accessories' || p.category === 'Peripherals' || (p.price / 100) <= prodPriceInr * 0.8)
    );

    let growthItem = accessories[0] || liveProducts[1];
    let growthReason = `Compatible accessory that pairs with ${selected.name}`;

    try {
      const accListStr = accessories.slice(0, 5).map((a: RailwayProduct) => 
        `ID: "${a.id}", Name: "${a.name}", Price: ₹${(a.price / 100).toLocaleString()}`
      ).join('\n');

      const growthPrompt = `You are the Merchant Growth AI Agent.
Main Selected Product: ${selected.name} (₹${prodPriceInr.toLocaleString()})
Buyer Query: "${message}"

Candidate Complementary Accessories:
${accListStr}

Pick the best complementary accessory and write a persuasive, 1-sentence reason why it is useful with ${selected.name}.
Return ONLY valid JSON:
{
  "accessory_id": "<ID of chosen accessory>",
  "reason": "<1-sentence reason under 20 words>"
}`;

      const geminiGrowth = await callGemini(growthPrompt, 'You are an autonomous merchant growth AI.');
      const idMatch = geminiGrowth.match(/"accessory_id"\s*:\s*"([^"]+)"/);
      const reasonMatch = geminiGrowth.match(/"reason"\s*:\s*"([^"]+)"/);

      if (idMatch && idMatch[1]) {
        const foundAcc = accessories.find((a: RailwayProduct) => a.id === idMatch[1]);
        if (foundAcc) growthItem = foundAcc;
      }
      if (reasonMatch && reasonMatch[1]) {
        growthReason = reasonMatch[1];
      }
    } catch (llmErr) {
      console.warn('Gemini growth opportunity fallback:', llmErr);
    }

    const recPriceInr = growthItem.price / 100.0;

    // 5. Build Agent Response
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
