'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/cartStore';
import Navigation from './Navigation';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { cart } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cartItemsCount =
    mounted && cart
      ? cart.lineItems.reduce((sum, item) => sum + item.quantity, 0)
      : 0;

  return (
    <header className="w-full border-b relative z-50">
      {/* Top Bar */}
      <div className="bg-gray-100 text-sm flex justify-between items-center px-4 py-2">
        <span>🎉 Free shipping on orders over $50</span>
        <div className="space-x-4">
          <Link href="/help">Help</Link>
          <Link href="/track-order">Track Order</Link>
        </div>
      </div>

      {/* Main Header */}
      <div className="flex justify-between items-center px-4 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 font-bold text-xl">
          <span className="text-blue-600">C</span>
          <span>CommerceStore</span>
        </Link>

        {/* Search Bar - Desktop */}
        <div className="hidden md:flex flex-1 mx-4">
          <input
            type="text"
            placeholder="Search products..."
            className="w-full border rounded px-3 py-2 focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* User Account */}
          <Link href="/account">Account</Link>

          {/* Wishlist */}
          <Link href="/wishlist">Wishlist</Link>

          {/* Cart */}
          <Link href="/cart" className="relative">
            Cart
            {mounted && cartItemsCount > 0 && (
              <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                {cartItemsCount}
              </span>
            )}
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded border"
          >
            {isMenuOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>

      {/* Search Bar - Mobile */}
      {isMenuOpen && (
        <div className="md:hidden px-4 pb-4">
          <input
            type="text"
            placeholder="Search products..."
            className="w-full border rounded px-3 py-2 focus:outline-none"
          />
        </div>
      )}

      {/* Navigation */}
      <Navigation isMenuOpen={isMenuOpen} />
    </header>
  );
}
