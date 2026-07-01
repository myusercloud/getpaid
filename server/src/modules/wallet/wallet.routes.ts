import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../../middleware/auth";
import {
  getWallet,
  activateMembership,
  transferCredits,
  initiateSTKPush,
  handleIntaSendCallback,
  getPaymentStatus,
} from "./wallet.service";
import type { IntaSendCallback } from "../../lib/intasend";

export async function walletRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.user as { id: string };
    reply.send(await getWallet(id));
  });

  // Legacy direct activation (admin/testing)
  app.post("/activate-membership", { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.user as { id: string };
    reply.send(await activateMembership(id));
  });

  app.post("/transfer", { preHandler: [authenticate] }, async (req, reply) => {
    const schema = z.object({
      recipientEmail: z.string().email(),
      amount: z.number().min(10),
      note: z.string().max(200).optional(),
    });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.errors[0].message, statusCode: 400 });
    const { id } = req.user as { id: string };
    reply.send(await transferCredits(id, body.data.recipientEmail, body.data.amount, body.data.note));
  });

  // ── STK Push (IntaSend) ────────────────────────────────────────────────────
  app.post("/stk-push", { preHandler: [authenticate] }, async (req, reply) => {
    const schema = z.object({ phone: z.string().min(9).max(13) });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.errors[0].message, statusCode: 400 });
    const { id } = req.user as { id: string };
    reply.send(await initiateSTKPush(id, body.data.phone));
  });

  // IntaSend webhook — no auth (IntaSend POSTs here on payment state change)
  app.post("/intasend/callback", async (req, reply) => {
    try {
      await handleIntaSendCallback(req.body as IntaSendCallback);
    } catch {
      // Never return an error — IntaSend will retry otherwise
    }
    reply.send({ status: "ok" });
  });

  // Frontend polls this to detect payment confirmation
  app.get("/mpesa/status/:checkoutRequestId", { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.user as { id: string };
    const { checkoutRequestId } = req.params as { checkoutRequestId: string };
    reply.send(await getPaymentStatus(checkoutRequestId, id));
  });
}
