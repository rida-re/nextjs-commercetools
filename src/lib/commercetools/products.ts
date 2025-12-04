import { apiRoot } from './client';
import type { Product, ProductProjection } from '@commercetools/platform-sdk';

export async function getProducts(params?: {
  limit?: number;
  offset?: number;
  filter?: string[];
  sort?: string[];
}) {
  try {
    const response = await apiRoot
      .productProjections()
      .search()
      .get({
        queryArgs: {
          limit: params?.limit || 20,
          offset: params?.offset || 0,
          filter: params?.filter,
          sort: params?.sort,
        },
      })
      .execute();

    return response.body.results;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Error fetching products: ${errorMessage}`);
  }
}

export async function getProductBySlug(
  slug: string,
  locale: string = "en-GB"
) {
  try {
    const response = await apiRoot
      .productProjections()
      .search()
      .get({
        queryArgs: {
          // MUST use filter.query for exact slug match
          "filter.query": [`slug.${locale}:"${slug}"`],

          // ensure language projection matches your data
          localeProjection: [locale],

          limit: 1,
          staged: false,
        },
      })
      .execute();

    return response.body.results[0] || null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Error fetching product: ${errorMessage}`);
  }
}

export async function searchProducts(
  searchTerm: string,
  locale: string = "en",
  fuzzy: boolean = true
) {
  try {
    const response = await apiRoot
      .productProjections()
      .search()
      .get({
        queryArgs: {
          [`text.${locale}`]: searchTerm,   // must include locale
          fuzzy: fuzzy,                     // enable fuzzy search
          markMatchingVariants: true,       // useful for PLP
          limit: 20,
          localeProjection: [locale],       // ensure correct localized fields
          staged: false,
        },
      })
      .execute();

    return response.body;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Error searching products: ${errorMessage}`);
  }
}