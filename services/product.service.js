import pool from '../config/db.js';

const UNIT_TYPES = new Set(['weight', 'count', 'bunch', 'packet', 'volume']);
const slugify = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const fail = (message) => { throw new Error(message); };

function validateVariants(variants) {
  if (!Array.isArray(variants) || variants.length === 0) fail('At least one valid variant is required');
  const seen = new Set();
  return variants.map((variant, index) => {
    const unit_type = String(variant.unit_type || '');
    const unit_quantity = Number(variant.unit_quantity);
    const unit_label = String(variant.unit_label || '').trim();
    const price = Number(variant.price);
    if (!UNIT_TYPES.has(unit_type)) fail(`Variant ${index + 1}: invalid unit type`);
    if (!Number.isFinite(unit_quantity) || unit_quantity <= 0) fail(`Variant ${index + 1}: unit quantity must be greater than zero`);
    if (!unit_label) fail(`Variant ${index + 1}: unit label is required`);
    if (!Number.isInteger(price) || price < 0) fail(`Variant ${index + 1}: price must be a non-negative integer`);
    const key = `${unit_type}:${unit_quantity}`;
    if (seen.has(key)) fail('Duplicate product variant');
    seen.add(key);
    return { unit_type, unit_quantity, unit_label, price, available: variant.available !== false, sort_order: Number(variant.sort_order) || 100 };
  });
}

async function getAllProducts() {
  const { rows } = await pool.query(`SELECT p.id, p.category_id, p.name, p.slug, p.description, p.image_url, p.available, p.sort_order,
    jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug) category,
    COALESCE(jsonb_agg(jsonb_build_object('id', v.id, 'product_id', v.product_id, 'unit_type', v.unit_type, 'unit_quantity', v.unit_quantity, 'unit_label', v.unit_label, 'price', v.price, 'available', v.available, 'sort_order', v.sort_order) ORDER BY v.sort_order, v.unit_quantity) FILTER (WHERE v.id IS NOT NULL), '[]') variants
    FROM products p JOIN categories c ON c.id=p.category_id LEFT JOIN product_variants v ON v.product_id=p.id
    GROUP BY p.id, c.id ORDER BY c.sort_order, p.sort_order, p.name`);
  return rows;
}
async function getCategories() {
  const { rows } = await pool.query('SELECT id, name, slug, description, image_url, available, sort_order FROM categories ORDER BY sort_order, name');
  return rows;
}
async function saveProduct(data, id = null) {
  const name = String(data.name || '').trim();
  const category_id = data.category_id;
  if (!name) fail('Product name is required');
  if (!category_id) fail('Category is required');
  const variants = validateVariants(data.variants);
  const category = await pool.query('SELECT id FROM categories WHERE id=$1', [category_id]);
  if (!category.rowCount) fail('Category not found');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const slug = data.slug ? slugify(data.slug) : `${slugify(name)}${id ? '' : `-${Date.now()}`}`;
    const query = id
      ? `UPDATE products SET category_id=$1,name=$2,slug=$3,description=$4,image_url=$5,available=$6,sort_order=$7,updated_at=NOW() WHERE id=$8 RETURNING id`
      : `INSERT INTO products (category_id,name,slug,description,image_url,available,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`;
    const args = [category_id, name, slug, data.description?.trim() || null, data.image_url?.trim() || null, data.available !== false, Number(data.sort_order) || 100];
    if (id) args.push(id);
    const result = await client.query(query, args);
    if (!result.rowCount) fail('Product not found');
    const productId = result.rows[0].id;
    if (id) await client.query('DELETE FROM product_variants WHERE product_id=$1', [productId]);
    for (const v of variants) await client.query(`INSERT INTO product_variants (product_id,unit_type,unit_quantity,unit_label,price,available,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [productId, v.unit_type, v.unit_quantity, v.unit_label, v.price, v.available, v.sort_order]);
    await client.query('COMMIT');
    return (await getAllProducts()).find((product) => product.id === productId);
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
async function deleteProduct(id) { const { rowCount } = await pool.query('DELETE FROM products WHERE id=$1', [id]); if (!rowCount) fail('Product not found'); }
export default { getAllProducts, getCategories, createProduct: (data) => saveProduct(data), updateProduct: (id, data) => saveProduct(data, id), deleteProduct };

