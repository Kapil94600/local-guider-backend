import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import path from "path";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { notFound } from "./middlewares/notFound.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { apiLimiter } from "./middlewares/rateLimiter.js";

const app = express();

app.disable("etag");
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// ═══════════════════════════════════════════
// ⚡ CORS Configuration — Trim + Filter
// ═══════════════════════════════════════════
const allowedOrigins = (env.CORS_ORIGIN || [])
  .map((o) => (typeof o === "string" ? o.trim() : o))
  .filter(Boolean);

console.log("🔧 Allowed CORS origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without origin (mobile apps, Postman, curl)
      if (!origin) return callback(null, true);

      // Allow if origin is in the whitelist
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow all vercel preview deployments for this project
      if (/^https:\/\/local-guider-admin.*\.vercel\.app$/.test(origin)) {
        console.log("✅ Allowed Vercel preview:", origin);
        return callback(null, true);
      }

      console.error("❌ CORS blocked for origin:", origin);
      console.error("   Allowed origins:", allowedOrigins);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

if (env.NODE_ENV !== "test") {
  app.use("/api/v1", apiLimiter);
}

app.use("/api/v1", routes);

app.use(notFound);
app.use(errorHandler);

export default app;