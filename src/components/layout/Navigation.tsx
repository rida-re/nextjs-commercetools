'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Category } from '@commercetools/platform-sdk';

export default function Navigation({ isMenuOpen }: { isMenuOpen: boolean }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openMobile, setOpenMobile] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/categories');
        const cats: Category[] = await response.json();
        setCategories(cats);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    }

    fetchCategories();
  }, []);

  // Helper: get localized value
  const getLocalized = (val: any) =>
    val?.en || val?.[Object.keys(val ?? {})[0]];

  // Build category tree
  const buildTree = (cats: Category[]) => {
    const map = new Map<string, any>();
    const roots: any[] = [];

    cats.forEach((cat) => map.set(cat.id, { ...cat, children: [] }));

    cats.forEach((cat) => {
      if (cat.parent) {
        const parent = map.get(cat.parent.id);
        if (parent) parent.children.push(map.get(cat.id));
      } else {
        roots.push(map.get(cat.id));
      }
    });

    return roots;
  };

  const categoryTree = buildTree(categories);

  return (
    <nav>
      {/* Desktop */}
      <ul className="hidden md:flex space-x-6 items-center">
        {categoryTree.map((cat) => {
          const name = getLocalized(cat.name);
          const slug = getLocalized(cat.slug);

          return (
            <li
              key={cat.id}
              className="relative group"
              onMouseEnter={() => setOpenDropdown(cat.id)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <Link
                href={`/categories/${slug}`}
                className="flex items-center px-3 py-1 hover:text-blue-600"
              >
                {name}
              </Link>

              {/* Submenu */}
              {cat.children.length > 0 && (
                <ul
                  className={`absolute top-full left-0 mt-2 w-48 bg-white border shadow-lg rounded z-50
                    ${openDropdown === cat.id ? 'block' : 'hidden'}
                  `}
                >
                  {cat.children.map((child: any) => {
                    const childName = getLocalized(child.name);
                    const childSlug = getLocalized(child.slug);
                    return (
                      <li key={child.id}>
                        <Link
                          href={`/categories/${childSlug}`}
                          className="block px-4 py-2 hover:bg-gray-100"
                        >
                          {childName}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {/* Mobile */}
      {isMenuOpen && (
        <ul className="md:hidden space-y-3 px-4 py-4 border-t">
          {categoryTree.map((cat) => {
            const name = getLocalized(cat.name);
            const slug = getLocalized(cat.slug);

            const isOpen = openMobile === cat.id;

            return (
              <li key={cat.id}>
                <div className="flex justify-between items-center">
                  <Link
                    href={`/categories/${slug}`}
                    className="font-medium py-1"
                  >
                    {name}
                  </Link>
                  {cat.children.length > 0 && (
                    <button
                      onClick={() =>
                        setOpenMobile(isOpen ? null : cat.id)
                      }
                      className="text-gray-500 px-2"
                    >
                      {isOpen ? '▲' : '▼'}
                    </button>
                  )}
                </div>

                {isOpen && cat.children.length > 0 && (
                  <ul className="pl-4 mt-1 space-y-1">
                    {cat.children.map((child: any) => {
                      const childName = getLocalized(child.name);
                      const childSlug = getLocalized(child.slug);
                      return (
                        <li key={child.id}>
                          <Link
                            href={`/categories/${childSlug}`}
                            className="block py-1"
                          >
                            {childName}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
