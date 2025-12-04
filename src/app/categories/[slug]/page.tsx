import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/commercetools/categories";
import type { Category } from "@commercetools/platform-sdk";


export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params; // ⬅ IMPORTANT: await the params

  const category : Category = await getCategoryBySlug(slug);
  console.log(category)

  if (!category) {
    notFound();
  }

  const name =
    category.name?.en || category.name[Object.keys(category.name)[0]];

  const description =
    category.description?.en || "";

  return (
 <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-4">{name}</h1>

      {category.description && (
        <p className="text-gray-700 mb-6">{description}</p>
      )}

      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Category Details</h2>

        <ul className="space-y-1">
          <li><strong>ID:</strong> {category.id}</li>
          <li><strong>Parent:</strong> {category.parent?.id ?? "None"}</li>
          <li><strong>Order Hint:</strong> {category.orderHint}</li>
        </ul>
      </div>

      {/* PRODUCTS SECTION (optional) */}
      {/* Add this only if you also fetch products */}
    </div>
  );
}
