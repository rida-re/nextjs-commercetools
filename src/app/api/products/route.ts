
import { NextResponse } from "next/server";
import { apiRoot } from "@/lib/commercetools/client";

export async function GET(params?: {
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

  return NextResponse.json(response.body.results);
  } catch (error: any) {
    console.error("Categories API Error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
