const productSchemas = {
  Product: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      price_per_kg: { type: "integer", example: 120 },
      available: { type: "boolean" },
      created_at: { type: "string", format: "date-time" }
    }
  },

  CreateProduct: {
    type: "object",
    required: ["name", "price_per_kg"],
    properties: {
      name: { type: "string" },
      price_per_kg: { type: "integer" },
      available: { type: "boolean" }
    }
  }
};

export default productSchemas;