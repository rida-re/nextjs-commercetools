import { apiRoot } from './client';

export async function getCategories() {
  try {
    const response = await apiRoot.categories().get().execute();
    return response.body.results;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Error fetching categories: ${errorMessage}`);
  }
}

export async function getCategoryBySlug(slug: string, locale: string = "en-GB") {
  try {
    const response = await apiRoot
      .categories()
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Error fetching category: ${errorMessage}`);
  }
}