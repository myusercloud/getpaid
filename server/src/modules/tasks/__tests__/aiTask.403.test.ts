/**
 * Integration tests for AI task 403 access-gate paths.
 *
 * Uses Fastify's inject() so requests go through the full middleware stack
 * (JWT verification → authenticate → service layer) without a real HTTP server.
 *
 * The Prisma db is mocked so no real database connection is required.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import jwt from "@fastify/jwt";

// ── Mock Prisma ──────────────────────────────────────────────────────────────
// Must be declared before buildApp() is imported so the module factory runs first.
vi.mock("../../../lib/db", () => ({
  db: {
    membership: { findUnique: vi.fn() },
    aiTask:     { findUnique: vi.fn() },
    aiTaskCompletion: { findUnique: vi.fn(), create: vi.fn() },
    // getTasks() touches these; stub them so the import chain doesn't throw
    video:          { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    videoWatch:     { findMany: vi.fn().mockResolvedValue([]) },
    taskCompletion: { count: vi.fn().mockResolvedValue(0) },
  },
}));

vi.mock("../../../lib/videoRefresh", () => ({ refreshVideos: vi.fn() }));

import { db } from "../../../lib/db";
import { buildApp } from "../../../app";

// ── Helpers ──────────────────────────────────────────────────────────────────

const JWT_SECRET = "fallback_secret_change_in_prod"; // matches config.ts fallback

function makeToken(payload: object): string {
  // Build a minimal HS256 JWT without the fastify instance by hand.
  // Base64url-encode header.payload, then HMAC-SHA256 sign.
  const { createHmac } = require("crypto");
  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  const header = encode({ alg: "HS256", typ: "JWT" });
  const body   = encode({ ...payload, iat: Math.floor(Date.now() / 1000) });
  const sig    = createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${sig}`;
}

const INACTIVE_TOKEN = makeToken({ id: "user-inactive", role: "USER" });
const ACTIVE_TOKEN   = makeToken({ id: "user-active",   role: "USER" });

const FAKE_AI_TASK_ID = "aitask-test-001";

const ACTIVE_TASK = {
  id: FAKE_AI_TASK_ID,
  title: "Test task",
  description: null,
  category: "DATA_ANNOTATION",
  prompt: "Classify this",
  rubric: null,
  options: null,
  reward: 5,
  isActive: true,
};

// ── Suite setup ───────────────────────────────────────────────────────────────

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

const mockMembership  = db.membership.findUnique  as ReturnType<typeof vi.fn>;
const mockAiTask      = db.aiTask.findUnique      as ReturnType<typeof vi.fn>;
const mockAiCompletion = db.aiTaskCompletion.findUnique as ReturnType<typeof vi.fn>;
const mockAiCreate    = db.aiTaskCompletion.create as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockAiTask.mockResolvedValue(ACTIVE_TASK);
  mockAiCompletion.mockResolvedValue(null); // no prior submission by default
});

// ── GET /tasks/ai/:id — content access gate ───────────────────────────────────

describe("GET /tasks/ai/:id", () => {
  it("returns 401 when no auth token is provided", async () => {
    const res = await app.inject({ method: "GET", url: `/tasks/ai/${FAKE_AI_TASK_ID}` });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 for an INACTIVE member", async () => {
    mockMembership.mockResolvedValue({ isActive: false });

    const res = await app.inject({
      method: "GET",
      url: `/tasks/ai/${FAKE_AI_TASK_ID}`,
      headers: { cookie: `token=${INACTIVE_TOKEN}` },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ error: expect.stringContaining("membership") });
  });

  it("returns 403 when user has NO membership record", async () => {
    mockMembership.mockResolvedValue(null);

    const res = await app.inject({
      method: "GET",
      url: `/tasks/ai/${FAKE_AI_TASK_ID}`,
      headers: { cookie: `token=${INACTIVE_TOKEN}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("returns 200 with task content for an ACTIVE member", async () => {
    mockMembership.mockResolvedValue({ isActive: true });

    const res = await app.inject({
      method: "GET",
      url: `/tasks/ai/${FAKE_AI_TASK_ID}`,
      headers: { cookie: `token=${ACTIVE_TOKEN}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ id: FAKE_AI_TASK_ID, prompt: "Classify this" });
  });

  it("returns 404 when the task does not exist (active member)", async () => {
    mockMembership.mockResolvedValue({ isActive: true });
    mockAiTask.mockResolvedValue(null);

    const res = await app.inject({
      method: "GET",
      url: "/tasks/ai/nonexistent-id",
      headers: { cookie: `token=${ACTIVE_TOKEN}` },
    });

    expect(res.statusCode).toBe(404);
  });
});

// ── POST /tasks/ai/:id/submit — submit gate ───────────────────────────────────

describe("POST /tasks/ai/:id/submit", () => {
  const VALID_RESPONSE = "This response is long enough to pass the thirty character minimum.";

  it("returns 401 when no auth token is provided", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/tasks/ai/${FAKE_AI_TASK_ID}/submit`,
      payload: { response: VALID_RESPONSE },
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 for an INACTIVE member (access gate fires before length check)", async () => {
    mockMembership.mockResolvedValue({ isActive: false });

    // Note: length check runs first in submitAiTask(), then access check.
    // We use a VALID response here to confirm it's the access gate — not length — returning 403.
    const res = await app.inject({
      method: "POST",
      url: `/tasks/ai/${FAKE_AI_TASK_ID}/submit`,
      headers: { cookie: `token=${INACTIVE_TOKEN}` },
      payload: { response: VALID_RESPONSE },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ error: expect.stringContaining("membership") });
  });

  it("returns 403 when user has NO membership record", async () => {
    mockMembership.mockResolvedValue(null);

    const res = await app.inject({
      method: "POST",
      url: `/tasks/ai/${FAKE_AI_TASK_ID}/submit`,
      headers: { cookie: `token=${INACTIVE_TOKEN}` },
      payload: { response: VALID_RESPONSE },
    });

    expect(res.statusCode).toBe(403);
  });

  it("returns 400 when response is too short (active member, fails length gate)", async () => {
    mockMembership.mockResolvedValue({ isActive: true });

    const res = await app.inject({
      method: "POST",
      url: `/tasks/ai/${FAKE_AI_TASK_ID}/submit`,
      headers: { cookie: `token=${ACTIVE_TOKEN}` },
      payload: { response: "Too short." },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: expect.stringContaining("30 characters") });
  });

  it("returns 400 when response is empty string (active member)", async () => {
    mockMembership.mockResolvedValue({ isActive: true });

    const res = await app.inject({
      method: "POST",
      url: `/tasks/ai/${FAKE_AI_TASK_ID}/submit`,
      headers: { cookie: `token=${ACTIVE_TOKEN}` },
      payload: { response: "" },
    });

    // Empty string fails zod schema (min(1)) before even reaching the service
    expect(res.statusCode).toBe(400);
  });

  it("returns 201 with PENDING status for a valid submission by active member", async () => {
    mockMembership.mockResolvedValue({ isActive: true });
    mockAiCreate.mockResolvedValue({ id: "completion-001", status: "PENDING" });

    const res = await app.inject({
      method: "POST",
      url: `/tasks/ai/${FAKE_AI_TASK_ID}/submit`,
      headers: { cookie: `token=${ACTIVE_TOKEN}` },
      payload: { response: VALID_RESPONSE },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.status).toBe("PENDING");
    expect(body.message).toMatch(/review/i);
  });

  it("does NOT call aiTaskCompletion.create when inactive member submits", async () => {
    mockMembership.mockResolvedValue({ isActive: false });

    await app.inject({
      method: "POST",
      url: `/tasks/ai/${FAKE_AI_TASK_ID}/submit`,
      headers: { cookie: `token=${INACTIVE_TOKEN}` },
      payload: { response: VALID_RESPONSE },
    });

    expect(mockAiCreate).not.toHaveBeenCalled();
  });

  it("returns 409 when active member submits same task twice", async () => {
    mockMembership.mockResolvedValue({ isActive: true });
    // Second call: prior completion exists
    mockAiCompletion.mockResolvedValue({ id: "prior", status: "PENDING" });

    const res = await app.inject({
      method: "POST",
      url: `/tasks/ai/${FAKE_AI_TASK_ID}/submit`,
      headers: { cookie: `token=${ACTIVE_TOKEN}` },
      payload: { response: VALID_RESPONSE },
    });

    expect(res.statusCode).toBe(409);
  });
});
