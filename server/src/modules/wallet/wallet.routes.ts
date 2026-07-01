import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../../middleware/auth";
import {
  getWallet,
  activateMembership,
  transferCredits,
  initiateSTKPush,
  handleMpesaCallback,
  getPaymentStatus,
} from "./wallet.service";
import type { MpesaCallbackBody } from "../../lib/mpesa";

export async function walletRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.user as { id: string };
    reply.send(await getWallet(id));
  });

  // Legacy direct activation (kept for admin/testing)
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

  // ── STK Push ───────────────────────────────────────────────────────────────
  app.post("/stk-push", { preHandler: [authenticate] }, async (req, reply) => {
    const schema = z.object({ phone: z.string().min(9).max(13) });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.errors[0].message, statusCode: 400 });
    const { id } = req.user as { id: string };
    reply.send(await initiateSTKPush(id, body.data.phone));
  });

  // Safaricom callback — no auth (Safaricom calls this directly)
  app.post("/mpesa/callback", async (req, reply) => {
    try {
      await handleMpesaCallback(req.body as MpesaCallbackBody);
    } catch {
      // Never fail the callback — Safaricom will retry
    }
    reply.send({ ResultCode: 0, ResultDesc: "Accepted" });
  });

  // Frontend polls this to know when payment is confirmed
  app.get("/mpesa/status/:checkoutRequestId", { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.user as { id: string };
    const { checkoutRequestId } = req.params as { checkoutRequestId: string };
    reply.send(await getPaymentStatus(checkoutRequestId, id));
  });
}
