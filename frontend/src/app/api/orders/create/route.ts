import { NextRequest, NextResponse } from 'next/server';

const STORE_API_URL = process.env.STORE_API_URL || 'https://ai-growth-agentic-commerce-production.up.railway.app';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerEmail, customerName, items } = body;

    // 1. Fetch live products from Railway store to resolve any names / IDs to exact CUIDs
    let resolvedItems = items || [];
    const needsResolution = resolvedItems.some(
      (it: { productId: string }) => !it.productId || !it.productId.startsWith('cmtl') || it.productId.length < 20
    );

    if (needsResolution) {
      try {
        const prodRes = await fetch(`${STORE_API_URL}/api/products`, { cache: 'no-store' });
        if (prodRes.ok) {
          const liveProds: Array<{ id: string; name: string }> = await prodRes.json();
          if (Array.isArray(liveProds) && liveProds.length > 0) {
            resolvedItems = resolvedItems.map((item: { productId: string; quantity?: number; name?: string }) => {
              let targetId = item.productId;
              if (!targetId || !targetId.startsWith('cmtl') || targetId.length < 20) {
                if (item.name) {
                  const found = liveProds.find(p =>
                    p.name.toLowerCase().includes(item.name!.toLowerCase()) ||
                    item.name!.toLowerCase().includes(p.name.toLowerCase())
                  );
                  if (found) targetId = found.id;
                }
                if (!targetId || !targetId.startsWith('cmtl')) {
                  targetId = liveProds[0].id;
                }
              }
              return { productId: targetId, quantity: item.quantity || 1 };
            });
          }
        }
      } catch (resErr) {
        console.warn('Proxy product resolution error:', resErr);
      }
    }

    // 2. Server-side POST to live Railway store (Zero CORS restrictions)
    const storeRes = await fetch(`${STORE_API_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerEmail: customerEmail || 'buyer.demo@agentic-commerce.com',
        customerName: customerName || 'Demo Buyer',
        items: resolvedItems
      })
    });

    if (!storeRes.ok) {
      const errText = await storeRes.text();
      console.error('Store order creation error:', storeRes.status, errText);
      return NextResponse.json({ error: `Store error: ${errText}` }, { status: storeRes.status });
    }

    const orderData = await storeRes.json();
    return NextResponse.json(orderData);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Order creation proxy exception:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
