import { getProducts } from '@/lib/commercetools/products';
import ProductGrid from '@/components/product/ProductGrid';

export default async function ProductsPage(props: {
  searchParams: Promise<{ sort?: string; filter?: string }>;
}) {

  const search = await props.searchParams;


  return (
    <main className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Categories</h1>
        </div>

        
      </div>
    </main>
  );
}
