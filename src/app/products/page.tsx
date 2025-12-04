import { getProducts } from '@/lib/commercetools/products';
import ProductGrid from '@/components/product/ProductGrid';

export default async function ProductsPage(props: {
  searchParams: Promise<{ sort?: string; filter?: string }>;
}) {

  const search = await props.searchParams;

  const sort = search.sort ? [search.sort] : undefined;
  const filter = search.filter ? [search.filter] : undefined;

  const productsData = await getProducts({ sort, filter });

  return (
    <main className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Catalog</h1>
          <p className="text-sm text-gray-600">Browse products and add them to your cart.</p>
        </div>

        <ProductGrid products={productsData} />
      </div>
    </main>
  );
}
