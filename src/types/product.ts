export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  images: string[];
  price: {
    value: number;
    currencyCode: string;
  };
  masterVariant: {
    id: number;
    sku?: string;
    images: Array<any>;
    prices: Array<any>;
  };
}