import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import { buildApp } from "../../server.js";
import { resetEvents, EVENT_URGENCY_OPTIONS } from "../../api/events.prisma.js";
import { EVENT_TITLE_MAX_LENGTH } from "../../shared.js";

const isoDate = (daysFromToday = 0) =>
  new Date(Date.now() + daysFromToday * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

let app;
beforeAll(async () => {
  process.env.NODE_ENV = "test";
  app = await buildApp();
});

beforeEach(async () => {
  await resetEvents([]);
});

describe("Events API", () => {
  it("GET /api/events returns an array", async () => {
    const res = await request(app).get("/api/events");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("POST /api/events rejects long titles", async () => {
    const longTitle = "X".repeat(EVENT_TITLE_MAX_LENGTH + 5);
    const res = await request(app)
      .post("/api/events")
      .send({
        name: longTitle,
        description: "xyz",
        location: "zyz",
        requiredSkills: ["Logistics"],
        urgency: EVENT_URGENCY_OPTIONS[0],
        eventDate: isoDate(1),
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Event name must be");
  });

  it("POST /api/events rejects past dates", async () => {
    const res = await request(app)
      .post("/api/events")
      .send({
        name: "past",
        description: "date is past",
        location: "location",
        requiredSkills: ["Coordination"],
        urgency: EVENT_URGENCY_OPTIONS[0],
        eventDate: isoDate(-1),
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Event date cannot be in the past.");
  });
});
