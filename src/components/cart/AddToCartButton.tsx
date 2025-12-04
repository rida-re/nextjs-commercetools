'use client';

import { useState } from 'react';
import { useCartStore } from '@/store/cartStore';

export default function AddToCartButton({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false);
  const [qty, setQty] = useState(1);
  const { cart, cartId, setCart, setCartId } = useCartStore();

  const handleAddToCart = async () => {
    setLoading(true);
    try {
      let currentCart = cart;
      let currentCartId = cartId;

      // 1️⃣ Create a new cart if it doesn't exist
      if (!currentCartId) {
        const res = await fetch("/api/cart", {
          method: "POST",
          body: JSON.stringify({ action: "create", currency: "EUR" }),
        });
        const newCart = await res.json();
        currentCart = newCart;
        currentCartId = newCart.id;
        setCart(newCart);
        setCartId(currentCartId);
      } else {
        // 2️⃣ Fetch existing cart
        const res = await fetch("/api/cart", {
          method: "POST",
          body: JSON.stringify({ action: "get", cartId: currentCartId }),
        });
        currentCart = await res.json();
      }

      // 3️⃣ Add product to cart
      const res = await fetch("/api/cart", {
        method: "POST",
        body: JSON.stringify({
          action: "add",
          cartId: currentCartId,
          version: currentCart!.version,
          productId,
          quantity: qty,
        }),
      });
      const updatedCart = await res.json();

      setCart(updatedCart);
      //alert('Product added to cart!');
    } catch (error) {
      console.error('Failed to add to cart:', error);
      alert('Failed to add to cart');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center border rounded">
        <button className="px-2" onClick={() => setQty(Math.max(1, qty - 1))} disabled={loading}>-</button>
        <div className="px-3">{qty}</div>
        <button className="px-2" onClick={() => setQty(qty + 1)} disabled={loading}>+</button>
      </div>

      <button
        className="bg-blue-600 text-white px-3 py-1 rounded"
        onClick={handleAddToCart}
        disabled={loading}
      >
        {loading ? 'Adding...' : 'Add to Cart'}
      </button>
    </div>
  );
}
