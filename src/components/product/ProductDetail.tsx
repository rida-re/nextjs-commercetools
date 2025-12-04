import Image from "next/image";
import type { ProductProjection } from "@commercetools/platform-sdk";
import AddToCartButton from "../cart/AddToCartButton";
import Link from "next/link";
// import AddToCartButton from "../cart/AddToCartButton";

export default function ProductDetail({ product }: { product: ProductProjection }) {
  const variant = product.masterVariant;
  const images = variant?.images || [];
  const price = variant?.prices?.[0];
  const displayPrice = price ? `$${(price.value.centAmount / 100).toFixed(2)}` : "—";

  const name =
    product.name?.en || product.name[Object.keys(product.name)[0]];

  const description =
    product.description?.en || "";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
      {/* IMAGE BLOCK */}

      <div>
      <Link href="/">
        <button className="inline-block border px-4 py-2 rounded">Back</button>
      </Link>
        <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
          <Image
            src={images[0]?.url || "/placeholder.png"}
            alt={name}
            fill
            className="object-cover"
            sizes="100vw"
          />
        </div>

        {/* Thumbnail Gallery */}
        {images.length > 1 && (
          <div className="flex gap-3 mt-4">
            {images.slice(1).map((img, index) => (
              <div
                key={index}
                className="relative w-20 h-20 bg-gray-100 rounded overflow-hidden"
              >
                <Image
                  src={img.url}
                  alt={`Thumbnail ${index}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PRODUCT INFO */}
      <div className="flex flex-col justify-start">
        <h1 className="text-3xl font-semibold">{name}</h1>

        <div className="mt-3 text-2xl font-bold text-blue-600">{displayPrice}</div>

        {description && (
          <p className="mt-5 text-gray-700 leading-relaxed">{description}</p>
        )}

        <div className="mt-6">

          <AddToCartButton productId={product.id} />

        </div>
      </div>
    </div>
  );
}
