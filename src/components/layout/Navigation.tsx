'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCategories } from '@/lib/commercetools/categories';
import type { Category } from '@commercetools/platform-sdk';

export default function Navigation({ isMenuOpen }: { isMenuOpen: boolean }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

useEffect(() => {
  async function fetchCategories() {
    try {
      const response = await fetch("/api/categories", { method: "GET" });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const cats: Category[] = await response.json();
      setCategories(cats);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  }

  fetchCategories();
}, []);


  const mainCategories = [
    { name: 'Home', href: '/', icon: '🏠' },
    { name: 'All Products', href: '/products', icon: '🛍️' },
    { name: 'New Arrivals', href: '/products?sort=createdAt desc', icon: '✨' },
    { name: 'Best Sellers', href: '/products?sort=sales desc', icon: '🔥' },
    { name: 'Sale', href: '/products?filter=onSale', icon: '💰' },
  ];

  return (
    <nav>
      {/* Desktop Navigation */}
      <ul className="hidden md:flex space-x-6 items-center">
        {mainCategories.map((item) => (
          <li key={item.name}>
            <Link href={item.href} className="flex items-center space-x-1 hover:text-blue-600">
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          </li>
        ))}

        {/* Categories Dropdown */}
        {categories.length > 0 && (
          <li
            className="relative"
            onMouseEnter={() => setOpenDropdown('categories')}
            onMouseLeave={() => setOpenDropdown(null)}
          >
            <button className="flex items-center space-x-1 hover:text-blue-600">
              <span>📂</span>
              <span>Categories</span>
            </button>
            {openDropdown === 'categories' && (
              <ul className="absolute top-full left-0 mt-2 w-48 bg-white border shadow-lg rounded z-50">
                {categories.slice(0, 8).map((category) => {
                  const categoryName =
                    category.name.en || category.name[Object.keys(category.name)[0]];
                  const categorySlug =
                    category.slug?.en || category.slug?.[Object.keys(category.slug!)[0]];

                  return (
                    <li key={category.id}>
                      <Link
                        href={`/categories/${categorySlug}`}
                        className="block px-4 py-2 hover:bg-gray-100"
                      >
                        {categoryName}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <Link
                    href="/categories"
                    className="block px-4 py-2 font-semibold hover:bg-gray-100"
                  >
                    View All Categories →
                  </Link>
                </li>
              </ul>
            )}
          </li>
        )}
      </ul>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <ul className="md:hidden space-y-3 px-4 py-4 border-t">
          {mainCategories.map((item) => (
            <li key={item.name}>
              <Link href={item.href} className="flex items-center space-x-2">
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            </li>
          ))}

          {/* Categories Mobile */}
          {categories.length > 0 && (
            <li>
              <span className="block font-semibold mb-2">📂 Categories</span>
              <ul className="pl-4 space-y-1">
                {categories.slice(0, 8).map((category) => {
                  const categoryName =
                    category.name.en || category.name[Object.keys(category.name)[0]];
                  const categorySlug =
                    category.slug?.en || category.slug?.[Object.keys(category.slug!)[0]];

                  return (
                    <li key={category.id}>
                      <Link href={`/category/${categorySlug}`} className="block">
                        {categoryName}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <Link href="/categories" className="block font-semibold mt-1">
                    View All Categories →
                  </Link>
                </li>
              </ul>
            </li>
          )}
        </ul>
      )}
    </nav>
  );
}
