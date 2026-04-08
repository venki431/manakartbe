import swaggerJsdoc from "swagger-jsdoc";
import orderSchemas from "../docs/schemas/order.schema.js";
import productSchemas from "../docs/schemas/product.schema.js";
import userSchemas from "../docs/schemas/user.schema.js";
import addressSchemas from "../docs/schemas/address.schema.js";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Manakart API",
            version: "1.0.0",
            description: "API documentation for Manakart backend",
        },
        servers: [
            {
                url: "http://localhost:3000",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
            schemas: {
                ...productSchemas,
                ...orderSchemas,
                ...userSchemas,
                ...addressSchemas,
            }
        },

        security: [
            {
                bearerAuth: [],
            },
        ],
    },

    apis: [
        "./routes/*.js",
        "./docs/*.js",
        "./docs/**/*.js",
    ],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;