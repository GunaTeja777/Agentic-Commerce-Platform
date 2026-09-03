import { NextRequest, NextResponse } from 'next/server';

const STORE_API_URL = process.env.STORE_API_URL || 'https://ai-growth-agentic-commerce-production.up.railway.app';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, paymentId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const payId = paymentId || `pay_agent_mcp_${Math.random().toString(36).substring(2, 10)}`;

    const patchRes = await fetch(`${STORE_API_URL}/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ razorpayPaymentId: payId })
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      console.error('Store patch error:', patchRes.status, errText);
      return NextResponse.json({ error: `Store patch failed: ${errText}` }, { status: patchRes.status });
    }

    const resData = await patchRes.json();
    return NextResponse.json({ success: true, paymentId: payId, order: resData });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Order settlement proxy exception:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
