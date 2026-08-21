import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { RedisStore } from "connect-redis";
import { passport } from "./auth/passport.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { redis } from "./redis/client.js";
import { sessionRedis } from "./redis/sessionClient.js";
import { authRouter } from "./routes/auth.js";
import { campaignsRouter } from "./routes/campaigns.js";
import { emailsRouter } from "./routes/emails.js";

export function createApp() {
  const app = express();
  const redisStore = new RedisStore({ client: sessionRedis, prefix: "session:" });

  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const requestId = req.headers["x-request-id"]?.toString() ?? randomUUID();
        res.setHeader("x-request-id", requestId);
        return requestId;
      },
    }),
  );
  app.use(
    session({
      name: "reachinbox.sid",
      store: redisStore,
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/auth", authRouter);
  app.use("/api/campaigns", campaignsRouter);
  app.use("/api/emails", emailsRouter);
  app.get("/api/config", (req, res) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Please sign in" } });
      return;
    }
    res.json({
      minSendDelayMs: env.MIN_SEND_DELAY_MS,
      maxEmailsPerHourPerSender: env.MAX_EMAILS_PER_HOUR_PER_SENDER,
      maxRecipientsPerCampaign: 5_000,
    });
  });
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
