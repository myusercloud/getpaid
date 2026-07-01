import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { registerSchema, loginSchema } from "./auth.schema";
import { registerUser, loginUser, getMe, updateMe } from "./auth.service";
import { authenticate } from "../../middleware/auth";

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", async (req, reply) => {
    const body = registerSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.errors[0].message, statusCode: 400 });
    const user = await registerUser(body.data);
    reply.code(201).send({ message: "Account created successfully", user });
  });

  app.post("/login", async (req, reply) => {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.errors[0].message, statusCode: 400 });
    const user = await loginUser(body.data);
    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: "7d" });
    const isProd = process.env.NODE_ENV === "production";
    reply
      .setCookie("token", token, {
        httpOnly: true,
        sameSite: isProd ? "none" : "lax",
        secure: isProd,
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      })
      .send({ user });
  });

  app.post("/logout", async (_req, reply) => {
    const isProd = process.env.NODE_ENV === "production";
    reply.clearCookie("token", { path: "/", sameSite: isProd ? "none" : "lax", secure: isProd }).send({ message: "Logged out" });
  });

  app.get("/me", { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.user as { id: string };
    reply.send({ user: await getMe(id) });
  });

  app.put("/me", { preHandler: [authenticate] }, async (req, reply) => {
    const schema = z.object({ name: z.string().min(2).max(80) });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.errors[0].message, statusCode: 400 });
    const { id } = req.user as { id: string };
    reply.send({ user: await updateMe(id, body.data.name) });
  });

}
