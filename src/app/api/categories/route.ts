// app/api/cart/route.ts
import { NextResponse } from "next/server";
import { apiRoot } from "@/lib/commercetools/client";

export async function GET() {
  try {
    // Récupère toutes les catégories via Commercetools
    const response = await apiRoot.categories().get().execute();
    
    // Retourne uniquement le tableau "results"
    return NextResponse.json(response.body.results);
  } catch (error: any) {
    console.error("Categories API Error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
