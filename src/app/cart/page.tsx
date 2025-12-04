"use client";

import { useCartStore } from '@/store/cartStore';
import CartItem from '@/components/cart/CartItem';
import CartSummary from '@/components/cart/CartSummary';
import Link from 'next/link';

export default function CartPage() {
  const { cart, hydrated } = useCartStore();

  // Prevent flash of "empty"
  if (!hydrated) {
    return (
      <main className="p-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-gray-600">Loading your cart...</p>
        </div>
      </main>
    );
  }

  const lineItems = cart?.lineItems ?? [];

  if (!cart || lineItems.length === 0) {
    return (
      <main className="p-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-semibold">Your cart is empty</h2>
          <p className="text-gray-600 mt-2">Browse our products and add items to your cart.</p>
          <div className="mt-4">
            <Link href="/products">
              <button className="bg-blue-600 text-white px-4 py-2 rounded">Shop Products</button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="md:col-span-2">
          <h1 className="text-2xl font-bold mb-4">Shopping Cart</h1>

          <div className="bg-white rounded shadow p-4">
            {cart.lineItems.map((item) => (
              <CartItem key={item.id} item={item} />
            ))}
          </div>
        </section>

        <aside>
          <CartSummary />
        </aside>
      </div>
    </main>
  );
}
