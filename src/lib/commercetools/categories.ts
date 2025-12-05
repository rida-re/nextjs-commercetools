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
    console.log("Fetching category by slug:", slug);

    const response = await apiRoot
      .categories()
      .get({
        queryArgs: {
          where: `slug(${locale}="${slug}")`,
          limit: 1,
        },
      })
      .execute();

    console.log("Category result:", response.body.results);

    return response.body.results[0] || null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Error fetching category: ${errorMessage}`);
  }
}
