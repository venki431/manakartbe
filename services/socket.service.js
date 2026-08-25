let io = null;

export const initializeSocket = (socketIo) => {
  io = socketIo;

  console.log("🔌 Socket.IO initialized");
};

export const emitNewOrder = (order) => {
  if (!io) {
    console.warn("Socket.IO is not initialized");
    return;
  }

  io.emit("new_order", order);

  console.log("📦 New order event emitted:", order.id);
};

export const emitOrderUpdate = (order) => {
  if (!io) {
    console.warn("Socket.IO is not initialized");
    return;
  }

  io.emit("order_updated", order);

  console.log("📦 Order update event emitted:", order.id);
};