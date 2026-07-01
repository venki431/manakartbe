// ============================================================================
// Manakart Backend — Seed Script
// ----------------------------------------------------------------------------
// Populates a fresh database with sample data so you can test immediately:
//   - 1 admin user   (phone 9999999999 / password admin123)
//   - 1 customer user (phone 8888888888 / password customer123)
//   - 1 serviceable address for the customer (pincode 500097)
//   - a handful of fruit products
//
// Run AFTER 000_full_schema.sql:
//   node migrations/seed.js
//
// Idempotent-ish: users are upserted by phone; products are only inserted
// if the products table is empty (re-running won't duplicate them).
// ============================================================================

import '../config/env.js';
import bcrypt from 'bcrypt';
import pkg from 'pg';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Only pincode(s) the app services — see ALLOWED_PINCODES in order.service.js
const SERVICEABLE_PINCODE = '500097';

const USERS = [
  { name: 'Admin',     phone: '9999999999', password: 'admin123',    role: 'admin' },
  { name: 'Test Customer', phone: '8888888888', password: 'customer123', role: 'customer' },
];

// Common fruits available in Indian markets, with realistic ₹/kg rates.
// Ordered by popularity — most-bought everyday fruits first, seasonal/exotic
// last. The list index becomes each product's sort_order, so the shop shows
// popular fruits first (see product.service.js ORDER BY sort_order).
// Names are chosen to match the FRUIT_EMOJIS map on the frontend.
const PRODUCTS = [
  // ── Everyday best-sellers ──
  { name: 'Banana',        price_per_kg: 60,  available: true },
  { name: 'Apple',         price_per_kg: 180, available: true },
  { name: 'Mango',         price_per_kg: 150, available: true },
  { name: 'Orange',        price_per_kg: 90,  available: true },
  { name: 'Pomegranate',   price_per_kg: 220, available: true },
  { name: 'Green Grapes',  price_per_kg: 120, available: true },
  { name: 'Watermelon',    price_per_kg: 40,  available: true },
  { name: 'Papaya',        price_per_kg: 55,  available: true },
  // ── Popular ──
  { name: 'Guava',         price_per_kg: 80,  available: true },
  { name: 'Pineapple',     price_per_kg: 70,  available: true },
  { name: 'Black Grapes',  price_per_kg: 140, available: true },
  { name: 'Sweet Lime',    price_per_kg: 70,  available: true },
  { name: 'Muskmelon',     price_per_kg: 50,  available: true },
  { name: 'Pear',          price_per_kg: 150, available: true },
  { name: 'Sapota',        price_per_kg: 90,  available: true },
  { name: 'Coconut',       price_per_kg: 45,  available: true },
  // ── Seasonal / exotic ──
  { name: 'Custard Apple', price_per_kg: 160, available: true },
  { name: 'Litchi',        price_per_kg: 180, available: true },
  { name: 'Jamun',         price_per_kg: 200, available: true },
  { name: 'Strawberry',    price_per_kg: 300, available: true },
  { name: 'Kiwi',          price_per_kg: 260, available: true },
  { name: 'Dragon Fruit',  price_per_kg: 280, available: true },
  { name: 'Amla',          price_per_kg: 70,  available: true },
  { name: 'Fig',           price_per_kg: 240, available: false },
];

async function seedUsers() {
  const result = {};
  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    // Upsert by phone: keeps the script re-runnable without duplicate errors.
    const res = await pool.query(
      `INSERT INTO users (name, phone, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (phone) DO UPDATE
         SET name = EXCLUDED.name,
             password_hash = EXCLUDED.password_hash,
             role = EXCLUDED.role
       RETURNING id, name, phone, role`,
      [u.name, u.phone, hash, u.role]
    );
    result[u.role] = res.rows[0];
    console.log(`  user: ${res.rows[0].name} (${res.rows[0].phone}) [${res.rows[0].role}]`);
  }
  return result;
}

async function seedAddress(customer) {
  if (!customer) return;
  // Only add a default address if the customer has none yet.
  const existing = await pool.query(
    'SELECT id FROM addresses WHERE user_id = $1 LIMIT 1',
    [customer.id]
  );
  if (existing.rows.length > 0) {
    console.log('  address: already present, skipping');
    return;
  }
  const res = await pool.query(
    `INSERT INTO addresses (user_id, house, street, area, pincode, landmark, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [customer.id, '12-3-45', 'MG Road', 'Kukatpally', SERVICEABLE_PINCODE, 'Near Metro', true]
  );
  console.log(`  address: created (${SERVICEABLE_PINCODE}) id=${res.rows[0].id}`);
}

async function seedProducts() {
  // Upsert by name so re-running adds new fruits without duplicating existing
  // ones. Price/availability/sort_order are refreshed to the seed values.
  // sort_order = array index, so popular fruits (listed first) load first.
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    await pool.query(
      `INSERT INTO products (name, price_per_kg, available, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (name) DO UPDATE
         SET price_per_kg = EXCLUDED.price_per_kg,
             available    = EXCLUDED.available,
             sort_order   = EXCLUDED.sort_order`,
      [p.name, p.price_per_kg, p.available, i]
    );
  }
  console.log(`  products: upserted ${PRODUCTS.length}`);
}

async function main() {
  console.log('Seeding database...');
  try {
    const users = await seedUsers();
    await seedAddress(users.customer);
    await seedProducts();
    console.log('\n✅ Seed complete.');
    console.log('\nLogin credentials:');
    console.log('  Admin    -> phone 9999999999  password admin123');
    console.log('  Customer -> phone 8888888888  password customer123');
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
