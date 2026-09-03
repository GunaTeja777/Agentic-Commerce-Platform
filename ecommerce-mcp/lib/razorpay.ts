import Razorpay from "razorpay";
import crypto from "crypto";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

/** Create a Razorpay order (amount in paise). Call this right after your internal Order row is created. */
export async function createRazorpayOrder(amountPaise: number, receiptId: string) {
  return razorpay.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: receiptId,
    payment_capture: true,
  });
}

/** Verify the signature Razorpay sends back after checkout completes client-side */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

/** Verify a webhook payload signature (X-Razorpay-Signature header) */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}
