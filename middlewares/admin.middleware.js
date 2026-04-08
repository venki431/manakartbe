import pool from "../config/db.js";

export const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = await pool.query(
      "SELECT role FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0 || result.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: "Authorization check failed" });
  }
};
