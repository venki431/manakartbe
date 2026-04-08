const addressSchemas = {
    Address: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        user_id: { type: "string", format: "uuid" },
        house: { type: "string" },
        street: { type: "string" },
        area: { type: "string" },
        landmark: { type: "string", nullable: true },
        pincode: { type: "string" },
        is_default: { type: "boolean", example: true },
        created_at: { type: "string", format: "date-time" }
      }
    },
  
    CreateAddress: {
      type: "object",
      required: ["house", "street", "area"],
      properties: {
        house: { type: "string" },
        street: { type: "string" },
        area: { type: "string" },
        landmark: { type: "string" },
        pincode: { type: "string" },
        is_default: { type: "boolean" }
      }
    }
  };
  
  export default addressSchemas;