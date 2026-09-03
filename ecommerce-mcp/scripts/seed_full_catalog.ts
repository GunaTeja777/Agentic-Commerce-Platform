import fs from "fs";
import path from "path";
import { prisma } from "../lib/db";

// Image mapping helper based on category and product keywords
function getCuratedImage(category: string, name: string, subcategory: string): string {
  const n = name.toLowerCase();
  const sub = subcategory.toLowerCase();

  if (category.toLowerCase() === "laptops") {
    if (n.includes("air") || n.includes("slim") || n.includes("nano")) {
      return "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=700&auto=format&fit=crop&q=80";
    }
    if (n.includes("creator") || n.includes("studio") || n.includes("pro 16")) {
      return "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=700&auto=format&fit=crop&q=80";
    }
    if (n.includes("workstation") || n.includes("titan")) {
      return "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=700&auto=format&fit=crop&q=80";
    }
    return "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=700&auto=format&fit=crop&q=80";
  }

  if (category.toLowerCase() === "monitors") {
    if (n.includes("curved") || n.includes("ultra")) {
      return "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=700&auto=format&fit=crop&q=80";
    }
    return "https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=700&auto=format&fit=crop&q=80";
  }

  if (category.toLowerCase() === "audio") {
    if (n.includes("earbuds") || n.includes("buds")) {
      return "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=700&auto=format&fit=crop&q=80";
    }
    if (n.includes("speaker")) {
      return "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=700&auto=format&fit=crop&q=80";
    }
    return "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&auto=format&fit=crop&q=80";
  }

  if (category.toLowerCase() === "gaming") {
    if (n.includes("mouse")) {
      return "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=700&auto=format&fit=crop&q=80";
    }
    if (n.includes("keyboard")) {
      return "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=700&auto=format&fit=crop&q=80";
    }
    if (n.includes("headset")) {
      return "https://images.unsplash.com/photo-1599669454699-248893623440?w=700&auto=format&fit=crop&q=80";
    }
    return "https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=700&auto=format&fit=crop&q=80";
  }

  if (category.toLowerCase() === "mobile") {
    if (n.includes("watch") || n.includes("band")) {
      return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&auto=format&fit=crop&q=80";
    }
    return "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=700&auto=format&fit=crop&q=80";
  }

  if (category.toLowerCase() === "accessories" || category.toLowerCase() === "office") {
    if (n.includes("mouse") || sub.includes("mouse")) {
      return "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=700&auto=format&fit=crop&q=80";
    }
    if (n.includes("keyboard")) {
      return "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=700&auto=format&fit=crop&q=80";
    }
    if (n.includes("bag") || n.includes("backpack") || n.includes("sleeve")) {
      return "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=700&auto=format&fit=crop&q=80";
    }
    if (n.includes("stand")) {
      return "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=700&auto=format&fit=crop&q=80";
    }
    if (n.includes("charger") || n.includes("power")) {
      return "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=700&auto=format&fit=crop&q=80";
    }
    if (n.includes("hub") || n.includes("dock")) {
      return "https://images.unsplash.com/photo-1625842268584-8f3296236761?w=700&auto=format&fit=crop&q=80";
    }
    if (n.includes("webcam")) {
      return "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=700&auto=format&fit=crop&q=80";
    }
    return "https://images.unsplash.com/photo-1588508065123-287b28e013da?w=700&auto=format&fit=crop&q=80";
  }

  return "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=700&auto=format&fit=crop&q=80";
}

// Simple RFC-compliant CSV line parser
function parseCSV(content: string) {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === "\n" && !inQuotes) {
      lines.push(current.replace(/\r$/, ""));
      current = "";
    } else {
      current += char;
    }
  }
  if (current) lines.push(current.replace(/\r$/, ""));

  const header = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const obj: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) {
      obj[header[j]] = values[j] !== undefined ? values[j] : "";
    }
    rows.push(obj);
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

async function main() {
  const csvPath = path.resolve(__dirname, "../../backend/products.csv");
  if (!fs.existsSync(csvPath)) {
    console.error("CSV file not found at:", csvPath);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, "utf-8");
  const rows = parseCSV(fileContent);
  console.log(`Parsed ${rows.length} products from products.csv.`);

  // Clear existing items to reseed clean catalog
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});

  // Collect and create unique Categories
  const categoryMap = new Map<string, string>();
  for (const row of rows) {
    const rawCat = (row["category"] || "General").trim();
    if (!categoryMap.has(rawCat)) {
      const slug = rawCat.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const cat = await prisma.category.upsert({
        where: { slug },
        update: { name: rawCat },
        create: { name: rawCat, slug },
      });
      categoryMap.set(rawCat, cat.id);
    }
  }
  console.log(`Created ${categoryMap.size} categories.`);

  let insertedCount = 0;
  for (const row of rows) {
    const name = row["product_name"]?.trim();
    if (!name) continue;

    const catName = (row["category"] || "General").trim();
    const categoryId = categoryMap.get(catName)!;
    const subcategory = (row["subcategory"] || "").trim();
    const description = (row["description"] || "").trim();
    const priceInr = parseFloat(row["price_inr"]) || 999;
    const pricePaise = Math.round(priceInr * 100);
    const stockQuantity = parseInt(row["stock_quantity"], 10) || 10;
    const imageUrl = getCuratedImage(catName, name, subcategory);

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: pricePaise,
        currency: "INR",
        imageUrl,
        categoryId,
      },
    });

    await prisma.inventory.create({
      data: {
        productId: product.id,
        quantity: stockQuantity,
      },
    });

    insertedCount++;
  }

  console.log(`Successfully seeded ${insertedCount} products with complete inventories & high-res images!`);
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
