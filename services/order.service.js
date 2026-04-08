import pool from "../config/db.js";

const MIN_ORDER_VALUE = process.env.MIN_ORDER_VALUE || 350;
const DELIVERY_CHARGE = process.env.DELIVERY_CHARGE || 50;
const FREE_DELIVERY_MIN = process.env.FREE_DELIVERY_MIN || 500;

const ALLOWED_PINCODES = ["500097"];

const orderService = {

  async createOrder(userId, data) {
    const { items, address_id = null } = data;
    const pincodeData = await pool.query(
      "SELECT pincode FROM addresses WHERE id = $1 AND user_id = $2",
      [address_id, userId]
    );

    const pincode = pincodeData.rows[0]?.pincode;

    /* ---------------- VALIDATIONS ---------------- */

    if (!userId) {
      throw new Error("Unauthorized user");
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("Cart is empty");
    }

    if (!ALLOWED_PINCODES.includes(pincode)) {
      throw new Error("Service not available in this area");
    }

    /* ---------------- OPTIMIZED PRODUCT FETCH ---------------- */

    const productIds = items.map(item => item.id);

    const productsResult = await pool.query(
      "SELECT id, price_per_kg FROM products WHERE id = ANY($1)",
      [productIds]
    );

    const products = productsResult.rows;

    if (products.length !== productIds.length) {
      throw new Error("Some products are invalid");
    }

    /* ---------------- CALCULATE SUBTOTAL ---------------- */

    let subtotal = 0;

    for (const item of items) {
      const product = products.find(p => p.id === item.id);

      const unitPrice =
        (product.price_per_kg * item.unitGrams) / 1000;

      subtotal += Math.round(unitPrice) * item.quantity;
    }

    /* ---------------- BUSINESS RULES ---------------- */

    if (subtotal < MIN_ORDER_VALUE) {
      throw new Error(`Minimum order value is ₹${MIN_ORDER_VALUE}`);
    }

    const deliveryCharge =
      subtotal >= FREE_DELIVERY_MIN ? 0 : DELIVERY_CHARGE;

    const grandTotal = subtotal + deliveryCharge;

    /* ---------------- INSERT ORDER ---------------- */

    const orderResult = await pool.query(
      `
      INSERT INTO orders
      (user_id, address_id, items, subtotal, delivery_charge, grand_total, pincode, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        userId,
        address_id,
        JSON.stringify(items),
        subtotal,
        deliveryCharge,
        grandTotal,
        pincode,
        "pending"
      ]
    );

    return orderResult.rows[0];
  },

  async getMyOrders(userId) {
    const result = await pool.query(
      "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );

    return result.rows;
  },

  async getAllOrders() {
    const result = await pool.query(
      "SELECT * FROM orders ORDER BY created_at DESC"
    );

    return result.rows;
  }

};

export default orderService;