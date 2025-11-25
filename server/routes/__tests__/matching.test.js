import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";


vi.mock("@prisma/client", () => {
  const prismaMock = {
    userProfile: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    eventDetails: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    assignment: {
      create: vi.fn(),
    },
    notice: {
      create: vi.fn(),
    },
  };
  const PrismaClient = vi.fn(() => prismaMock);
  return { PrismaClient, prismaMock };
});

vi.mock("../../services/matching.js", () => {
  
  const score = vi.fn((v, e) =>
    (e.requiredSkills || []).filter((s) => (v.skills || []).includes(s)).length
  );
  return { score };
});

vi.mock("../../services/notifications.js", () => {
  const bus = { emit: vi.fn() };
  return { bus };
});


import { prismaMock } from "@prisma/client";
import { score } from "../../services/matching.js";
import { bus } from "../../services/notifications.js";
import { matching as router } from "../matching.js";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/match", router);
  return app;
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.clearAllMocks());

describe("GET /match/volunteers", () => {
  it("lists volunteers as DTOs", async () => {
    prismaMock.userProfile.findMany.mockResolvedValueOnce([
      { userId: "u1", fullName: "Alex", city: "Austin", skills: ["js", "node"] },
      { userId: "u2", fullName: "Bea", city: "Boston", skills: null }, 
    ]);

    const res = await request(makeApp()).get("/match/volunteers").expect(200);

    expect(prismaMock.userProfile.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      select: { userId: true, fullName: true, city: true, skills: true },
    });
    expect(res.body).toEqual([
      { id: "u1", name: "Alex", location: "Austin", skills: ["js", "node"] },
      { id: "u2", name: "Bea", location: "Boston", skills: [] },
    ]);
  });

  it("500 on prisma error", async () => {
    prismaMock.userProfile.findMany.mockRejectedValueOnce(new Error("boom"));
    const res = await request(makeApp()).get("/match/volunteers").expect(500);
    expect(res.body).toEqual({ error: "list_volunteers_failed" });
  });
});

describe("GET /match/events", () => {
  it("lists events as DTOs", async () => {
    prismaMock.eventDetails.findMany.mockResolvedValueOnce([
      {
        id: "e1",
        eventName: "Cleanup",
        location: "Park",
        requiredSkills: ["gloves"],
        eventDate: new Date("2025-01-02T00:00:00.000Z"),
        urgency: "Low",
      },
      {
        id: "e2",
        eventName: "Cook",
        location: "Kitchen",
        requiredSkills: null,
        eventDate: "2025-02-03T00:00:00.000Z", 
        urgency: "High",
      },
    ]);

    const res = await request(makeApp()).get("/match/events").expect(200);

    expect(prismaMock.eventDetails.findMany).toHaveBeenCalledWith({
      orderBy: { eventDate: "asc" },
      select: {
        id: true,
        eventName: true,
        location: true,
        requiredSkills: true,
        eventDate: true,
        urgency: true,
      },
    });

    expect(res.body).toEqual([
      {
        id: "e1",
        name: "Cleanup",
        location: "Park",
        requiredSkills: ["gloves"],
        date: "2025-01-02",
        urgency: "Low",
      },
      {
        id: "e2",
        name: "Cook",
        location: "Kitchen",
        requiredSkills: [],
        date: "2025-02-03",
        urgency: "High",
      },
    ]);
  });

  it("500 on prisma error", async () => {
    prismaMock.eventDetails.findMany.mockRejectedValueOnce(new Error("boom"));
    const res = await request(makeApp()).get("/match/events").expect(500);
    expect(res.body).toEqual({ error: "list_events_failed" });
  });
});

describe("GET /match/volunteer/:id", () => {
  it("404 when volunteer not found", async () => {
    prismaMock.userProfile.findUnique.mockResolvedValueOnce(null);
    const res = await request(makeApp()).get("/match/volunteer/u0").expect(404);
    expect(res.body).toEqual({ error: "volunteer not found" });
  });

  it("ranks events using scorer and respects topN", async () => {
    prismaMock.userProfile.findUnique.mockResolvedValueOnce({
      userId: "u1",
      fullName: "Alex",
      city: "Austin",
      skills: ["js", "node"],
    });

    prismaMock.eventDetails.findMany.mockResolvedValueOnce([
      {
        id: "e1",
        eventName: "Teach JS",
        location: "Lab",
        requiredSkills: ["js"],
        eventDate: "2025-05-01T00:00:00.000Z",
        urgency: "Medium",
      },
      {
        id: "e2",
        eventName: "Gardening",
        location: "Park",
        requiredSkills: ["plants"],
        eventDate: "2025-05-02T00:00:00.000Z",
        urgency: "Low",
      },
      {
        id: "e3",
        eventName: "Node Help",
        location: "HQ",
        requiredSkills: ["node", "js"],
        eventDate: "2025-05-03T00:00:00.000Z",
        urgency: "High",
      },
    ]);

    const res = await request(makeApp())
      .get("/match/volunteer/u1?topN=1")
      .expect(200);

    
    expect(score).toHaveBeenCalled();
    
    expect(res.body).toHaveLength(1);
    expect(res.body[0].event.id).toBe("e3");
    expect(res.body[0].score).toBe(2); 
  });

  it("500 on prisma error", async () => {
    prismaMock.userProfile.findUnique.mockRejectedValueOnce(new Error("boom"));
    const res = await request(makeApp()).get("/match/volunteer/u1").expect(500);
    expect(res.body).toEqual({ error: "rank_failed" });
  });
});

describe("POST /match/assign", () => {
  it("400 when missing fields", async () => {
    const res = await request(makeApp())
      .post("/match/assign")
      .send({})
      .expect(400);
    expect(res.body).toEqual({ error: "volunteerId and eventId required" });
  });

  it("404 when volunteer or event missing", async () => {
    prismaMock.userProfile.findUnique.mockResolvedValueOnce(null);
    prismaMock.eventDetails.findUnique.mockResolvedValueOnce(null);
    await request(makeApp())
      .post("/match/assign")
      .send({ volunteerId: "u1", eventId: "e1" })
      .expect(404);
  });

  it("creates assignment, notice, emits, returns payload", async () => {
    prismaMock.userProfile.findUnique.mockResolvedValueOnce({
      userId: "u1",
      fullName: "Alex",
    });
    prismaMock.eventDetails.findUnique.mockResolvedValueOnce({
      id: "e1",
      eventName: "Cleanup",
      location: "Park",
      eventDate: "2025-06-01T00:00:00.000Z",
    });

    prismaMock.assignment.create.mockResolvedValueOnce({
      id: "a1",
      createdAtMs: 123n, 
    });

    prismaMock.notice.create.mockResolvedValueOnce({
      id: "n1",
      volunteerId: "u1",
      title: "Assigned: Cleanup",
      body: "Park • 2025-06-01T00:00:00.000Z",
      type: "success",
      createdAtMs: 456n,
    });

    const res = await request(makeApp())
      .post("/match/assign")
      .send({ volunteerId: "u1", eventId: "e1" })
      .expect(200);

    expect(prismaMock.assignment.create).toHaveBeenCalledWith({
      data: { volunteerId: "u1", eventId: "e1" },
    });

    expect(prismaMock.notice.create).toHaveBeenCalledWith({
      data: {
        volunteerId: "u1",
        title: "Assigned: Cleanup",
        body: "Park • 2025-06-01T00:00:00.000Z",
        type: "success",
      },
    });

    expect(bus.emit).toHaveBeenCalledWith(
      "notice:u1",
      {
        id: "n1",
        volunteerId: "u1",
        title: "Assigned: Cleanup",
        body: "Park • 2025-06-01T00:00:00.000Z",
        type: "success",
        createdAtMs: 456, 
      },
    );

    expect(res.body).toEqual({
      ok: true,
      assignment: {
        id: "a1",
        volunteerId: "u1",
        eventId: "e1",
        createdAtMs: 123,
      },
    });
  });

  it("500 on prisma error", async () => {
    prismaMock.userProfile.findUnique.mockRejectedValueOnce(new Error("boom"));
    const res = await request(makeApp())
      .post("/match/assign")
      .send({ volunteerId: "u1", eventId: "e1" })
      .expect(500);
    expect(res.body).toEqual({ error: "assign_failed" });
  });
});

describe("GET /match/health", () => {
  it("returns ok", async () => {
    const res = await request(makeApp()).get("/match/health").expect(200);
    expect(res.body).toEqual({ ok: true });
  });
});
