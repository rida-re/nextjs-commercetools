"use client";

import Image from 'next/image';
import { useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import type { LineItem } from '@commercetools/platform-sdk';

const locale = "en-US";

export default function CartItem({ item }: { item: LineItem }) {
  const { cart, cartId, setCart } = useCartStore();
  const [loading, setLoading] = useState(false);

  const quantity = item.quantity ?? 1;
  const image = item.variant?.images?.[0]?.url || '/placeholder.png';

  const name =
    item.name?.[locale] ??
    Object.values(item.name ?? {})[0] ??
    "Unnamed product";

  const handleChangeQuantity = async (newQty: number) => {
    if (!cartId || !cart) return;
    setLoading(true);

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        body: JSON.stringify({
          action: "update",
          cartId: cart.id,
          version: cart.version,
          lineItemId: item.id!,
          quantity: newQty,
        }),
      });

      const updated = await res.json();
      setCart(updated);
    } catch (err) {
      console.error('Failed to update quantity', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!cartId || !cart) return;
    setLoading(true);

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        body: JSON.stringify({
          action: "remove",
          cartId: cart.id,
          version: cart.version,
          lineItemId: item.id!,
        }),
      });

      const updated = await res.json();
      setCart(updated);
    } catch (err) {
      console.error('Failed to remove item', err);
    } finally {
      setLoading(false);
    }
  };

  const unitPrice = (item.price?.value?.centAmount ?? 0) / 100;
  const totalPrice = (unitPrice * quantity).toFixed(2);

  return (
    <div className="flex items-center gap-4 border-b py-4">
      <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
        <Image src={image} alt={name} width={80} height={80} className="object-cover" />
      </div>

      <div className="flex-1">
        <div className="font-medium">{name}</div>
        {item.variant?.sku && (
          <div className="text-sm text-gray-500">SKU: {item.variant.sku}</div>
        )}

        <div className="mt-2 flex items-center gap-3">
          <div className="flex items-center border rounded">
            <button
              className="px-2"
              onClick={() => handleChangeQuantity(Math.max(1, quantity - 1))}
              disabled={loading}
            >
              -
            </button>
            <div className="px-3">{quantity}</div>
            <button
              className="px-2"
              onClick={() => handleChangeQuantity(quantity + 1)}
              disabled={loading}
            >
              +
            </button>
          </div>

          <div className="text-sm text-gray-700">Unit: €{unitPrice.toFixed(2)}</div>
          <div className="font-semibold">Line: €{totalPrice}</div>
        </div>
      </div>

      <div>
        <button
          className="text-sm text-red-600"
          onClick={handleRemove}
          disabled={loading}
        >
          {loading ? '...' : 'Remove'}
        </button>
      </div>
    </div>
  );
}
