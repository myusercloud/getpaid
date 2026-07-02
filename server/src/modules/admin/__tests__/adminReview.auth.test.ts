/**
 * Auth gate tests for admin AI review endpoints.
 *
 * Verifies that the requireAdmin preHandler correctly:
 *   - Rejects unauthenticated requests (401)
 *   - Rejects USER-role tokens (403) — the key IDOR prevention check
 *   - Admits ADMIN-role tokens (200/201)
 *
 * Covers: GET /admin/ai-reviews, POST /admin/ai-reviews/:id/approve,
 *         POST /admin/ai-reviews/:id/reject
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";

// ── Mock Prisma before any app imports ───────────────────────────────────────
vi.mock("../../../lib/db", () => ({
  db: {
    aiTaskCompletion: {
      findMany:  vi.fn(),
      findUnique: vi.fn(),
      update:    vi.fn(),
    },
    wallet: { findUnique: vi.fn(), update: vi.fn() },
    // stubs required by other routes that load with buildApp()
    membership:     { findUnique: vi.fn() },
    aiTask:         { findUnique: vi.fn() },
    video:          { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    videoWatch:     { findMany: vi.fn().mockResolvedValue([]) },
    taskCompletion: { count: vi.fn().mockResolvedValue(0) },
    task:           { findMany: vi.fn().mockResolvedValue([]) },
    user:           { findMany: vi.fn().mockResolvedValue([]) },
    transaction:    { findMany: vi.fn().mockResolvedValue([]) },
    $transaction:   vi.fn(),
  },
}));

vi.mock("../../../lib/videoRefresh", () => ({ refreshVideos: vi.fn() }));

import { db } from "../../../lib/db";
import { buildApp } from "../../../app";

// ── JWT helpers ───────────────────────────────────────────────────────────────

const JWT_SECRET = "fallback_secret_change_in_prod";

function makeToken(payload: object): string {
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

const USER_TOKEN  = makeToken({ id: "regular-user-001", role: "USER" });
const ADMIN_TOKEN = makeToken({ id: "admin-user-001",   role: "ADMIN" });

const FAKE_COMPLETION_ID = "completion-abc-123";

// ── Suite setup ───────────────────────────────────────────────────────────────

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

const mockFindMany  = db.aiTaskCompletion.findMany  as ReturnType<typeof vi.fn>;
const mockFindUnique = db.aiTaskCompletion.findUnique as ReturnType<typeof vi.fn>;
const mockUpdate    = db.aiTaskCompletion.update     as ReturnType<typeof vi.fn>;
const mockWallet    = db.wallet.findUnique           as ReturnType<typeof vi.fn>;
const mockTx        = db.$transaction                as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockFindMany.mockResolvedValue([]);
});

// ── GET /admin/ai-reviews ─────────────────────────────────────────────────────

describe("GET /admin/ai-reviews", () => {
  it("returns 401 when no token is provided", async () => {
    const res = await app.inject({ method: "GET", url: "/admin/ai-reviews" });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 when a USER-role token is used", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/admin/ai-reviews",
      headers: { cookie: `token=${USER_TOKEN}` },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ error: "Forbidden" });
  });

  it("returns 200 when an ADMIN-role token is used", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/admin/ai-reviews",
      headers: { cookie: `token=${ADMIN_TOKEN}` },
    });
    expect(res.statusCode).toBe(200);
  });
});

// ── POST /admin/ai-reviews/:id/approve ───────────────────────────────────────

describe("POST /admin/ai-reviews/:id/approve", () => {
  it("returns 401 with no token", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/admin/ai-reviews/${FAKE_COMPLETION_ID}/approve`,
      payload: {},
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 for USER-role token — IDOR prevention", async () => {
    // A regular user who knows (or guesses) a completion ID must not be able to
    // approve it and trigger a wallet credit.
    const res = await app.inject({
      method: "POST",
      url: `/admin/ai-reviews/${FAKE_COMPLETION_ID}/approve`,
      headers: { cookie: `token=${USER_TOKEN}` },
      payload: {},
    });
    expect(res.statusCode).toBe(403);
    // Confirm the wallet was never touched
    expect(mockTx).not.toHaveBeenCalled();
  });

  it("returns 200 for ADMIN-role token with valid PENDING completion", async () => {
    mockFindUnique.mockResolvedValue({
      id: FAKE_COMPLETION_ID,
      userId: "some-user",
      aiTaskId: "some-task",
      status: "PENDING",
      reward: 5,
      aiTask: { title: "Test task" },
    });
    mockWallet.mockResolvedValue({ id: "wallet-001", userId: "some-user" });
    mockTx.mockResolvedValue([{}, {}]);

    const res = await app.inject({
      method: "POST",
      url: `/admin/ai-reviews/${FAKE_COMPLETION_ID}/approve`,
      headers: { cookie: `token=${ADMIN_TOKEN}` },
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ message: expect.stringContaining("approved") });
  });

  it("returns 409 when trying to approve an already-APPROVED completion", async () => {
    mockFindUnique.mockResolvedValue({
      id: FAKE_COMPLETION_ID,
      status: "APPROVED",
      reward: 5,
      aiTask: { title: "Test task" },
    });

    const res = await app.inject({
      method: "POST",
      url: `/admin/ai-reviews/${FAKE_COMPLETION_ID}/approve`,
      headers: { cookie: `token=${ADMIN_TOKEN}` },
      payload: {},
    });
    expect(res.statusCode).toBe(409);
    expect(mockTx).not.toHaveBeenCalled();
  });
});

// ── POST /admin/ai-reviews/:id/reject ────────────────────────────────────────

describe("POST /admin/ai-reviews/:id/reject", () => {
  it("returns 401 with no token", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/admin/ai-reviews/${FAKE_COMPLETION_ID}/reject`,
      payload: {},
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 for USER-role token — IDOR prevention", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/admin/ai-reviews/${FAKE_COMPLETION_ID}/reject`,
      headers: { cookie: `token=${USER_TOKEN}` },
      payload: {},
    });
    expect(res.statusCode).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 200 for ADMIN-role token with valid PENDING completion", async () => {
    mockFindUnique.mockResolvedValue({
      id: FAKE_COMPLETION_ID,
      status: "PENDING",
      reward: 5,
    });
    mockUpdate.mockResolvedValue({ id: FAKE_COMPLETION_ID, status: "REJECTED" });

    const res = await app.inject({
      method: "POST",
      url: `/admin/ai-reviews/${FAKE_COMPLETION_ID}/reject`,
      headers: { cookie: `token=${ADMIN_TOKEN}` },
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ message: expect.stringContaining("rejected") });
  });
});
