import { getCategories } from '@/lib/commercetools/categories';
import Link from 'next/link';

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <main className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-gray-600 mt-2">Browse our product categories</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const name = category.name?.en || category.name[Object.keys(category.name)[0]];
            const slug = category.slug?.en || category.slug[Object.keys(category.slug)[0]];
            
            return (
              <Link
                key={category.id}
                href={`/categories/${slug}`}
                className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold mb-2">{name}</h2>
                {category.description && (
                  <p className="text-gray-600 text-sm">
                    {category.description?.en || category.description[Object.keys(category.description)[0]]}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
