import pool from '../config/db.js'

const getAllProducts = async () => {
  const result = await pool.query(
    'SELECT id, name, price_per_kg, available FROM products ORDER BY created_at DESC'
  );
  return result.rows;
};

const createProduct = async ({ name, pricePerKg, available }) => {
  if (!name || pricePerKg === undefined) {
    throw new Error('Missing required fields');
  }

  const result = await pool.query(
    `INSERT INTO products (name, price_per_kg, available)
     VALUES ($1, $2, $3)
     RETURNING id, name, price_per_kg, available`,
    [name, pricePerKg, available ?? true]
  );

  return result.rows[0];
};

const updateProduct = async (id, { name, pricePerKg, available }) => {
  const result = await pool.query(
    `UPDATE products
     SET name = $1, price_per_kg = $2, available = $3
     WHERE id = $4
     RETURNING id, name, price_per_kg, available`,
    [name, pricePerKg, available ?? true, id]
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