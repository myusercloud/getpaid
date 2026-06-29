import "dotenv/config";
import { buildApp } from "./app";
import { config } from "./lib/config";

async function start() {
  const app = await buildApp();
  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
    console.log(`\n🚀 GETPAID API running at http://localhost:${config.port}`);
    console.log(`   Health: http://localhost:${config.port}/health\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
