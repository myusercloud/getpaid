import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { config } from "./lib/config";
import { errorHandler } from "./middleware/errors";
import { authRoutes } from "./modules/auth/auth.routes";
import { walletRoutes } from "./modules/wallet/wallet.routes";
import { tasksRoutes } from "./modules/tasks/tasks.routes";
import { referralsRoutes } from "./modules/referrals/referrals.routes";
import { adminRoutes } from "./modules/admin/admin.routes";

export async function buildApp() {
  const app = Fastify({ logger: config.nodeEnv === "development" });

  await app.register(cors, {
    origin: config.webUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  });

  await app.register(cookie);
  await app.register(jwt, {
    secret: config.jwtSecret,
    cookie: { cookieName: "token", signed: false },
  });

  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });

  app.setErrorHandler(errorHandler);

  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(walletRoutes, { prefix: "/wallet" });
  await app.register(tasksRoutes, { prefix: "/tasks" });
  await app.register(referralsRoutes, { prefix: "/referrals" });
  await app.register(adminRoutes, { prefix: "/admin" });

  return app;
}
