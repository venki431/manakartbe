// ============================================================================
// Manakart Backend — One-Command DB Setup
// ----------------------------------------------------------------------------
// Applies the full schema AND inserts seed data in a single run.
// Uses the DATABASE_URL already configured in your .env.
//
//   node migrations/setup.js
//
// Safe to re-run: schema uses IF NOT EXISTS, seed upserts users and skips
// products/address that already exist.
// ============================================================================

import '../config/env.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'pg';

const { Pool } = pkg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    // ---- 1. SCHEMA -------------------------------------------------------
    console.log('→ Applying schema (000_full_schema.sql)...');
    const schema = readFileSync(join(__dirname, '000_full_schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('  ✅ Schema applied');

    // ---- 2. SEED ---------------------------------------------------------
    console.log('→ Seeding data...');
    await import('./seed.js');
  } catch (err) {
    console.error('\n❌ Setup failed:', err.message);
    await pool.end();
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
