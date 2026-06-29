export const config = {
  port: Number(process.env.API_PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? "fallback_secret_change_in_prod",
  nodeEnv: process.env.NODE_ENV ?? "development",
  webUrl: process.env.WEB_URL ?? "http://localhost:3000",
};
