import pino from "pino";
import { env } from "./env.js";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "password",
    "SMTP_PASS",
    "GOOGLE_CLIENT_SECRET",
  ],
});
