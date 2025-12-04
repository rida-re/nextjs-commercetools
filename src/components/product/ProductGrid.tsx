import ProductCard from './ProductCard';
import type { ProductProjection } from '@commercetools/platform-sdk';

export default function ProductGrid({ products }: { products: ProductProjection[] }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Products</h2>
        <div className="text-sm text-gray-600">{products.length} items</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
