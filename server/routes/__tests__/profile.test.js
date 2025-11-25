import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";


vi.mock("../../db.js", () => ({
  default: {
    userProfile: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("../../shared.js", () => {
  const toUniqueSkills = vi.fn((arr) => Array.from(new Set(arr)));
  return { toUniqueSkills };
});

vi.mock("../../store.memory.DEAD.js", () => {
  const store = {
    listProfiles: vi.fn(() => []),
    removeVolunteer: vi.fn(),
    clearProfiles: vi.fn(),
    upsertVolunteers: vi.fn(),
  };
  return { store };
});


import prisma from "../../db.js";
import { store as storeMock } from "../../store.memory.DEAD.js";
import profileRouter from "../profile.js";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/profiles", profileRouter);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /profiles", () => {
  it("returns all profiles formatted", async () => {
    prisma.userProfile.findMany.mockResolvedValueOnce([
      {
        userId: "u1",
        fullName: "Alex",
        address1: "A1",
        address2: "A2",
        city: "Austin",
        state: "TX",
        zipCode: "73301",
        skills: ["a", "b"],
        preferences: "none",
        availability: ["Mon"],
      },
    ]);

    const res = await request(makeApp()).get("/profiles").expect(200);
    expect(prisma.userProfile.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0]).toEqual({
      userId: "u1",
      fullName: "Alex",
      location: {
        address1: "A1",
        address2: "A2",
        city: "Austin",
        state: "TX",
        zipCode: "73301",
      },
      skills: ["a", "b"],
      preferences: "none",
      availability: ["Mon"],
    });
  });
});

describe("GET /profiles/:userId", () => {
  it("400 when userId is blank", async () => {
    const res = await request(makeApp()).get("/profiles/%20%20%20").expect(400);
    expect(res.body.errors).toContain("userId parameter cannot be empty");
  });

  it("404 when not found", async () => {
    prisma.userProfile.findUnique.mockResolvedValueOnce(null);
    const res = await request(makeApp()).get("/profiles/u-miss").expect(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it("200 when found", async () => {
    prisma.userProfile.findUnique.mockResolvedValueOnce({
      userId: "u2",
      fullName: "Bea",
      address1: "B1",
      address2: null,
      city: "Boston",
      state: "MA",
      zipCode: "02118",
      skills: ["x"],
      preferences: null,
      availability: ["Tue"],
    });
    const res = await request(makeApp()).get("/profiles/u2").expect(200);
    expect(res.body.data.userId).toBe("u2");
    expect(res.body.data.location.city).toBe("Boston");
  });
});

describe("POST /profiles/:userId", () => {
  const validBody = {
    fullName: "Casey",
    location: {
      address1: "123 Main",
      address2: "",
      city: "Chicago",
      state: "il",
      zipCode: "60601",
    },
    skills: [" js ", "node", "js"],
    preferences: "  prefers backend ",
    availability: [" mon ", "tue "],
  };

  it("409 when profile exists", async () => {
    prisma.userProfile.findUnique.mockResolvedValueOnce({ userId: "u3" });
    const res = await request(makeApp())
      .post("/profiles/u3")
      .send(validBody)
      .expect(409);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("400 on validation failure", async () => {
    prisma.userProfile.findUnique.mockResolvedValueOnce(null);
    const bad = { ...validBody, location: null };
    const res = await request(makeApp())
      .post("/profiles/u4")
      .send(bad)
      .expect(400);
    expect(res.body.message).toBe("Validation failed");
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it("201 on success, normalizes input, syncs volunteer", async () => {
    prisma.userProfile.findUnique.mockResolvedValueOnce(null);
    prisma.userProfile.create.mockResolvedValueOnce({
      userId: "u5",
      fullName: "Casey",
      address1: "123 Main",
      address2: undefined,
      city: "Chicago",
      state: "IL",
      zipCode: "60601",
      skills: ["js", "node"],
      preferences: "prefers backend",
      availability: ["mon", "tue"],
    });

    const res = await request(makeApp())
      .post("/profiles/u5")
      .send(validBody)
      .expect(201);

    expect(prisma.userProfile.create).toHaveBeenCalledWith({
      data: {
        userId: "u5",
        fullName: "Casey",
        address1: "123 Main",
        address2: undefined,
        city: "Chicago",
        state: "IL",
        zipCode: "60601",
        skills: ["js", "node"],
        preferences: "prefers backend",
        availability: ["mon", "tue"],
      },
    });

    expect(storeMock.upsertVolunteers).toHaveBeenCalledTimes(1);
    expect(res.body.success).toBe(true);
    expect(res.body.data.userId).toBe("u5");
  });
});

describe("PUT /profiles/:userId", () => {
  it("404 when profile missing", async () => {
    prisma.userProfile.findUnique.mockResolvedValueOnce(null);
    await request(makeApp())
      .put("/profiles/u-miss")
      .send({ fullName: "New" })
      .expect(404);
  });

  it("400 on validation error", async () => {
    prisma.userProfile.findUnique.mockResolvedValueOnce({ userId: "u6" });
    const res = await request(makeApp())
      .put("/profiles/u6")
      .send({ fullName: "" })
      .expect(400);
    expect(res.body.message).toBe("Validation failed");
  });

  it("200 on success and syncs volunteer", async () => {
    prisma.userProfile.findUnique.mockResolvedValueOnce({ userId: "u7" });
    prisma.userProfile.update.mockResolvedValueOnce({
      userId: "u7",
      fullName: "New Name",
      address1: "A1",
      address2: null,
      city: "Denver",
      state: "CO",
      zipCode: "80202",
      skills: ["go"],
      preferences: null,
      availability: ["Wed"],
    });

    const res = await request(makeApp())
      .put("/profiles/u7")
      .send({
        fullName: " New Name ",
        location: {
          address1: " A1 ",
          address2: null,
          city: " Denver ",
          state: " co ",
          zipCode: "80202",
        },
        skills: [" go "],
        availability: [" Wed "],
      })
      .expect(200);

    expect(prisma.userProfile.update).toHaveBeenCalledWith({
      where: { userId: "u7" },
      data: {
        fullName: "New Name",
        address1: "A1",
        address2: null,
        city: "Denver",
        state: "CO",
        zipCode: "80202",
        skills: ["go"],
        availability: ["Wed"],
      },
    });
    expect(storeMock.upsertVolunteers).toHaveBeenCalledTimes(1);
    expect(res.body.data.fullName).toBe("New Name");
  });
});

describe("DELETE /profiles/:userId", () => {
  it("404 when profile missing", async () => {
    prisma.userProfile.findUnique.mockResolvedValueOnce(null);
    await request(makeApp()).delete("/profiles/u9").expect(404);
  });

  it("200 on success", async () => {
    prisma.userProfile.findUnique.mockResolvedValueOnce({ userId: "u9" });
    prisma.userProfile.delete.mockResolvedValueOnce({});
    const res = await request(makeApp()).delete("/profiles/u9").expect(200);
    expect(prisma.userProfile.delete).toHaveBeenCalledWith({
      where: { userId: "u9" },
    });
    expect(res.body.message).toMatch(/deleted/i);
  });
});
