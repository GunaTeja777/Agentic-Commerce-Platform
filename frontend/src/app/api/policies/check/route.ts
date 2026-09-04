import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const amountInr = Number(body.amount_inr || body.amount || 0);
    const maxLimit = Number(body.max_limit || body.max_transaction_inr || 70000);
    const approvalThreshold = Number(body.approval_threshold || body.approval_threshold_inr || 5000);

    const isBlocked = amountInr > maxLimit;
    const requiresApproval = !isBlocked && amountInr > approvalThreshold;
    const isAutonomous = !isBlocked && !requiresApproval;

    let status: 'allowed' | 'requires_approval' | 'blocked';
    let reason: string;

    if (isBlocked) {
      status = 'blocked';
      reason = `Policy Blocked: Transaction of ₹${amountInr.toLocaleString()} exceeds merchant maximum limit of ₹${maxLimit.toLocaleString()}. Payment tool execution blocked.`;
    } else if (requiresApproval) {
      status = 'requires_approval';
      reason = `Approval Required: Transaction of ₹${amountInr.toLocaleString()} exceeds autonomous threshold of ₹${approvalThreshold.toLocaleString()} (Max Limit: ₹${maxLimit.toLocaleString()}). Human authorization required before booking.`;
    } else {
      status = 'allowed';
      reason = `Autonomous Approval: Transaction of ₹${amountInr.toLocaleString()} is within autonomous threshold of ₹${approvalThreshold.toLocaleString()}. Order placed without human intervention.`;
    }

    return NextResponse.json({
      allowed: !isBlocked,
      status,
      requires_approval: requiresApproval,
      is_autonomous: isAutonomous,
      reason,
      max_transaction_inr: maxLimit,
      approval_threshold_inr: approvalThreshold,
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
