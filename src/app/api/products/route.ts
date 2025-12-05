
import { NextResponse } from "next/server";
import { apiRoot } from "@/lib/commercetools/client";

export async function GET() {
  try {
   const response = await apiRoot
      .productProjections()
      .search()
      .get({
        queryArgs: {
          limit: 20,
          offset: 0,
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
