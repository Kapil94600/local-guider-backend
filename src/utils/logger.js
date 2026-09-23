// src/utils/logger.js
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

// ═══════════════════════════════════════════
// Log directory
// ═══════════════════════════════════════════
const LOG_DIR = path.join(process.cwd(), "logs");

// ═══════════════════════════════════════════
// Daily rotate file transport — all logs
// ═══════════════════════════════════════════
const fileTransport = new DailyRotateFile({
  dirname: LOG_DIR,
  filename: "app-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
});

// ═══════════════════════════════════════════
// Error-only file transport
// ═══════════════════════════════════════════
const errorFileTransport = new DailyRotateFile({
  dirname: LOG_DIR,
  filename: "error-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "30d",
  level: "error",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
});

// ═══════════════════════════════════════════
// Console transport
// ═══════════════════════════════════════════
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: "HH:mm:ss" }),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
});

// ═══════════════════════════════════════════
// Logger
// ═══════════════════════════════════════════
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  transports: [consoleTransport, fileTransport, errorFileTransport],
  exitOnError: false,
});