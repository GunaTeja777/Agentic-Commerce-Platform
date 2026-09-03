import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { markOrderPaid, markOrderFailed } from "@/lib/orders";

// Configure this exact URL + secret in Razorpay Dashboard -> Settings -> Webhooks
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  try {
    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      await markOrderPaid(payment.order_id, payment.id);
    } else if (event.event === "payment.failed") {
      const payment = event.payload.payment.entity;
      await markOrderFailed(payment.order_id);
    }
    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
