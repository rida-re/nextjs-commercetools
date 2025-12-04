import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-100 text-gray-700 mt-12">
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Company Info */}
        <div>
          <h3 className="text-lg font-bold mb-2">CommerceStore</h3>
          <p className="text-sm">
            Your trusted destination for quality products powered by cutting-edge technology.
          </p>
        </div>

        {/* Shop */}
        <div>
          <h4 className="font-semibold mb-2">Shop</h4>
          <ul className="space-y-1 text-sm">
            <li>
              <Link href="/products" className="hover:underline">All Products</Link>
            </li>
            <li>
              <Link href="/new-arrivals" className="hover:underline">New Arrivals</Link>
            </li>
            <li>
              <Link href="/sale" className="hover:underline">Sale</Link>
            </li>
            <li>
              <Link href="/best-sellers" className="hover:underline">Best Sellers</Link>
            </li>
          </ul>
        </div>

        {/* Customer Service */}
        <div>
          <h4 className="font-semibold mb-2">Customer Service</h4>
          <ul className="space-y-1 text-sm">
            <li>
              <Link href="/contact" className="hover:underline">Contact Us</Link>
            </li>
            <li>
              <Link href="/shipping" className="hover:underline">Shipping Info</Link>
            </li>
            <li>
              <Link href="/returns" className="hover:underline">Returns</Link>
            </li>
            <li>
              <Link href="/faq" className="hover:underline">FAQ</Link>
            </li>
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <h4 className="font-semibold mb-2">Newsletter</h4>
          <p className="text-sm mb-2">Subscribe to get special offers and updates.</p>
          <form className="flex">
            <input
              type="email"
              placeholder="Your email"
              className="flex-1 px-3 py-2 border rounded-l focus:outline-none"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-r hover:bg-blue-700"
            >
              →
            </button>
          </form>
        </div>
      </div>

      <div className="border-t mt-6 py-4 text-center text-sm text-gray-500">
        &copy; 2024 CommerceStore. Powered by Commercetools. All rights reserved.
      </div>
    </footer>
  );
}
