import type { FastifyRequest, FastifyReply } from "fastify";

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    reply.code(401).send({ error: "Unauthorized", statusCode: 401 });
  }
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
    const payload = req.user as { role?: string };
    if (payload.role !== "ADMIN") {
      reply.code(403).send({ error: "Forbidden", statusCode: 403 });
    }
  } catch {
    reply.code(401).send({ error: "Unauthorized", statusCode: 401 });
  }
}
