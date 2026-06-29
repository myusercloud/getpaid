import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../../middleware/auth";
import { getWallet, activateMembership, transferCredits } from "./wallet.service";

export async function walletRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.user as { id: string };
    reply.send(await getWallet(id));
  });

  app.post("/activate-membership", { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.user as { id: string };
    reply.send(await activateMembership(id));
  });

  app.post("/transfer", { preHandler: [authenticate] }, async (req, reply) => {
    const schema = z.object({ recipientEmail: z.string().email(), amount: z.number().min(10), note: z.string().max(200).optional() });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.errors[0].message, statusCode: 400 });
    const { id } = req.user as { id: string };
    reply.send(await transferCredits(id, body.data.recipientEmail, body.data.amount, body.data.note));
  });
}
