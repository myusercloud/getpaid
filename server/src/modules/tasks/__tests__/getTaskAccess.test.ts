import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module before importing anything that depends on it.
// vi.mock is hoisted, so this runs before any imports below.
vi.mock("../../../lib/db", () => ({
  db: {
    membership: {
      findUnique: vi.fn(),
    },
  },
}));

// Also mock videoRefresh so the import chain doesn't fail in a test env.
vi.mock("../../../lib/videoRefresh", () => ({ refreshVideos: vi.fn() }));

import { db } from "../../../lib/db";
import { getTaskAccess } from "../tasks.service";

const mockFindUnique = db.membership.findUnique as ReturnType<typeof vi.fn>;

describe("getTaskAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns canAccessVideo:true always, regardless of membership", async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await getTaskAccess("any-user-id");
    expect(result.canAccessVideo).toBe(true);
  });

  describe("when user has NO membership record", () => {
    beforeEach(() => {
      mockFindUnique.mockResolvedValue(null);
    });

    it("canEarnVideo is false", async () => {
      const result = await getTaskAccess("user-no-membership");
      expect(result.canEarnVideo).toBe(false);
    });

    it("canAccessAiTask is false", async () => {
      const result = await getTaskAccess("user-no-membership");
      expect(result.canAccessAiTask).toBe(false);
    });
  });

  describe("when user has an INACTIVE membership (isActive: false)", () => {
    beforeEach(() => {
      mockFindUnique.mockResolvedValue({ isActive: false });
    });

    it("canEarnVideo is false", async () => {
      const result = await getTaskAccess("user-inactive");
      expect(result.canEarnVideo).toBe(false);
    });

    it("canAccessAiTask is false", async () => {
      const result = await getTaskAccess("user-inactive");
      expect(result.canAccessAiTask).toBe(false);
    });
  });

  describe("when user has an ACTIVE membership (isActive: true)", () => {
    beforeEach(() => {
      mockFindUnique.mockResolvedValue({ isActive: true });
    });

    it("canEarnVideo is true", async () => {
      const result = await getTaskAccess("user-active");
      expect(result.canEarnVideo).toBe(true);
    });

    it("canAccessAiTask is true", async () => {
      const result = await getTaskAccess("user-active");
      expect(result.canAccessAiTask).toBe(true);
    });

    it("still returns canAccessVideo:true (not membership-gated)", async () => {
      const result = await getTaskAccess("user-active");
      expect(result.canAccessVideo).toBe(true);
    });
  });

  it("queries membership by the userId passed in", async () => {
    mockFindUnique.mockResolvedValue(null);
    await getTaskAccess("specific-user-123");
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { userId: "specific-user-123" } });
  });

  it("makes exactly one DB query per call (no duplicate membership lookups)", async () => {
    mockFindUnique.mockResolvedValue({ isActive: true });
    await getTaskAccess("user-active");
    expect(mockFindUnique).toHaveBeenCalledTimes(1);
  });
});
