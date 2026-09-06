import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const HF_TOKEN = process.env.HF_TOKEN || '';
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

interface RailwayOrder {
  orderId: string;
  status: string;
  totalAmount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    imageUrl?: string;
  }>;
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
        max_tokens: 1200,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim() || '';
      if (content) return content;
    } else {
      const errData = await res.json();
      console.warn('Groq call returned status', res.status, errData);
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
    const actionType = structuredReq.action_type || 'ORDER';

    // =========================================================================
    // ACTION 1: LIST MY ORDERS (MCP get_customer_orders)
    // =========================================================================
    if (actionType === 'LIST_ORDERS') {
      try {
        const ordersRes = await fetch(`${STORE_API_URL}/api/orders`, { cache: 'no-store' });
        let orders: RailwayOrder[] = [];
        if (ordersRes.ok) {
          orders = await ordersRes.json();
        }

        if (!orders || orders.length === 0) {
          return NextResponse.json({
            status: 'orders_listed',
            action_type: 'LIST_ORDERS',
            message: '📦 You have no orders placed on the live store platform yet.',
            orders: []
          });
        }

        const topOrders = orders.slice(0, 5);
        const orderSummaryLines = topOrders.map(o => {
          const itemNames = (o.items || []).map(i => i.name).join(', ') || 'Item';
          const priceStr = `₹${(o.totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
          const statusIcon = o.status === 'PAID' ? '✅ PAID' : o.status === 'CANCELLED' ? '❌ CANCELLED' : '⏳ PENDING';
          const dateStr = new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          return `• **Order \`${o.orderId.slice(-8)}\`**: ${itemNames} — ${priceStr} (${statusIcon} at ${dateStr})`;
        }).join('\n');

        const replyMessage = `📦 **Here are your recent orders from the live store (via MCP):**\n\n${orderSummaryLines}\n\n💡 *Tip: You can say "cancel this order" or "track order" at any time.*`;

        return NextResponse.json({
          status: 'orders_listed',
          action_type: 'LIST_ORDERS',
          message: replyMessage,
          orders: topOrders
        });
      } catch (err) {
        return NextResponse.json({
          status: 'error',
          action_type: 'LIST_ORDERS',
          message: 'Failed to retrieve orders from the live MCP server.'
        });
      }
    }

    // =========================================================================
    // ACTION 2: CANCEL ORDER (MCP cancel_order)
    // =========================================================================
    if (actionType === 'CANCEL_ORDER') {
      try {
        // Find target order ID from structured request, context, or latest order
        let targetId = structuredReq.target_order_id || body.context?.current_booking_id || body.context?.current_order_id;
        
        if (!targetId) {
          const ordersRes = await fetch(`${STORE_API_URL}/api/orders`, { cache: 'no-store' });
          if (ordersRes.ok) {
            const orders: RailwayOrder[] = await ordersRes.json();
            const activeOrder = orders.find(o => o.status !== 'CANCELLED') || orders[0];
            if (activeOrder) targetId = activeOrder.orderId;
          }
        }

        if (!targetId) {
          return NextResponse.json({
            status: 'order_cancel_failed',
            action_type: 'CANCEL_ORDER',
            message: 'No active order was found to cancel. You can place a new order by typing "i want a mouse".'
          });
        }

        // Call MCP cancel_order on Railway store
        const cancelRes = await fetch(`${STORE_API_URL}/api/orders/${targetId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });

        if (cancelRes.ok) {
          return NextResponse.json({
            status: 'order_cancelled',
            action_type: 'CANCEL_ORDER',
            cancelled_order_id: targetId,
            message: `🛑 **Order Cancelled Successfully via MCP!**\n\nOrder \`${targetId}\` has been cancelled on the live store platform. Reserved inventory has been restored to catalog stock.`
          });
        } else {
          return NextResponse.json({
            status: 'order_cancel_failed',
            action_type: 'CANCEL_ORDER',
            message: `Could not cancel order \`${targetId}\`. It may have already been cancelled or settled.`
          });
        }
      } catch (err) {
        return NextResponse.json({
          status: 'error',
          action_type: 'CANCEL_ORDER',
          message: 'Error executing MCP cancel_order on the live store server.'
        });
      }
    }

    // =========================================================================
    // ACTION 3: ORDER STATUS (MCP get_order_status)
    // =========================================================================
    if (actionType === 'ORDER_STATUS') {
      try {
        let targetId = structuredReq.target_order_id || body.context?.current_booking_id;
        if (!targetId) {
          const ordersRes = await fetch(`${STORE_API_URL}/api/orders`, { cache: 'no-store' });
          if (ordersRes.ok) {
            const orders: RailwayOrder[] = await ordersRes.json();
            if (orders.length > 0) targetId = orders[0].orderId;
          }
        }

        if (targetId) {
          const statusRes = await fetch(`${STORE_API_URL}/api/orders/${targetId}`, { cache: 'no-store' });
          if (statusRes.ok) {
            const o = await statusRes.json();
            const priceStr = `₹${(o.totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
            const statusIcon = o.status === 'PAID' ? '✅ PAID' : o.status === 'CANCELLED' ? '❌ CANCELLED' : '⏳ PENDING';
            return NextResponse.json({
              status: 'order_status',
              action_type: 'ORDER_STATUS',
              message: `🔍 **Live Order Status (via MCP):**\n• **Order ID**: \`${o.id || o.orderId}\`\n• **Status**: ${statusIcon}\n• **Total**: ${priceStr}\n• **Razorpay Reference**: \`${o.razorpayOrderId || 'N/A'}\`\n• **Settlement Token**: \`${o.razorpayPaymentId || 'N/A'}\``,
              order: o
            });
          }
        }

        return NextResponse.json({
          status: 'order_status',
          action_type: 'ORDER_STATUS',
          message: 'No specific order found to track. Try asking "what are my orders" to see all recent orders.'
        });
      } catch (err) {
        return NextResponse.json({
          status: 'error',
          action_type: 'ORDER_STATUS',
          message: 'Could not fetch order status from the live store.'
        });
      }
    }

    // =========================================================================
    // ACTION 4: POLICY INQUIRY
    // =========================================================================
    if (actionType === 'POLICY_INQUIRY') {
      return NextResponse.json({
        status: 'policy_inquiry',
        action_type: 'POLICY_INQUIRY',
        message: `🛡️ **Merchant Financial Policy Guardrails:**\n\n• **Autonomous Approval Threshold**: ₹5,000\n  *(Orders ≤ ₹5,000 are placed immediately with zero human friction)*\n• **Maximum Transaction Ceiling**: ₹70,000\n  *(Orders > ₹70,000 are hard-blocked with 0 payment calls)*\n• **Human Authorization Band**: ₹5,000 to ₹70,000\n  *(Orders in this range require explicit user approval)*\n\n⚙️ You can dynamically reconfigure these rules anytime at **/policy**.`
      });
    }

    // =========================================================================
    // ACTION 5: HELP & GUIDANCE
    // =========================================================================
    if (actionType === 'HELP') {
      return NextResponse.json({
        status: 'help',
        action_type: 'HELP',
        message: `👋 **Welcome to the Agentic Commerce Chatbot!**\n\nHere are some things you can ask me:\n• *"i want a mouse"* or *"order StrikePad Gaming Mouse Pad XL"* — Auto-orders under ₹5,000 threshold\n• *"order NovaBook Pro 14"* — Demonstrates human authorization above threshold\n• *"what are my orders"* — Retrieves your live store order history via MCP\n• *"cancel this order"* — Cancels the active order on the live store via MCP\n• *"what is my limit"* — Explains your spending policy thresholds`
      });
    }

    // =========================================================================
    // ACTION 6: PRODUCT SEARCH & ORDER PLACEMENT (Default flow)
    // =========================================================================

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

    // 2. LLM-Powered Semantic Product Selection (Groq Merchant Agent / MCP Client)
    const budget = Number(structuredReq.budget_inr || structuredReq.max_price || 0) || 100000;
    const requestedItem = structuredReq.search_query || structuredReq.category || message;

    let selected: RailwayProduct | null = null;
    let candidatePool: RailwayProduct[] = [];
    let isExactNameGiven = Boolean(body.selected_product_id);
    let growthItem: RailwayProduct = liveProducts.find(p => p.category === 'Accessories') || liveProducts[0];
    let growthReason = 'Complementary accessory paired with your purchase';

    if (body.selected_product_id) {
      selected = liveProducts.find(p => p.id === body.selected_product_id) || null;
      if (selected) isExactNameGiven = true;
    }

    if (!selected) {
      // Prioritize relevant category items + accessories to keep prompt concise (<500 tokens)
      const targetCategory = structuredReq.category || '';
      let relevantProducts = liveProducts;
      if (targetCategory && targetCategory !== 'General') {
        const matchingCategory = liveProducts.filter(p => 
          p.category.toLowerCase() === targetCategory.toLowerCase()
        );
        const accessoryPool = liveProducts.filter(p => 
          p.category === 'Accessories' && p.category.toLowerCase() !== targetCategory.toLowerCase()
        ).slice(0, 4);
        if (matchingCategory.length > 0) {
          relevantProducts = [...matchingCategory, ...accessoryPool];
        }
      }

      // Concise catalog overview for Groq LLM
      const catalogBrief = relevantProducts.map(p => 
        `- ID: "${p.id}", Name: "${p.name}", Category: "${p.category}", Price: ₹${(p.price / 100).toLocaleString('en-IN')}`
      ).join('\n');

      const merchantPrompt = `You are the Merchant AI Agent and Model Context Protocol (MCP) store client.
A Buyer AI Agent sent this purchase request:
- User Message: "${message}"
- Target Item / Entity: "${requestedItem}"
- Target Category: "${structuredReq.category || 'Any'}"
- Budget Limit: ₹${budget.toLocaleString('en-IN')}

Here is the live store catalog:
${catalogBrief}

INSTRUCTIONS:
1. Determine if the buyer specified an EXACT product name (e.g. "NovaBook Pro 14", "StrikePad Gaming Mouse Pad XL").
   If exact name is given, set "is_exact_match": true and "selected_product_id" to that product ID.
2. If the buyer asked for a general product or category (e.g. "laptop", "laptop bag", "mouse", "keyboard", "headphones", "monitor"):
   - Set "is_exact_match": false
   - Select 1 to 3 "candidate_ids" that GENUINELY match the requested item and category within budget.
   - SEMANTIC RULE:
     * If the buyer asks for a "laptop", select actual laptops (e.g. NovaBook, PulseBook) from the Laptops category. DO NOT select laptop bags, skins, or stands!
     * If the buyer asks for a "bag" or "laptop bag", select ONLY actual bags/backpacks/sleeves (e.g. NovaCarry Laptop Bag, NovaCarry Backpack, NovaCarry Sleeve). DO NOT select mice, hubs, stands, or chargers!
     * If the buyer asks for a "mouse", select ONLY mice. DO NOT select mouse pads or laptops!
3. Select 1 complementary accessory ID for "upsell_product_id" and write a 1-sentence pairing reason.

Return ONLY valid JSON:
{
  "is_exact_match": boolean,
  "selected_product_id": string,
  "candidate_ids": string[],
  "upsell_product_id": string,
  "upsell_reason": string
}`;

      try {
        const groqRes = await callLLM(merchantPrompt, 'You are an autonomous merchant growth AI. Respond with valid JSON only.');
        const jsonMatch = groqRes.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.is_exact_match && parsed.selected_product_id) {
            const match = liveProducts.find(p => p.id === parsed.selected_product_id);
            if (match) {
              selected = match;
              isExactNameGiven = true;
            }
          }
          if (Array.isArray(parsed.candidate_ids) && parsed.candidate_ids.length > 0) {
            const validCandidates = parsed.candidate_ids
              .map((id: string) => liveProducts.find(p => p.id === id))
              .filter(Boolean) as RailwayProduct[];
            if (validCandidates.length > 0) {
              candidatePool = validCandidates;
            }
          }
          if (parsed.upsell_product_id) {
            const up = liveProducts.find(p => p.id === parsed.upsell_product_id);
            if (up) {
              growthItem = up;
              if (parsed.upsell_reason) growthReason = parsed.upsell_reason;
            }
          }
        }
      } catch (err) {
        console.warn('Groq merchant catalog selection notice:', err);
      }
    }

    // Fallback if LLM candidate pool was empty: filter by category or query
    if (!selected && candidatePool.length === 0) {
      const targetCatLower = (structuredReq.category || requestedItem || '').toLowerCase();
      candidatePool = liveProducts.filter(p => {
        const catMatch = p.category.toLowerCase().includes(targetCatLower) || targetCatLower.includes(p.category.toLowerCase());
        const nameMatch = p.name.toLowerCase().includes(requestedItem.toLowerCase());
        return (catMatch || nameMatch) && (p.price / 100.0) <= budget * 1.15;
      });
      if (candidatePool.length === 0) {
        candidatePool = liveProducts.slice(0, 3);
      }
    }

    // IF GENERIC QUERY (e.g. "i want a mouse", "i need a laptop"):
    // Recommend top 2-3 matching products based on query and let the user select!
    if (!isExactNameGiven) {
      const topCandidates = candidatePool.slice(0, 3).map((p: RailwayProduct) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price_inr: p.price / 100.0,
        stock: p.quantityAvailable || 20,
        description: p.description || '',
        imageUrl: p.imageUrl || ''
      }));

      const candidateListText = topCandidates.map((c, i) => 
        `${i + 1}. **${c.name}** — ₹${c.price_inr.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${c.category})\n   *${c.description}*`
      ).join('\n\n');

      const recommendationMessage = `💡 I found **${topCandidates.length} recommended options** based on your search for **"${message}"**:\n\n${candidateListText}\n\n👉 **Please select an item below to proceed to order:**`;

      return NextResponse.json({
        status: 'awaiting_product_selection',
        action_type: 'ORDER',
        is_generic_query: true,
        message: recommendationMessage,
        candidates: topCandidates,
        selected_product: null,
        recommendations: [],
        cart: [],
        items: []
      });
    }

    // IF EXACT PRODUCT GIVEN OR SELECTED:
    const finalProduct = selected || candidatePool[0] || liveProducts[0];
    const prodPriceInr = finalProduct.price / 100.0;

    const accessories = liveProducts.filter((p: RailwayProduct) => 
      p.id !== finalProduct.id && 
      (p.category === 'Accessories' || p.category === 'Peripherals' || p.category === 'Office') &&
      (p.price / 100.0) <= Math.max(3000, prodPriceInr * 0.5)
    );

    // Ensure growth accessory is distinct from main product
    if (growthItem.id === finalProduct.id) {
      const alt = liveProducts.find(p => p.id !== finalProduct.id && (p.category === 'Accessories' || p.category === 'Peripherals'));
      if (alt) growthItem = alt;
    }

    try {
      const accList = accessories.slice(0, 8);
      if (accList.length > 0 && (!growthItem || growthReason === 'Complementary accessory paired with your purchase')) {
        const accListStr = accList.map((a: RailwayProduct) => 
          `ID: "${a.id}", Name: "${a.name}", Price: ₹${(a.price / 100).toLocaleString()}, Description: "${a.description || ''}"`
        ).join('\n');

        const growthPrompt = `You are the Merchant Growth AI Agent.
Main Selected Product: ${finalProduct.name} (₹${prodPriceInr.toLocaleString()})
Buyer Request: "${message}"

Candidate Complementary Accessories:
${accListStr}

Pick the single best complementary accessory and write a persuasive, 1-sentence reason (under 18 words) explaining why it pairs well with ${finalProduct.name}.
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
    const formattedMessage = `🎯 I matched **${finalProduct.name}** for ₹${prodPriceInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.

💡 **Growth Suggestion**: ${growthReason} — **${growthItem.name}** for ₹${recPriceInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`;

    return NextResponse.json({
      status: 'awaiting_buyer_approval',
      action_type: 'ORDER',
      message: formattedMessage,
      merchant_id: body.merchant_id || 1,
      selected_product: {
        product_id: finalProduct.id,
        product_name: finalProduct.name,
        category: finalProduct.category,
        price_inr: prodPriceInr,
        stock_quantity: finalProduct.quantityAvailable || 25,
        rating: 4.6,
        description: finalProduct.description || '',
        tags: [finalProduct.category.toLowerCase()],
        image_url: finalProduct.imageUrl || 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=700&auto=format&fit=crop&q=80'
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
