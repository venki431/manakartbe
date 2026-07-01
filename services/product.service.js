import pool from '../config/db.js'

const getAllProducts = async () => {
  const result = await pool.query(
    // Popular fruits first (low sort_order), newest within the same rank.
    'SELECT id, name, price_per_kg, available, sort_order FROM products ORDER BY sort_order ASC, created_at DESC'
  );
  return result.rows;
};

const createProduct = async ({ name, price_per_kg, pricePerKg, available }) => {
  // Accept either key style; frontend sends `price_per_kg`.
  const price = price_per_kg ?? pricePerKg;

  if (!name || price === undefined || price === null) {
    throw new Error('Missing required fields');
  }

  const result = await pool.query(
    `INSERT INTO products (name, price_per_kg, available)
     VALUES ($1, $2, $3)
     RETURNING id, name, price_per_kg, available`,
    [name, price, available ?? true]
  );

  return result.rows[0];
};

const updateProduct = async (id, { name, price_per_kg, pricePerKg, available }) => {
  // Accept either key style; frontend sends `price_per_kg`.
  const price = price_per_kg ?? pricePerKg;

  // Partial update: only overwrite columns that were actually provided,
  // so an omitted field never nulls an existing value (price_per_kg is NOT NULL).
  const result = await pool.query(
    `UPDATE products
     SET name         = COALESCE($1, name),
         price_per_kg = COALESCE($2, price_per_kg),
         available    = COALESCE($3, available)
     WHERE id = $4
     RETURNING id, name, price_per_kg, available`,
    [name ?? null, price ?? null, available ?? null, id]
  );

  if (result.rows.length === 0) {
    throw new Error('Fruit not found');
  }

  return result.rows[0];
};

const deleteProduct = async (id) => {
  const result = await pool.query(
    `DELETE FROM products WHERE id = $1 RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error('Product not found');
  }

  return true;
};

export default {
    getAllProducts,
    createProduct,  
    updateProduct,
    deleteProduct
}