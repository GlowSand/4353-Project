import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";


const hoisted = vi.hoisted(() => {
  return {
    prisma: {
      userProfile: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
    storeFns: {
      upsertVolunteers: vi.fn(),
      listProfiles: vi.fn(() => []),
      removeVolunteer: vi.fn(),
      clearProfiles: vi.fn(),
    },
  };
});


vi.mock("../../db.js", () => ({ default: hoisted.prisma }));
vi.mock("../../store.memory.DEAD.js", () => ({ store: hoisted.storeFns }));
vi.mock("../../shared.js", async (orig) => {
  const actual = await orig();
  return {
    ...actual,
    toUniqueSkills: (arr) => (Array.isArray(arr) ? [...new Set(arr)] : []),
  };
});


import profileRouter from "../profile.js";

function app() {
  const a = express();
  a.use(express.json());
  a.use("/profiles", profileRouter);
  return a;
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.clearAllMocks();
});

describe("profiles router – extra branches", () => {
  it("GET /profiles happy path", async () => {
    hoisted.prisma.userProfile.findMany.mockResolvedValueOnce([
      {
        userId: "u1",
        fullName: "Alex",
        address1: "a",
        address2: "",
        city: "Austin",
        state: "TX",
        zipCode: "73301",
        skills: ["x"],
        preferences: "",
        availability: ["Mon"],
        createdAt: new Date().toISOString(),
      },
    ]);

    const res = await request(app()).get("/profiles").expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);
  });

  it("GET /profiles 500 path", async () => {
    hoisted.prisma.userProfile.findMany.mockRejectedValueOnce(new Error("boom"));
    const res = await request(app()).get("/profiles").expect(500);
    expect(res.body.success).toBe(false);
  });

  it("GET /profiles/:userId 500 path", async () => {
    hoisted.prisma.userProfile.findUnique.mockRejectedValueOnce(new Error("db"));
    const res = await request(app()).get("/profiles/u1").expect(500);
    expect(res.body.success).toBe(false);
  });

  it("POST /profiles/:userId success (201)", async () => {
    hoisted.prisma.userProfile.findUnique.mockResolvedValueOnce(null);
    hoisted.prisma.userProfile.create.mockResolvedValueOnce({
      userId: "u9",
      fullName: "Bea",
      address1: "a",
      address2: null,
      city: "Austin",
      state: "TX",
      zipCode: "73301",
      skills: ["s1"],
      preferences: null,
      availability: ["Mon"],
    });

    const res = await request(app())
      .post("/profiles/u9")
      .send({
        fullName: "Bea",
        location: { address1: "a", address2: "", city: "Austin", state: "TX", zipCode: "73301" },
        skills: ["s1"],
        availability: ["Mon"],
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(hoisted.storeFns.upsertVolunteers).toHaveBeenCalled();
  });

  it("PUT /profiles/:userId 404 path (not found)", async () => {
    hoisted.prisma.userProfile.findUnique.mockResolvedValueOnce(null);
    await request(app()).put("/profiles/missing").send({ fullName: "X" }).expect(404);
  });

  it("PUT /profiles/:userId 500 path (update throws)", async () => {
    hoisted.prisma.userProfile.findUnique.mockResolvedValueOnce({ userId: "u2" });
    hoisted.prisma.userProfile.update.mockRejectedValueOnce(new Error("db"));
    const res = await request(app())
      .put("/profiles/u2")
      .send({
        fullName: "Q",
        location: { address1: "a", address2: null, city: "c", state: "TX", zipCode: "73301" },
        skills: ["s"],
        availability: ["Mon"],
      })
      .expect(500);
    expect(res.body.success).toBe(false);
  });

  it("DELETE /profiles/:userId 500 path (delete throws)", async () => {
    hoisted.prisma.userProfile.findUnique.mockResolvedValueOnce({ userId: "u3" });
    hoisted.prisma.userProfile.delete.mockRejectedValueOnce(new Error("db"));
    const res = await request(app()).delete("/profiles/u3").expect(500);
    expect(res.body.success).toBe(false);
  });
});
