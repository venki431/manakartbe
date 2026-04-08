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

const getAllOrders = async (req, res, next) => {
  try {
    const result = await orderService.getAllOrders();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export {
  createOrder,
  getMyOrders,
  getAllOrders
};