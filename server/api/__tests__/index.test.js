import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("../events.prisma.js", () => {
  return {
    listEvents: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    resetEvents: vi.fn(),
  };
});

it("DELETE /api/events/:id -> 400 when deleteEvent throws Error", async () => {
  deleteEvent.mockRejectedValueOnce(new Error("nope"));
  const res = await request(app()).delete("/api/events/e-err").expect(400);
  expect(res.body).toEqual({ error: "nope" });
});

it("POST /api/events/reset -> 500 when resetEvents throws non-Error", async () => {
  resetEvents.mockRejectedValueOnce("boom");
  await request(app()).post("/api/events/reset").send([]).expect(500);
});


vi.mock("../volunteerHistory.prisma.js", () => {
  return {
    listVolunteerHistory: vi.fn(),
    addVolunteerHistory: vi.fn(),
    resetVolunteerHistory: vi.fn(),
  };
});

import {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  resetEvents,
} from "../events.prisma.js";
import {
  listVolunteerHistory,
  addVolunteerHistory,
  resetVolunteerHistory,
} from "../volunteerHistory.prisma.js";
import apiRouter from "../index.js";

function app() {
  const a = express();
  a.use(express.json());
  a.use("/api", apiRouter);
  return a;
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.clearAllMocks());

describe("GET /api/events", () => {
  it("200 returns data", async () => {
    listEvents.mockResolvedValueOnce([{ id: "e1" }]);
    const res = await request(app()).get("/api/events").expect(200);
    expect(listEvents).toHaveBeenCalled();
    expect(res.body).toEqual({ data: [{ id: "e1" }] });
  });

  it("400 on Error thrown", async () => {
    listEvents.mockRejectedValueOnce(new Error("bad"));
    const res = await request(app()).get("/api/events").expect(400);
    expect(res.body).toEqual({ error: "bad" });
  });
});

describe("POST /api/events", () => {
  it("201 creates event", async () => {
    createEvent.mockResolvedValueOnce({ id: "e2" });
    const res = await request(app())
      .post("/api/events")
      .send({ name: "X" })
      .expect(201);
    expect(createEvent).toHaveBeenCalledWith({ name: "X" });
    expect(res.body).toEqual({ data: { id: "e2" } });
  });

  it("500 when non-Error thrown", async () => {
    createEvent.mockRejectedValueOnce("nope");
    const res = await request(app())
      .post("/api/events")
      .send({ name: "X" })
      .expect(500);
    expect(res.body).toEqual({ error: "Unexpected server error." });
  });
});

describe("PUT /api/events/:id", () => {
  it("200 updates event", async () => {
    updateEvent.mockResolvedValueOnce({ id: "e3", name: "Y" });
    const res = await request(app())
      .put("/api/events/e3")
      .send({ name: "Y" })
      .expect(200);
    expect(updateEvent).toHaveBeenCalledWith("e3", { name: "Y" });
    expect(res.body).toEqual({ data: { id: "e3", name: "Y" } });
  });
});

describe("DELETE /api/events/:id", () => {
  it("204 on success", async () => {
    deleteEvent.mockResolvedValueOnce();
    await request(app()).delete("/api/events/e9").expect(204);
    expect(deleteEvent).toHaveBeenCalledWith("e9");
  });
});

describe("POST /api/events/reset", () => {
  it("204 with array seed", async () => {
    resetEvents.mockResolvedValueOnce();
    await request(app()).post("/api/events/reset").send([{ id: "a" }]).expect(204);
    expect(resetEvents).toHaveBeenCalledWith([{ id: "a" }]);
  });

  it("204 with non-array coerced to []", async () => {
    resetEvents.mockResolvedValueOnce();
    await request(app()).post("/api/events/reset").send({ not: "array" }).expect(204);
    expect(resetEvents).toHaveBeenCalledWith([]);
  });
});

const VH = [
  {
    id: "vh1",
    volunteerName: "Alex",
    assignment: "Cleanup",
    location: "Austin",
    status: "Registered",
    eventDate: "2025-01-02",
  },
  {
    id: "vh2",
    volunteerName: "Bea",
    assignment: "Cooking",
    location: "Boston",
    status: "Attended",
    eventDate: "2025-01-03",
  },
  {
    id: "vh3",
    volunteerName: "Casey",
    assignment: "Cleanup",
    location: "Chicago",
    status: "No Show",
    eventDate: "2025-01-04",
  },
];

describe("GET /api/volunteer-history", () => {
  it("filters by search term across fields", async () => {
    listVolunteerHistory.mockResolvedValueOnce(VH);
    const res = await request(app())
      .get("/api/volunteer-history")
      .query({ search: "cook" })
      .expect(200);

    expect(listVolunteerHistory).toHaveBeenCalled();
    expect(res.body.data.items.map((x) => x.id)).toEqual(["vh2"]);
    expect(res.body.data.total).toBe(1);
  });

  it("filters by status list and date range", async () => {
    listVolunteerHistory.mockResolvedValueOnce(VH);
    const res = await request(app())
      .get("/api/volunteer-history")
      .query({
        status: "Registered,Attended",
        dateFrom: "2025-01-02",
        dateTo: "2025-01-03",
      })
      .expect(200);

    expect(res.body.data.items.map((x) => x.id).sort()).toEqual(["vh1", "vh2"]);
    expect(res.body.data.total).toBe(2);
  });

  it("sorts by volunteerName asc", async () => {
    listVolunteerHistory.mockResolvedValueOnce(VH);
    const res = await request(app())
      .get("/api/volunteer-history")
      .query({ sortKey: "volunteerName", sortDir: "asc" })
      .expect(200);

    expect(res.body.data.items.map((x) => x.volunteerName)).toEqual(["Alex", "Bea", "Casey"]);
  });

  it("paginates results", async () => {
    listVolunteerHistory.mockResolvedValueOnce(VH);
    const res = await request(app())
      .get("/api/volunteer-history")
      .query({ page: "2", pageSize: "2", sortKey: "eventDate", sortDir: "asc" })
      .expect(200);

    expect(res.body.data.items.map((x) => x.id)).toEqual(["vh3"]);
    expect(res.body.data.total).toBe(3);
  });

  it("400 when listVolunteerHistory throws Error", async () => {
    listVolunteerHistory.mockRejectedValueOnce(new Error("oops"));
    const res = await request(app()).get("/api/volunteer-history").expect(400);
    expect(res.body).toEqual({ error: "oops" });
  });
});

describe("POST /api/volunteer-history", () => {
  it("201 creates history entry", async () => {
    addVolunteerHistory.mockResolvedValueOnce({ id: "vh-new" });
    const res = await request(app())
      .post("/api/volunteer-history")
      .send({ payload: 1 })
      .expect(201);
    expect(addVolunteerHistory).toHaveBeenCalledWith({ payload: 1 });
    expect(res.body).toEqual({ data: { id: "vh-new" } });
  });

  it("500 on non-Error thrown", async () => {
    addVolunteerHistory.mockRejectedValueOnce(123);
    const res = await request(app())
      .post("/api/volunteer-history")
      .send({})
      .expect(500);
    expect(res.body).toEqual({ error: "Unexpected server error." });
  });
});

describe("POST /api/volunteer-history/reset", () => {
  it("204 with array seed", async () => {
    resetVolunteerHistory.mockResolvedValueOnce();
    await request(app())
      .post("/api/volunteer-history/reset")
      .send([{ id: "x" }])
      .expect(204);
    expect(resetVolunteerHistory).toHaveBeenCalledWith([{ id: "x" }]);
  });

  it("204 with non-array coerced to []", async () => {
    resetVolunteerHistory.mockResolvedValueOnce();
    await request(app())
      .post("/api/volunteer-history/reset")
      .send({ junk: true })
      .expect(204);
    expect(resetVolunteerHistory).toHaveBeenCalledWith([]);
  });
});

it("sorts by assignment and status keys", async () => {
  listVolunteerHistory
    .mockResolvedValue([
      { id: "1", volunteerName: "Zoe",  assignment: "B-Task", location: "X", status: "Registered", eventDate: "2025-01-02" },
      { id: "2", volunteerName: "Ava",  assignment: "A-Task", location: "X", status: "Attended",  eventDate: "2025-01-01" },
      { id: "3", volunteerName: "Mila", assignment: "C-Task", location: "X", status: "No Show",   eventDate: "2025-01-03" },
    ]);

  const byAssignment = await request(app())
    .get("/api/volunteer-history")
    .query({ sortKey: "assignment", sortDir: "asc" })
    .expect(200);

  expect(byAssignment.body.data.items.map(i => i.assignment))
    .toEqual(["A-Task","B-Task","C-Task"]);

  const byStatusDesc = await request(app())
    .get("/api/volunteer-history")
    .query({ sortKey: "status", sortDir: "desc" })
    .expect(200);

  expect(byStatusDesc.body.data.items.map(i => i.status))
    .toEqual(["Registered","No Show","Attended"]);
});
