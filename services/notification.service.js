import pool from "../config/db.js";

const notificationService = {
  // user_id = null means admin notification, set = customer notification
  async create({ type, title, message, order_id = null, user_id = null }) {
    const result = await pool.query(
      `INSERT INTO notifications (type, title, message, order_id, user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [type, title, message, order_id, user_id]
    );
    return result.rows[0];
  },

  // Admin: get notifications where user_id IS NULL
  async getAllAdmin({ unread_only = false, limit = 50 }) {
    let query = "SELECT * FROM notifications WHERE user_id IS NULL";
    const params = [];

    if (unread_only) {
      query += " AND is_read = false";
    }

    query += " ORDER BY created_at DESC LIMIT $" + (params.length + 1);
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  },

  async getAdminUnreadCount() {
    const result = await pool.query(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id IS NULL AND is_read = false"
    );
    return parseInt(result.rows[0].count, 10);
  },

  // Customer: get notifications for a specific user
  async getAllForUser(userId, { unread_only = false, limit = 50 } = {}) {
    let query = "SELECT * FROM notifications WHERE user_id = $1";
    const params = [userId];

    if (unread_only) {
      query += " AND is_read = false";
    }

    query += " ORDER BY created_at DESC LIMIT $" + (params.length + 1);
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  },

  async getUserUnreadCount(userId) {
    const result = await pool.query(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false",
      [userId]
    );
    return parseInt(result.rows[0].count, 10);
  },

  async markAsRead(id) {
    await pool.query(
      "UPDATE notifications SET is_read = true WHERE id = $1",
      [id]
    );
  },

  async markMyAsRead(userId, notificationId) {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = true
       WHERE id = $1
         AND user_id = $2`,
      [notificationId, userId]
    );
  
    if (result.rowCount === 0) {
      throw new Error("Notification not found");
    }
  },

  async markAllAsReadAdmin() {
    await pool.query("UPDATE notifications SET is_read = true WHERE user_id IS NULL AND is_read = false");
  },

  async markAllAsReadForUser(userId) {
    await pool.query("UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false", [userId]);
  },
};

export default notificationService;
