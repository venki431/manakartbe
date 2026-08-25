import pool from "../config/db.js";

export const requireRider = async (req, res, next) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const result = await pool.query(
      "SELECT role FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    if (result.rows[0].role !== "rider") {
      return res.status(403).json({
        message: "Rider access required",
      });
    }

    next();
  } catch (error) {
    console.error("Rider authorization error:", error);

    return res.status(500).json({
      message: "Authorization check failed",
    });
  }
};