import { prisma } from "./db";
import { createRazorpayOrder } from "./razorpay";

export type CreateOrderInput = {
  customerEmail: string;
  customerName?: string;
  items: { productId: string; quantity: number }[];
};

export class OrderError extends Error {}

/**
 * Creates a local Order + a Razorpay order for payment, reserving inventory.
 * Returns everything an agent/frontend needs to complete checkout.
 */
export async function createOrder(input: CreateOrderInput) {
  if (!input.items?.length) throw new OrderError("Order must include at least one item");

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({
      where: { email: input.customerEmail },
      update: { name: input.customerName ?? undefined },
      create: { email: input.customerEmail, name: input.customerName },
    });

    let totalAmount = 0;
    const itemsData: { productId: string; quantity: number; unitPrice: number }[] = [];

    for (const item of input.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        include: { inventory: true },
      });
      if (!product) throw new OrderError(`Product ${item.productId} not found`);
      const available = product.inventory?.quantity ?? 0;
      if (available < item.quantity) {
        throw new OrderError(
          `Insufficient stock for ${product.name}: requested ${item.quantity}, available ${available}`
        );
      }
      totalAmount += product.price * item.quantity;
      itemsData.push({ productId: product.id, quantity: item.quantity, unitPrice: product.price });

      // reserve stock immediately; released again if order is cancelled/fails
      await tx.inventory.update({
        where: { productId: product.id },
        data: { quantity: { decrement: item.quantity } },
      });
    }

    const order = await tx.order.create({
      data: {
        customerId: customer.id,
        totalAmount,
        currency: "INR",
        status: "PENDING",
        items: { create: itemsData },
      },
      include: { items: { include: { product: true } } },
    });

    const rpOrder = await createRazorpayOrder(totalAmount, order.id);

    const updated = await tx.order.update({
      where: { id: order.id },
      data: { razorpayOrderId: rpOrder.id },
      include: { items: { include: { product: true } } },
    });

    return {
      orderId: updated.id,
      status: updated.status,
      totalAmount: updated.totalAmount,
      currency: updated.currency,
      razorpayOrderId: rpOrder.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID, // safe to expose, needed client-side for checkout widget
      items: updated.items.map((i) => ({
        productId: i.productId,
        name: i.product.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    };
  });
}

export async function getOrderStatus(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } }, customer: true },
  });
  if (!order) return null;
  return {
    orderId: order.id,
    status: order.status,
    totalAmount: order.totalAmount,
    currency: order.currency,
    customerEmail: order.customer.email,
    customerName: order.customer.name,
    razorpayOrderId: order.razorpayOrderId,
    razorpayPaymentId: order.razorpayPaymentId,
    items: order.items.map((i) => ({
      productId: i.productId,
      name: i.product.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      imageUrl: i.product.imageUrl,
    })),
    createdAt: order.createdAt,
  };
}

/** Cancels an order (only if not already shipped/delivered) and restocks inventory. */
export async function cancelOrder(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new OrderError("Order not found");
    if (["SHIPPED", "DELIVERED", "CANCELLED"].includes(order.status)) {
      throw new OrderError(`Order cannot be cancelled from status ${order.status}`);
    }
    for (const item of order.items) {
      await tx.inventory.update({
        where: { productId: item.productId },
        data: { quantity: { increment: item.quantity } },
      });
    }
    const updated = await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    return { orderId: updated.id, status: updated.status };
  });
}

export async function getCustomerOrders(customerEmail: string) {
  const customer = await prisma.customer.findUnique({
    where: { email: customerEmail },
    include: { orders: { include: { items: { include: { product: true } } }, orderBy: { createdAt: "desc" } } },
  });
  if (!customer) return [];
  return customer.orders.map((order) => ({
    orderId: order.id,
    status: order.status,
    totalAmount: order.totalAmount,
    currency: order.currency,
    customerEmail: customer.email,
    customerName: customer.name,
    razorpayOrderId: order.razorpayOrderId,
    razorpayPaymentId: order.razorpayPaymentId,
    createdAt: order.createdAt,
    items: order.items.map((i) => ({
      productId: i.productId,
      name: i.product.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      imageUrl: i.product.imageUrl,
    })),
  }));
}

export async function getAllOrders(limit = 50) {
  const orders = await prisma.order.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      items: { include: { product: true } },
    },
  });

  return orders.map((order) => ({
    orderId: order.id,
    status: order.status,
    totalAmount: order.totalAmount,
    currency: order.currency,
    customerEmail: order.customer.email,
    customerName: order.customer.name,
    razorpayOrderId: order.razorpayOrderId,
    razorpayPaymentId: order.razorpayPaymentId,
    createdAt: order.createdAt,
    items: order.items.map((i) => ({
      productId: i.productId,
      name: i.product.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      imageUrl: i.product.imageUrl,
    })),
  }));
}

/** Called from the Razorpay webhook once payment is confirmed */
export async function markOrderPaid(razorpayOrderId: string, razorpayPaymentId: string) {
  return prisma.order.update({
    where: { razorpayOrderId },
    data: { status: "PAID", razorpayPaymentId },
  });
}

export async function markOrderFailed(razorpayOrderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { razorpayOrderId }, include: { items: true } });
    if (!order || order.status !== "PENDING") return;
    for (const item of order.items) {
      await tx.inventory.update({ where: { productId: item.productId }, data: { quantity: { increment: item.quantity } } });
    }
    await tx.order.update({ where: { razorpayOrderId }, data: { status: "FAILED" } });
  });
}
