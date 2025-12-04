import { getProductBySlug } from "@/lib/commercetools/products";
import ProductDetail from "@/components/product/ProductDetail";
import { notFound } from "next/navigation";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params; // ⬅ IMPORTANT: await the params

  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <ProductDetail product={product} />
    </div>
  );
}
