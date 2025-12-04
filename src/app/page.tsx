import { getProducts } from '@/lib/commercetools/products';
import ProductGrid from '@/components/product/ProductGrid';

export default async function HomePage() {
  const productsData = await getProducts({ limit: 8 });

  return (
    <main className="p-6">
      <div className="max-w-7xl mx-auto">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold leading-tight">Welcome to Commercetools Demo</h1>
            <p className="mt-4 text-gray-600">Explore a curated selection of products powered by commercetools. Add items to the cart and try the voice assistant.</p>

          </div>


        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Featured Products</h2>
          <ProductGrid products={productsData} />
        </section>

      </div>
    </main>
  );
}