import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/commercetools/categories";
import { getProductsByCategory } from "@/lib/commercetools/products";
import type { Category } from "@commercetools/platform-sdk";
import ProductGrid from "@/components/product/ProductGrid";
import Breadcrumb from "@/components/layout/Breadcrumb";


export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const category : Category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const name =
    category.name?.en || category.name[Object.keys(category.name)[0]];

  const description =
    category.description?.en || "";

  const products = await getProductsByCategory(category.id);

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Categories', href: '/categories' },
    { label: name },
  ];

  return (
 <div className="max-w-6xl mx-auto px-4 py-10">
      <Breadcrumb items={breadcrumbItems} />
      <h1 className="text-3xl font-bold mb-4">{name}</h1>

      {category.description && (
        <p className="text-gray-700 mb-6">{description}</p>
      )}

      <ProductGrid products={products} />
    </div>
  );
}
