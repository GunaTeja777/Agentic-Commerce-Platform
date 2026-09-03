import { NextRequest, NextResponse } from "next/server";
import { getOrderStatus, cancelOrder, OrderError } from "@/lib/orders";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const order = await getOrderStatus(params.id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    if (body.razorpayPaymentId) {
      const updated = await prisma.order.update({
        where: { id: params.id },
        data: {
          status: "PAID",
          razorpayPaymentId: body.razorpayPaymentId,
        },
      });
      return NextResponse.json(updated);
    }
    return NextResponse.json({ error: "Missing payment information" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await cancelOrder(params.id);
    return NextResponse.json(result);
  } catch (err: any) {
    const status = err instanceof OrderError ? 400 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
