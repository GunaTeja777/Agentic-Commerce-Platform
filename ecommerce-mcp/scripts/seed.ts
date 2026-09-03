import { prisma } from "../lib/db";

async function main() {
  const electronics = await prisma.category.upsert({
    where: { slug: "electronics" },
    update: {},
    create: { name: "Electronics", slug: "electronics" },
  });
  const apparel = await prisma.category.upsert({
    where: { slug: "apparel" },
    update: {},
    create: { name: "Apparel", slug: "apparel" },
  });

  const products = [
    { name: "Wireless Headphones", description: "Over-ear ANC headphones, 30h battery.", price: 349900, categoryId: electronics.id, qty: 25 },
    { name: "Mechanical Keyboard", description: "Hot-swappable 75% keyboard.", price: 599900, categoryId: electronics.id, qty: 15 },
    { name: "USB-C Charger 65W", description: "GaN fast charger, compact.", price: 149900, categoryId: electronics.id, qty: 50 },
    { name: "Cotton T-Shirt", description: "100% organic cotton, unisex fit.", price: 79900, categoryId: apparel.id, qty: 100 },
    { name: "Denim Jacket", description: "Classic fit denim jacket.", price: 249900, categoryId: apparel.id, qty: 30 },
  ];

  for (const p of products) {
    const product = await prisma.product.create({
      data: { name: p.name, description: p.description, price: p.price, categoryId: p.categoryId },
    });
    await prisma.inventory.create({ data: { productId: product.id, quantity: p.qty } });
  }

  console.log(`Seeded ${products.length} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
