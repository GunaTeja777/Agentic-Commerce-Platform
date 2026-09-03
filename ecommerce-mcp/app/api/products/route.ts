import { NextRequest, NextResponse } from "next/server";
import { searchProducts, getProductsByCategory } from "@/lib/products";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const category = searchParams.get("category");

  try {
    if (category) {
      return NextResponse.json(await getProductsByCategory(category));
    }
    if (q) {
      return NextResponse.json(await searchProducts(q));
    }
    // default: return everything (small catalog use case) via empty-string search
    return NextResponse.json(await searchProducts(""));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
