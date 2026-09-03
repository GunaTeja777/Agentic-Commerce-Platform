import { prisma } from "./db";

export type ProductDTO = {
  id: string;
  name: string;
  description: string;
  price: number; // paise
  currency: string;
  imageUrl: string | null;
  category: string;
  inStock: boolean;
  quantityAvailable: number;
};

function toDTO(p: any): ProductDTO {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    currency: p.currency,
    imageUrl: p.imageUrl,
    category: p.category?.name ?? "",
    inStock: (p.inventory?.quantity ?? 0) > 0,
    quantityAvailable: p.inventory?.quantity ?? 0,
  };
}

const includeRelations = { category: true, inventory: true };

/** Full-text-ish search across name & description */
export async function searchProducts(query: string, limit = 20): Promise<ProductDTO[]> {
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    include: includeRelations,
    take: limit,
  });
  return products.map(toDTO);
}

export async function getProduct(productId: string): Promise<ProductDTO | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: includeRelations,
  });
  return product ? toDTO(product) : null;
}

export async function getProductsByCategory(category: string, limit = 50): Promise<ProductDTO[]> {
  const products = await prisma.product.findMany({
    where: {
      category: { OR: [{ slug: category }, { name: { equals: category, mode: "insensitive" } }] },
    },
    include: includeRelations,
    take: limit,
  });
  return products.map(toDTO);
}

export async function checkInventory(productId: string): Promise<{ productId: string; quantityAvailable: number; inStock: boolean } | null> {
  const inv = await prisma.inventory.findUnique({ where: { productId } });
  if (!inv) return null;
  return { productId, quantityAvailable: inv.quantity, inStock: inv.quantity > 0 };
}
