import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../../middleware/auth";
import { getTasks, completeTask, getVideos, recordVideoProgress, getDashboard, getAiTask, submitAiTask } from "./tasks.service";

export async function tasksRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.user as { id: string };
    reply.send(await getTasks(id));
  });

  app.post("/:taskId/complete", { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.user as { id: string };
    const { taskId } = req.params as { taskId: string };
    reply.send(await completeTask(id, taskId));
  });

  app.get("/videos", { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.user as { id: string };
    reply.send(await getVideos(id));
  });

  app.post("/videos/:videoId/progress", { preHandler: [authenticate] }, async (req, reply) => {
    const schema = z.object({ watchedSeconds: z.number(), percentWatched: z.number().min(0).max(100) });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.errors[0].message, statusCode: 400 });
    const { id } = req.user as { id: string };
    const { videoId } = req.params as { videoId: string };
    reply.send(await recordVideoProgress(id, videoId, body.data.watchedSeconds, body.data.percentWatched));
  });

  app.get("/ai/:aiTaskId", { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.user as { id: string };
    const { aiTaskId } = req.params as { aiTaskId: string };
    reply.send(await getAiTask(id, aiTaskId));
  });

  app.post("/ai/:aiTaskId/submit", { preHandler: [authenticate] }, async (req, reply) => {
    const schema = z.object({ response: z.string().min(1) });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.errors[0].message, statusCode: 400 });
    const { id } = req.user as { id: string };
    const { aiTaskId } = req.params as { aiTaskId: string };
    reply.code(201).send(await submitAiTask(id, aiTaskId, body.data.response));
  });

  app.get("/dashboard", { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.user as { id: string };
    reply.send(await getDashboard(id));
  });
}
