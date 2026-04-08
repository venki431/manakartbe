import pool from "../config/db.js";
import notificationService from "./notification.service.js";

const MIN_ORDER_VALUE = process.env.MIN_ORDER_VALUE || 350;
const DELIVERY_CHARGE = process.env.DELIVERY_CHARGE || 50;
const FREE_DELIVERY_MIN = process.env.FREE_DELIVERY_MIN || 500;

const ALLOWED_PINCODES = ["500097"];

const VALID_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

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

    const order = orderResult.rows[0];

    /* ---------------- NOTIFY ADMIN ---------------- */
    const itemNames = items.map(i => i.name).join(", ");
    await notificationService.create({
      type: "new_order",
      title: "New Order Received",
      message: `Order #${order.id.slice(0, 8)} - ₹${grandTotal} (${items.length} items: ${itemNames})`,
      order_id: order.id,
      user_id: null, // admin notification
    });

    /* ---------------- NOTIFY CUSTOMER ---------------- */
    await notificationService.create({
      type: "order_placed",
      title: "Order Placed",
      message: `Your order #${order.id.slice(0, 8)} worth ₹${grandTotal} has been placed. We'll notify you once it's confirmed.`,
      order_id: order.id,
      user_id: userId, // customer notification
    });

    return order;
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
      `SELECT o.*, u.name as customer_name, u.phone as customer_phone,
              a.house, a.street, a.area, a.pincode as addr_pincode, a.landmark
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN addresses a ON o.address_id = a.id
       ORDER BY o.created_at DESC`
    );

    return result.rows;
  },

  async getOrderById(orderId) {
    const result = await pool.query(
      `SELECT o.*, u.name as customer_name, u.phone as customer_phone,
              a.house, a.street, a.area, a.pincode as addr_pincode, a.landmark
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN addresses a ON o.address_id = a.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (result.rows.length === 0) {
      throw new Error("Order not found");
    }

    return result.rows[0];
  },

  async updateOrderStatus(orderId, status, admin_note = null) {
    if (!VALID_STATUSES.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
    }

    const existing = await pool.query(
      "SELECT * FROM orders WHERE id = $1",
      [orderId]
    );

    if (existing.rows.length === 0) {
      throw new Error("Order not found");
    }

    const currentStatus = existing.rows[0].status;

    // Prevent updating already delivered/cancelled orders
    if (currentStatus === "delivered" || currentStatus === "cancelled") {
      throw new Error(`Cannot update order that is already ${currentStatus}`);
    }

    const result = await pool.query(
      `UPDATE orders SET status = $1, admin_note = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, admin_note, orderId]
    );

    const order = result.rows[0];

    // Admin notification for status changes
    const adminNotifTitles = {
      confirmed: "Order Confirmed",
      shipped: "Order Shipped",
      delivered: "Order Delivered",
      cancelled: "Order Cancelled",
    };

    if (adminNotifTitles[status]) {
      await notificationService.create({
        type: `order_${status}`,
        title: adminNotifTitles[status],
        message: `Order #${orderId.slice(0, 8)} has been ${status}${admin_note ? ` - ${admin_note}` : ""}`,
        order_id: orderId,
        user_id: null, // admin notification
      });
    }

    // Customer notification for status changes
    const customerMessages = {
      confirmed: "Your order has been confirmed and is being prepared!",
      shipped: "Your order is on the way! It will arrive shortly.",
      delivered: "Your order has been delivered. Enjoy your fresh fruits!",
      cancelled: `Your order has been cancelled.${admin_note ? ` Reason: ${admin_note}` : ""}`,
    };

    if (customerMessages[status]) {
      await notificationService.create({
        type: `order_${status}`,
        title: adminNotifTitles[status],
        message: customerMessages[status],
        order_id: orderId,
        user_id: order.user_id, // customer notification
      });
    }

    return order;
  },

};

export default orderService;
