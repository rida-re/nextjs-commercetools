import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/commercetools/categories";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params; // ⬅ IMPORTANT: await the params

  const category = await getCategoryBySlug(slug);
  console.log(category)

  if (!category) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      
    </div>
  );
}
