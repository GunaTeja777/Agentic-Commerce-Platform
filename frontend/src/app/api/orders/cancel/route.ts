import { NextRequest, NextResponse } from 'next/server';

const STORE_API_URL = process.env.STORE_API_URL || 'https://ai-growth-agentic-commerce-production.up.railway.app';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId = body.orderId || body.id;
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const res = await fetch(`${STORE_API_URL}/api/orders/${orderId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    } else {
      const errText = await res.text();
      return NextResponse.json({ error: errText || 'Failed to cancel order' }, { status: res.status });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
