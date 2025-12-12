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

export async function searchProducts(searchTerm: string, locale = "en") {
  try {
    const response = await apiRoot
      .productProjections()
      .search()
      .get({
        queryArgs: {
          fuzzy: true,
          [`name.${locale}`]: `${searchTerm}*`,
          limit: 20,
        },
      })
      .execute();

    return response.body.results;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Error searching products: ${errorMessage}`);
  }
}
