import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

import { initializeSocket } from "./services/socket.service.js";

import productRoutes from "./routes/product.routes.js";
import orderRoutes from "./routes/order.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import riderRoutes from "./routes/rider.routes.js";

import errorHandler from "./middlewares/error.middleware.js";

import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";

const app = express();

/**
 * ==========================================
 * CORS CONFIGURATION
 * ==========================================
 *
 * Render environment variable:
 *
 * ALLOWED_ORIGINS=http://localhost:3000,https://manakart.pages.dev
 *
 */

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

console.log("🌐 Allowed CORS origins:", allowedOrigins);

/**
 * ==========================================
 * EXPRESS CORS
 * ==========================================
 */

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // such as Postman/server-to-server requests.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn("🚫 CORS blocked origin:", origin);

      return callback(
        new Error(`CORS blocked for origin: ${origin}`)
      );
    },

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    credentials: true,
  })
);

/**
 * ==========================================
 * BODY PARSER
 * ==========================================
 */

app.use(express.json());

/**
 * ==========================================
 * HTTP SERVER
 * ==========================================
 */

const httpServer = createServer(app);

/**
 * ==========================================
 * SOCKET.IO
 * ==========================================
 */

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests without Origin
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn("🚫 Socket.IO CORS blocked origin:", origin);

      return callback(
        new Error(`Socket.IO CORS blocked for origin: ${origin}`)
      );
    },

    methods: ["GET", "POST"],

    credentials: true,
  },

  transports: ["websocket", "polling"],
});

/**
 * Initialize application-specific socket handlers
 */
initializeSocket(io);

/**
 * Socket connection logging
 */
io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  socket.on("disconnect", (reason) => {
    console.log(
      "🔌 Socket disconnected:",
      socket.id,
      "Reason:",
      reason
    );
  });
});

/**
 * Make Socket.IO available inside Express controllers
 */
app.set("io", io);

/**
 * ==========================================
 * SWAGGER
 * ==========================================
 */

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

/**
 * ==========================================
 * HEALTH CHECK
 * ==========================================
 */

app.get("/", (req, res) => {
  res.status(200).send("Manakart backend running");
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Manakart backend API running",
  });
});

/**
 * ==========================================
 * API ROUTES
 * ==========================================
 */

app.use("/api/auth", authRoutes);

app.use("/api/products", productRoutes);

app.use("/api/orders", orderRoutes);

app.use("/api/users", userRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/rider", riderRoutes);

/**
 * ==========================================
 * ERROR HANDLER
 * ==========================================
 *
 * Keep this after all routes.
 */

app.use(errorHandler);

/**
 * ==========================================
 * SERVER START
 * ==========================================
 */

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Manakart backend running on port ${PORT}`);
  console.log(`🔌 Socket.IO initialized`);
});