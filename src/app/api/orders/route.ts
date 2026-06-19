import { NextRequest, NextResponse } from "next/server";
import { getOrders, getOrderById, createOrderFromCart } from "@/lib/commercetools/orders";

type ActionBody =
  | { action: "list"; limit?: number; offset?: number }
  | { action: "get"; orderId: string }
  | { action: "create"; cartId: string; cartVersion: number };

export async function POST(req: NextRequest) {
  try {
    const body: ActionBody = await req.json();

    switch (body.action) {
      case "list":
        const orders = await getOrders({ 
          limit: body.limit || 20, 
          offset: body.offset || 0 
        });
        return NextResponse.json(orders);

      case "get":
        const order = await getOrderById(body.orderId);
        return NextResponse.json(order);

      case "create":
        const newOrder = await createOrderFromCart(body.cartId, body.cartVersion);
        return NextResponse.json(newOrder);

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Orders API Error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
