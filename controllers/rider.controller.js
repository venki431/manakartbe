import pool from "../config/db.js";
import { emitOrderUpdate } from "../services/socket.service.js";

export const getRiderOrders = async (req, res, next) => {
  try {
    const riderId = req.user.userId;

    const result = await pool.query(
      `
      SELECT
        o.id,
        o.items,
        o.subtotal,
        o.delivery_charge,
        o.grand_total,
        o.pincode,
        o.status,
        o.delivery_date,
        o.delivery_slot,
        o.created_at,
        o.updated_at,
        o.assigned_rider_id,

        u.name AS customer_name,
        u.phone AS customer_phone,

        a.house,
        a.street,
        a.area,
        a.pincode AS address_pincode,
        a.landmark,
        a.latitude,
        a.longitude

      FROM orders o

      INNER JOIN users u
        ON o.user_id = u.id

      LEFT JOIN addresses a
        ON o.address_id = a.id

      WHERE
        (
          o.status = 'pending'
          AND o.assigned_rider_id IS NULL
        )
        OR
        (
          o.assigned_rider_id = $1
          AND o.status NOT IN ('delivered', 'cancelled')
        )

      ORDER BY o.created_at ASC
      `,
      [riderId]
    );

    res.status(200).json({
      success: true,
      orders: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const acceptRiderOrder = async (req, res, next) => {
    try {
      const riderId = req.user.userId;
      const orderId = req.params.id;
  
      const result = await pool.query(
        `
        UPDATE orders
        SET
          assigned_rider_id = $1,
          status = 'confirmed',
          updated_at = NOW()
        WHERE
          id = $2
          AND status = 'pending'
          AND assigned_rider_id IS NULL
        RETURNING *
        `,
        [riderId, orderId]
      );
  
      if (result.rows.length === 0) {
        return res.status(409).json({
          message:
            "This order has already been accepted by another rider or is no longer available.",
        });
      }
  
      res.status(200).json({
        success: true,
        message: "Order accepted successfully",
        order: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  };

  export const updateRiderOrderStatus = async (req, res, next) => {
    try {
      const riderId = req.user.userId;
      const orderId = req.params.id;
      const { status } = req.body;
  
      const allowedStatuses = [
        "shipped",
        "delivered",
      ];
  
      if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid rider order status",
        });
      }
  
      const existing = await pool.query(
        `
        SELECT id, status, assigned_rider_id
        FROM orders
        WHERE id = $1
        `,
        [orderId]
      );
  
      if (existing.rows.length === 0) {
        return res.status(404).json({
          message: "Order not found",
        });
      }
  
      const order = existing.rows[0];
  
      if (order.assigned_rider_id !== riderId) {
        return res.status(403).json({
          message: "This order is not assigned to you",
        });
      }
  
      /*
       * Validate status transitions
       */
  
      if (
        status === "shipped" &&
        order.status !== "confirmed"
      ) {
        return res.status(400).json({
          message:
            "Order must be confirmed before starting delivery",
        });
      }
  
      if (
        status === "delivered" &&
        order.status !== "shipped"
      ) {
        return res.status(400).json({
          message:
            "Order must be shipped before marking it delivered",
        });
      }
  
      const result = await pool.query(
        `
        UPDATE orders
        SET
          status = $1,
          updated_at = NOW()
        WHERE id = $2
        RETURNING *
        `,
        [status, orderId]
      );
  
      const updatedOrder = result.rows[0];

      emitOrderUpdate({
        id: updatedOrder.id,
        status: updatedOrder.status,
        assigned_rider_id: updatedOrder.assigned_rider_id,
      });
  
      res.status(200).json({
        success: true,
        message: `Order marked as ${status}`,
        order: updatedOrder,
      });
    } catch (error) {
      next(error);
    }
  };


  export const getRiderHistory = async (req, res, next) => {
    try {
      const riderId = req.user.userId;
  
      const result = await pool.query(
        `
        SELECT
          o.id,
          o.items,
          o.subtotal,
          o.delivery_charge,
          o.grand_total,
          o.pincode,
          o.status,
          o.delivery_date,
          o.delivery_slot,
          o.created_at,
          o.updated_at,
          o.assigned_rider_id,
  
          u.name AS customer_name,
          u.phone AS customer_phone,
  
          a.house,
          a.street,
          a.area,
          a.pincode AS address_pincode,
          a.landmark,
          a.latitude,
          a.longitude
  
        FROM orders o
  
        INNER JOIN users u
          ON o.user_id = u.id
  
        LEFT JOIN addresses a
          ON o.address_id = a.id
  
        WHERE
          o.assigned_rider_id = $1
          AND o.status IN ('delivered', 'cancelled')
  
        ORDER BY o.updated_at DESC
        `,
        [riderId]
      );
  
      res.status(200).json({
        success: true,
        orders: result.rows,
      });
    } catch (error) {
      next(error);
    }
  };