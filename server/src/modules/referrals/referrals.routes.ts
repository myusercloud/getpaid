import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth";
import { getReferrals } from "./referrals.service";

export async function referralsRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.user as { id: string };
    reply.send(await getReferrals(id));
  });
}
