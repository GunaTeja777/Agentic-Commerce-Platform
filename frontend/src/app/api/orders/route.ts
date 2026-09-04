import { NextResponse } from 'next/server';

const STORE_API_URL = process.env.STORE_API_URL || 'https://ai-growth-agentic-commerce-production.up.railway.app';

export async function GET() {
  try {
    const res = await fetch(`${STORE_API_URL}/api/orders`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    return NextResponse.json([]);
  } catch (err) {
    console.warn('GET /api/orders proxy error:', err);
    return NextResponse.json([]);
  }
}
