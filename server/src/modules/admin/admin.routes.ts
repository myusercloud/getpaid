import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAdmin } from "../../middleware/auth";
import { getAdminStats, getAdminUsers, getAdminTasks, createTask, updateTask, getAdminVideos, createVideo, updateVideo } from "./admin.service";

export async function adminRoutes(app: FastifyInstance) {
  app.get("/stats", { preHandler: [requireAdmin] }, async (_req, reply) => reply.send(await getAdminStats()));
  app.get("/users", { preHandler: [requireAdmin] }, async (_req, reply) => reply.send(await getAdminUsers()));

  app.get("/tasks", { preHandler: [requireAdmin] }, async (_req, reply) => reply.send(await getAdminTasks()));
  app.post("/tasks", { preHandler: [requireAdmin] }, async (req, reply) => {
    const schema = z.object({ title: z.string().min(1), description: z.string().optional(), type: z.string(), reward: z.number().min(0), cooldownHours: z.number().min(0), maxPerDay: z.number().min(1), contentUrl: z.string().optional() });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.errors[0].message, statusCode: 400 });
    reply.code(201).send(await createTask(body.data));
  });
  app.put("/tasks/:id", { preHandler: [requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    reply.send(await updateTask(id, req.body as any));
  });

  app.get("/videos", { preHandler: [requireAdmin] }, async (_req, reply) => reply.send(await getAdminVideos()));
  app.post("/videos", { preHandler: [requireAdmin] }, async (req, reply) => {
    const schema = z.object({ title: z.string().min(1), description: z.string().optional(), youtubeId: z.string().min(1), duration: z.number().min(1), minWatchPercent: z.number().min(1).max(100), reward: z.number().min(0) });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.errors[0].message, statusCode: 400 });
    reply.code(201).send(await createVideo(body.data));
  });
  app.put("/videos/:id", { preHandler: [requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    reply.send(await updateVideo(id, req.body as any));
  });
}
