import { NextRequest, NextResponse } from "next/server";
import { createOrder, getCustomerOrders, getAllOrders, OrderError } from "@/lib/orders";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await createOrder({
      customerEmail: body.customerEmail,
      customerName: body.customerName,
      items: body.items,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    const status = err instanceof OrderError ? 400 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function GET(req: NextRequest) {
  const email = new URL(req.url).searchParams.get("customerEmail");
  try {
    if (email) {
      return NextResponse.json(await getCustomerOrders(email));
    }
    // If no email provided, return all recent orders
    return NextResponse.json(await getAllOrders(50));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
