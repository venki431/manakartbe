import "../config/env.js";
import bcrypt from "bcrypt";
import pkg from "pg";
const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const image = (name) => `/fruits_images/${name.toLowerCase()}.webp`;
const fruitPrices = {
  Banana: 60,
  Apple: 180,
  Mango: 150,
  Orange: 90,
  Pomegranate: 220,
  "Green Grapes": 120,
  Watermelon: 40,
  Papaya: 55,
  Guava: 80,
  Pineapple: 70,
  "Black Grapes": 140,
  "Sweet Lime": 70,
  Muskmelon: 50,
  Pear: 150,
  Sapota: 90,
  Coconut: 45,
  "Custard Apple": 160,
  Strawberry: 300,
};
const weightVariants = (price) => [
  ["weight", 250, "250g", Math.round(price / 4)],
  ["weight", 500, "500g", Math.round(price / 2)],
  ["weight", 1000, "1kg", price],
];
const choppedPrices = {
  Banana: [25, 45],
  Watermelon: [20, 35],
  Pineapple: [30, 55],
  Papaya: [20, 38],
  Muskmelon: [20, 35],
  Apple: [45, 85],
  Orange: [30, 55],
  Mango: [40, 75],
  Guava: [30, 55],
  Pear: [45, 85],
};
async function upsertProduct(client, categoryId, name, variants, sortOrder) {
  const {
    rows: [product],
  } = await client.query(
    `INSERT INTO products (category_id,name,slug,image_url,sort_order) VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (slug) DO UPDATE SET category_id=EXCLUDED.category_id,name=EXCLUDED.name,image_url=EXCLUDED.image_url,sort_order=EXCLUDED.sort_order RETURNING id`,
    [
      categoryId,
      name,
      slugify(name),
      image(name),
      sortOrder,
    ]
  );
  await client.query("DELETE FROM product_variants WHERE product_id=$1", [
    product.id,
  ]);
  for (const [unit_type, unit_quantity, unit_label, price] of variants)
    await client.query(
      "INSERT INTO product_variants (product_id,unit_type,unit_quantity,unit_label,price,sort_order) VALUES ($1,$2,$3,$4,$5,$6)",
      [product.id, unit_type, unit_quantity, unit_label, price, unit_quantity]
    );
}
async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const hash = await bcrypt.hash("cvenki@123", 10);
    await client.query(
      `INSERT INTO users (name,phone,password_hash,role) VALUES ('Admin','9640082321',$1,'admin') ON CONFLICT (phone) DO UPDATE SET role='admin',password_hash=EXCLUDED.password_hash`,
      [hash]
    );
    const categoryIds = {};
    for (const [name, slug, sort_order] of [
      ["Fruits", "fruits", 10],
      ["Freshly Chopped", "freshly-chopped", 20],
      ["Vegetables", "vegetables", 30],
    ]) {
      const {
        rows: [category],
      } = await client.query(
        `INSERT INTO categories (name,slug,sort_order) VALUES ($1,$2,$3) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name,sort_order=EXCLUDED.sort_order RETURNING id`,
        [name, slug, sort_order]
      );
      categoryIds[slug] = category.id;
    }
    let order = 10;
    for (const [name, price] of Object.entries(fruitPrices)) {
      const variants =
        name === "Banana"
          ? [
              ["count", 6, "Half Dozen", 30],
              ["count", 12, "Dozen", 60],
            ]
          : name === "Coconut"
          ? [["count", 1, "1 Piece", 45]]
          : weightVariants(price);
      await upsertProduct(client, categoryIds.fruits, name, variants, order++);
    }
    order = 10;
    for (const [name, [small, large]] of Object.entries(choppedPrices))
      await upsertProduct(
        client,
        categoryIds["freshly-chopped"],
        `Chopped ${name}`,
        [
          ["weight", 250, "250g", small],
          ["weight", 500, "500g", large],
        ],
        order++
      );
    for (const [name, variants, sort] of [
      [
        "Tomato",
        [
          ["weight", 500, "500g", 20],
          ["weight", 1000, "1kg", 40],
        ],
        10,
      ],
      [
        "Potato",
        [
          ["weight", 500, "500g", 18],
          ["weight", 1000, "1kg", 35],
        ],
        20,
      ],
      [
        "Carrot",
        [
          ["weight", 500, "500g", 30],
          ["weight", 1000, "1kg", 55],
        ],
        30,
      ],
      ["Coriander", [["bunch", 1, "1 Bunch", 20]], 40],
    ])
      await upsertProduct(client, categoryIds.vegetables, name, variants, sort);
    await client.query("COMMIT");
    console.log("✅ Catalog seed complete");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
seed().catch((error) => {
  console.error("❌ Seed failed:", error.message);
  process.exit(1);
});
