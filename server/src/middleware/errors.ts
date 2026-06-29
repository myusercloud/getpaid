import type { FastifyError, FastifyRequest, FastifyReply } from "fastify";

export function errorHandler(error: FastifyError, _req: FastifyRequest, reply: FastifyReply) {
  const statusCode = error.statusCode ?? 500;
  const message = statusCode === 500 ? "Internal server error" : error.message;

  if (statusCode === 500) {
    console.error("[API Error]", error);
  }

  reply.code(statusCode).send({ error: message, statusCode });
}
