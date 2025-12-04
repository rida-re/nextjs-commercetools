// app/api/cart/route.ts
import { NextRequest, NextResponse } from "next/server";
import { apiRoot } from "@/lib/commercetools/client";
import type { Cart } from "@commercetools/platform-sdk";

type ActionBody =
  | { action: "create"; currency?: string }
  | { action: "get"; cartId: string }
  | { action: "add"; cartId: string; version: number; productId: string; quantity?: number; variantId?: number }
  | { action: "update"; cartId: string; version: number; lineItemId: string; quantity: number }
  | { action: "remove"; cartId: string; version: number; lineItemId: string };

export async function POST(req: NextRequest) {
  try {
    const body: ActionBody = await req.json();
    let cart: Cart | null = null;

    switch (body.action) {
      case "create":
        cart = await apiRoot.carts().post({ body: { currency: body.currency || "EUR", country: "DE", } }).execute().then(r => r.body);
        break;

      case "get":
        cart = await apiRoot.carts().withId({ ID: body.cartId }).get().execute().then(r => r.body);
        break;

      case "add":
        cart = await apiRoot
          .carts()
          .withId({ ID: body.cartId })
          .post({
            body: {
              version: body.version,
              actions: [
                {
                  action: "addLineItem",
                  productId: body.productId,
                  variantId: body.variantId ?? 1, // fallback to master variant
                  quantity: body.quantity ?? 1,
                },
              ],
            },
          })
          .execute()
          .then(r => r.body);
        break;

      case "update":
        cart = await apiRoot
          .carts()
          .withId({ ID: body.cartId })
          .post({
            body: {
              version: body.version,
              actions: [
                {
                  action: "changeLineItemQuantity",
                  lineItemId: body.lineItemId,
                  quantity: body.quantity,
                },
              ],
            },
          })
          .execute()
          .then(r => r.body);
        break;

      case "remove":
        cart = await apiRoot
          .carts()
          .withId({ ID: body.cartId })
          .post({
            body: {
              version: body.version,
              actions: [
                {
                  action: "removeLineItem",
                  lineItemId: body.lineItemId,
                },
              ],
            },
          })
          .execute()
          .then(r => r.body);
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(cart);
  } catch (error: any) {
    console.error("Cart API Error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
