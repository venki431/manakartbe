import orderService from "../services/order.service.js";

/* ---------------- CREATE ORDER ---------------- */
const createOrder = async (req, res, next) => {
  try {
    const userId = req.user.userId; // extracted from JWT middleware

    const result = await orderService.createOrder(
      userId,
      req.body
    );

    res.status(201).json({
      message: "Order placed successfully",
      order: result
    });

  } catch (error) {
    next(error);
  }
};

/* ---------------- GET MY ORDERS ---------------- */
const getMyOrders = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const result = await orderService.getMyOrders(userId);

    res.status(200).json(result);

  } catch (error) {
    next(error);
  }
};

/* ---------------- GET ALL ORDERS (ADMIN) ---------------- */
const getAllOrders = async (req, res, next) => {
  try {
    const result = await orderService.getAllOrders();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/* ---------------- GET ORDER BY ID (ADMIN) ---------------- */
const getOrderById = async (req, res, next) => {
  try {
    const result = await orderService.getOrderById(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/* ---------------- UPDATE ORDER STATUS (ADMIN) ---------------- */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, admin_note } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const result = await orderService.updateOrderStatus(
      req.params.id,
      status,
      admin_note
    );

    res.status(200).json({
      message: `Order status updated to ${status}`,
      order: result,
    });

  } catch (error) {
    next(error);
  }
};

export {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus
};
