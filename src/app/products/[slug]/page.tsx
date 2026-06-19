import { getProductBySlug } from "@/lib/commercetools/products";
import ProductDetail from "@/components/product/ProductDetail";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/layout/Breadcrumb";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const name =
    product.name?.en || product.name[Object.keys(product.name)[0]];

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: name },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <Breadcrumb items={breadcrumbItems} />
      <ProductDetail product={product} />
    </div>
  );
}
