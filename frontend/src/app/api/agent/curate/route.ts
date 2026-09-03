import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6K9pubdEL0SGKX0UQlMyG6i11zEKVzNHKUEcwbpmcLcfw';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body.prompt || '';
    const buyerId = body.buyer_id || 'demo-ai-buyer';

    let category = 'General';
    let searchQuery = 'product';
    let budgetInr = 50000;
    let useCase = 'work';
    let priority = 'standard';

    // Parse with Gemini LLM
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const curatorPrompt = `You are a Buyer Intent Curation AI.
Parse the following buyer request into a structured JSON contract:
"${prompt}"

Return ONLY valid JSON in this format:
{
  "search_query": "<concise keyword, e.g. laptop, monitor stand, headphones>",
  "category": "<Laptops|Monitors|Accessories|Audio|Gaming|Office>",
  "budget_inr": <number or null>,
  "use_case": "<work|gaming|general|study>",
  "priority": "<productivity|budget|performance|battery>"
}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: curatorPrompt }] }]
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          searchQuery = parsed.search_query || searchQuery;
          category = parsed.category || category;
          if (parsed.budget_inr) budgetInr = Number(parsed.budget_inr);
          useCase = parsed.use_case || useCase;
          priority = parsed.priority || priority;
        }
      }
    } catch (llmErr) {
      console.warn('LLM intent curation fallback:', llmErr);
      // Regex fallback
      const budgetMatch = prompt.match(/(?:under|below|budget|for)\s*(?:₹|rs\.?|inr)?\s*([0-9]+(?:,[0-9]+)*)/i);
      if (budgetMatch) {
        budgetInr = Number(budgetMatch[1].replace(/,/g, ''));
      }
      searchQuery = prompt.replace(/(?:under|below|budget|for|i need|i want)\s*(?:₹|rs\.?|inr)?\s*([0-9]+(?:,[0-9]+)*)?/gi, '').trim() || 'product';
    }

    const intent = `purchase_${searchQuery.toLowerCase().replace(/\s+/g, '_')}`;

    return NextResponse.json({
      search_query: searchQuery,
      category,
      budget_inr: budgetInr,
      use_case: useCase,
      priority_feature: priority,
      intent,
      structured_request: {
        buyer_id: buyerId,
        intent,
        category,
        budget_inr: budgetInr,
        preferences: {
          use_case: useCase,
          priority
        }
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
