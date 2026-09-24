const orderSchemas = {
  OrderItem: {
    type: "object",
    properties: {
      productId: { type: "string", format: "uuid" },
      variantId: { type: "string", format: "uuid" },
      productName: { type: "string" },
      variantLabel: { type: "string" },
      quantity: { type: "number", example: 2 },
      unitPrice: { type: "integer", example: 120 }
    }
  },

  Order: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      user_id: { type: "string", format: "uuid" },
      address_id: { type: "string", format: "uuid" },
      items: {
        type: "array",
        items: { $ref: "#/components/schemas/OrderItem" }
      },
      subtotal: { type: "integer", example: 240 },
      delivery_charge: { type: "integer", example: 40 },
      grand_total: { type: "integer", example: 280 },
      pincode: { type: "string" },
      status: {
        type: "string",
        enum: ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"],
        example: "PENDING"
      },
      created_at: { type: "string", format: "date-time" }
    }
  },

  CreateOrder: {
    type: "object",
    required: ["items", "address_id"],
    properties: {
      address_id: { type: "string", format: "uuid" },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            productId: { type: "string", format: "uuid" },
            variantId: { type: "string", format: "uuid" },
            quantity: { type: "number" }
          }
        }
      }
    }
  }
};

export default orderSchemas;
