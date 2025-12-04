import Image from 'next/image';
import Link from 'next/link';
import AddToCartButton from '../cart/AddToCartButton';
import type { ProductProjection } from '@commercetools/platform-sdk';

export default function ProductCard({ product }: { product: ProductProjection }) {
  const price = product.masterVariant?.prices?.[0];
  const image = product.masterVariant?.images?.[0]?.url || '/placeholder.png';
  const name = product.name?.en || product.name[Object.keys(product.name)[0]];
  const slug = product.slug?.en || product.slug[Object.keys(product.slug)[0]];
  const description = product.description?.en || '';

  const displayPrice = price ? `$${(price.value.centAmount / 100).toFixed(2)}` : '—';

  return (
    <div className="border rounded overflow-hidden shadow-sm hover:shadow-md transition">
      <Link href={`/products/${slug}`} className="block">
        <div className="w-full h-48 bg-gray-100 relative">
          <Image src={image} alt={name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
        </div>
      </Link>

      <div className="p-4">
        <Link href={`/products/${slug}`} className="block">
          <h3 className="font-medium text-lg">{name}</h3>
        </Link>

        {description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{description}</p>}

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xl font-semibold">{displayPrice}</div>
          <div>
          <AddToCartButton productId={product.id} />
          </div>
        </div>

      </div>
    </div>
  );
}
