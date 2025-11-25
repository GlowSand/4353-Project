import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

const prismaMock = {
  userProfile: {
    count: vi.fn(),
  },
  eventDetails: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  volunteerHistory: {
    aggregate: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => prismaMock),
}));

async function makeApp() {
  const routerModule = await import("../home.js");
  const app = express();
  app.use("/api/home", routerModule.default);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/home/stats", () => {
  it("returns aggregated values when prisma succeeds", async () => {
    prismaMock.userProfile.count.mockResolvedValueOnce(15);
    prismaMock.eventDetails.count.mockResolvedValueOnce(4);
    prismaMock.volunteerHistory.aggregate.mockResolvedValueOnce({
      _sum: { hoursVolunteered: 123.5 },
    });
    prismaMock.volunteerHistory.count.mockResolvedValueOnce(2);

    const res = await request(await makeApp()).get("/api/home/stats").expect(200);

    expect(res.body).toEqual({
      success: true,
      data: {
        volunteerCount: 15,
        upcomingEvents: 4,
        totalHours: 123.5,
        completedToday: 2,
      },
    });
    expect(prismaMock.eventDetails.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ eventDate: expect.objectContaining({ gte: expect.any(Date) }) }),
    });
  });

  it("returns 500 when any prisma call rejects", async () => {
    prismaMock.userProfile.count.mockRejectedValueOnce(new Error("boom"));

    const res = await request(await makeApp()).get("/api/home/stats").expect(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/failed to fetch statistics/i);
  });
});

describe("GET /api/home/featured-events", () => {
  it("returns formatted events ordered by upcoming date", async () => {
    const now = new Date();
    prismaMock.eventDetails.findMany.mockResolvedValueOnce([
      {
        id: "e1",
        eventName: "Cleanup",
        description: "desc",
        location: "Austin",
        eventDate: now,
        urgency: "High",
        requiredSkills: ["Teamwork"],
        _count: { volunteerHistory: 3 },
        createdAt: now,
      },
    ]);

    const res = await request(await makeApp()).get("/api/home/featured-events").expect(200);

    expect(prismaMock.eventDetails.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ eventDate: expect.objectContaining({ gte: expect.any(Date) }) }),
      orderBy: { eventDate: "asc" },
      take: 4,
      include: {
        _count: { select: { volunteerHistory: { where: { participationStatus: { in: ["registered", "confirmed"] } } } } },
      },
    });

    expect(res.body).toEqual({
      success: true,
      data: [
        {
          id: "e1",
          title: "Cleanup",
          description: "desc",
          location: "Austin",
          date: now.toISOString(),
          urgency: "High",
          requiredSkills: ["Teamwork"],
          signedUpCount: 3,
          createdAt: now.toISOString(),
        },
      ],
    });
  });

  it("returns 500 when featured events query fails", async () => {
    prismaMock.eventDetails.findMany.mockRejectedValueOnce(new Error("nope"));

    const res = await request(await makeApp()).get("/api/home/featured-events").expect(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/failed to fetch featured events/i);
  });
});
