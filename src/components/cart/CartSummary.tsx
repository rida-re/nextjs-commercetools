"use client";

import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';

export default function CartSummary() {
  const { cart } = useCartStore();

  if (!cart || !cart.totalPrice) return null;

  const subtotalCents = cart.totalPrice.centAmount ?? 0;
  const subtotal = subtotalCents / 100;

  const taxRate = 0.1;
  const taxes = +(subtotal * taxRate).toFixed(2);

  const shipping = subtotal > 50 ? 0 : 5;

  const total = (subtotal + taxes + shipping).toFixed(2);

  return (
    <aside className="w-full md:w-4/5 lg:w-3/4 xl:w-2/3 border p-8 rounded shadow-md bg-white mx-auto">
      <h2 className="text-xl md:text-2xl font-bold mb-6 text-center">Order Summary</h2>

      <div className="flex justify-between text-base md:text-lg text-gray-700 mb-3">
        <span>Subtotal</span>
        <span>${subtotal.toFixed(2)}</span>
      </div>

      <div className="flex justify-between text-base md:text-lg text-gray-700 mb-3">
        <span>Taxes (10%)</span>
        <span>${taxes}</span>
      </div>

      <div className="flex justify-between text-base md:text-lg text-gray-700 mb-5">
        <span>Shipping</span>
        <span>{shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}</span>
      </div>

      <div className="flex justify-between text-lg md:text-xl font-semibold mb-6 border-t pt-3">
        <span>Total</span>
        <span>${total}</span>
      </div>

      <Link href="/checkout">
        <button className="w-full bg-blue-800 hover:bg-blue-700 transition-colors text-white py-3 md:py-4 rounded text-lg md:text-xl">
          Proceed to Checkout
        </button>
      </Link>
    </aside>
  );
}
