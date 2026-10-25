
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import publicRoutes from "./routes/public.js";
import adminRoutes from "./routes/admin.js";
import { errorHandler, notFound } from "./middleware/error.js";

const app = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

const corsOptions = {
  origin(origin, callback) {
    // Requests without Origin are not browser cross-origin requests.
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/+$/, "");

    if (env.clientOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    console.warn("CORS origin rejected:", origin);
    return callback(new Error("Origin not allowed by CORS"));
  },

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: ["Content-Type", "Authorization"],

  credentials: false,

  optionsSuccessStatus: 204,
};

// CORS must run before API routes and error handlers.
app.use(cors(corsOptions));

app.use(express.json({ limit: "1mb" }));

app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Admin routes before public routes.
app.use("/api/admin", adminRoutes);
app.use("/api", publicRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
