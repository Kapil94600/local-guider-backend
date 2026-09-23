// src/app.js
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
import { logger } from "./utils/logger.js";

const app = express();

// ═══════════════════════════════════════════════════════════════
// Trust proxy — Render/Vercel/Heroku behind proxy
// ═══════════════════════════════════════════════════════════════
app.set("trust proxy", 1);

// ═══════════════════════════════════════════════════════════════
// Disable ETag + no-store cache
// ═══════════════════════════════════════════════════════════════
app.disable("etag");
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// ═══════════════════════════════════════════════════════════════
// ✅ FIX B-17: Helmet with CSP enabled (relaxed for API)
// API only serves JSON — CSP is defense-in-depth
// ═══════════════════════════════════════════════════════════════
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"], // Cloudinary images
        connectSrc: ["'self'", "https:"],       // Razorpay, Cloudinary
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: env.NODE_ENV === "production" ? [] : null,
      },
    },
    referrerPolicy: { policy: "no-referrer" },
    hsts: env.NODE_ENV === "production"
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
    frameguard: { action: "deny" },
  })
);

// ═══════════════════════════════════════════════════════════════
// CORS
// ═══════════════════════════════════════════════════════════════
const allowedOrigins = (env.CORS_ORIGIN || [])
  .map((o) => (typeof o === "string" ? o.trim() : o))
  .filter(Boolean);

logger.info(`🔧 Allowed CORS origins: ${allowedOrigins.join(", ")}`);

app.use(
  cors({
    origin: (origin, callback) => {
      // Mobile apps, Postman, curl (no origin)
      if (!origin) return callback(null, true);

      // Whitelisted origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Vercel preview deployments
      if (/^https:\/\/local-guider-admin.*\.vercel\.app$/.test(origin)) {
        logger.info(`✅ Allowed Vercel preview: ${origin}`);
        return callback(null, true);
      }

      logger.warn(`❌ CORS blocked: ${origin}`);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

// ═══════════════════════════════════════════════════════════════
// Body parsing (with rawBody preservation for webhooks)
// ═══════════════════════════════════════════════════════════════
app.use(compression());
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      // ✅ Preserve raw body for Razorpay webhook signature
      if (req.originalUrl.startsWith("/api/v1/payments/webhook")) {
        req.rawBody = buf;
      }
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ═══════════════════════════════════════════════════════════════
// HTTP request logging (skip in production for perf)
// ═══════════════════════════════════════════════════════════════
if (env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    })
  );
}

// ═══════════════════════════════════════════════════════════════
// Static uploads (legacy — migrated to Cloudinary)
// ═══════════════════════════════════════════════════════════════
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ═══════════════════════════════════════════════════════════════
// Rate limiting (skip in test)
// ═══════════════════════════════════════════════════════════════
if (env.NODE_ENV !== "test") {
  app.use("/api/v1", apiLimiter);
}

// ═══════════════════════════════════════════════════════════════
// Routes
// ═══════════════════════════════════════════════════════════════
app.use("/api/v1", routes);

// ═══════════════════════════════════════════════════════════════
// Health check root (some platforms ping /)
// ═══════════════════════════════════════════════════════════════
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Local Guider API",
    version: "1.0.0",
  });
});

// ═══════════════════════════════════════════════════════════════
// 404 + Error handlers
// ═══════════════════════════════════════════════════════════════
app.use(notFound);
app.use(errorHandler);

export default app;