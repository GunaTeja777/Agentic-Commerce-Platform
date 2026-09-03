import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const amountInr = Number(body.amount_inr || body.amount || 0);
    const maxLimit = 70000;

    const isAllowed = amountInr <= maxLimit;
    const reason = isAllowed
      ? `Policy Approved: Transaction of ₹${amountInr.toLocaleString()} is within the maximum limit of ₹${maxLimit.toLocaleString()}.`
      : `Policy Blocked: Transaction of ₹${amountInr.toLocaleString()} exceeds merchant limit of ₹${maxLimit.toLocaleString()}. Payment tool execution blocked.`;

    return NextResponse.json({
      allowed: isAllowed,
      reason,
      max_transaction_inr: maxLimit,
      requested_amount_inr: amountInr
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { allowed: false, reason: `Policy Gate Error: ${msg}`, max_transaction_inr: 70000 },
      { status: 400 }
    );
  }
}
