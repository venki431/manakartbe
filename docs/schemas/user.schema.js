const userSchemas = {
    User: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string" },
        phone: { type: "string" },
        created_at: { type: "string", format: "date-time" }
      }
    },
  
    RegisterUser: {
      type: "object",
      required: ["name", "phone", "password"],
      properties: {
        name: { type: "string" },
        phone: { type: "string" },
        password: { type: "string" }
      }
    }
  };
  
  export default userSchemas;