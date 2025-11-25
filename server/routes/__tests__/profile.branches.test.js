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

describe("profiles router – branch coverage", () => {
  it("GET /profiles/:userId returns 400 when userId is empty/whitespace", async () => {
    await request(makeApp()).get("/profiles/%20").expect(400);
  });

  describe("POST /profiles/:userId validation branches", () => {
    beforeEach(() => {
      hoisted.prisma.userProfile.findUnique.mockResolvedValue(null); 
    });

    it("400 when skills is not an array", async () => {
      const res = await request(makeApp())
        .post("/profiles/u1")
        .send({
          fullName: "Alex",
          location: { address1: "a", address2: "", city: "c", state: "TX", zipCode: "73301" },
          skills: "not-array",
          availability: ["Mon"],
        })
        .expect(400);

      expect(res.body.errors.join(" ")).toMatch(/skills must be an array/i);
    });

    it("400 when address2 is provided but not a string", async () => {
      const res = await request(makeApp())
        .post("/profiles/u1")
        .send({
          fullName: "Alex",
          location: { address1: "a", address2: 123, city: "c", state: "TX", zipCode: "73301" },
          skills: ["x"],
          availability: ["Mon"],
        })
        .expect(400);

      expect(res.body.errors.join(" ")).toMatch(/address2 must be a string/i);
    });

    it("400 when preferences is not a string", async () => {
      const res = await request(makeApp())
        .post("/profiles/u1")
        .send({
          fullName: "Alex",
          location: { address1: "a", address2: "", city: "c", state: "TX", zipCode: "73301" },
          skills: ["x"],
          preferences: { nope: true },
          availability: ["Mon"],
        })
        .expect(400);

      expect(res.body.errors.join(" ")).toMatch(/preferences must be a string/i);
    });

    it("400 when state code is not a valid 2-letter code", async () => {
      const res = await request(makeApp())
        .post("/profiles/u1")
        .send({
          fullName: "Alex",
          location: { address1: "a", address2: "", city: "c", state: "t", zipCode: "73301" },
          skills: ["x"],
          availability: ["Mon"],
        })
        .expect(400);
      expect(res.body.errors.join(" ")).toMatch(/2-letter uppercase code/i);
    });

    it("400 when availability is empty array", async () => {
      const res = await request(makeApp())
        .post("/profiles/u1")
        .send({
          fullName: "Alex",
          location: { address1: "a", address2: "", city: "c", state: "TX", zipCode: "73301" },
          skills: ["x"],
          availability: [],
        })
        .expect(400);

      expect(res.body.errors.join(" ")).toMatch(/availability must contain at least 1 item/i);
    });

    it("409 when profile already exists", async () => {
      hoisted.prisma.userProfile.findUnique.mockResolvedValueOnce({ userId: "u1" });
      await request(makeApp())
        .post("/profiles/u1")
        .send({
          fullName: "Alex",
          location: { address1: "a", address2: "", city: "c", state: "TX", zipCode: "73301" },
          skills: ["x"],
          availability: ["Mon"],
        })
        .expect(409);
    });
  });

  describe("PUT /profiles/:userId validation branches", () => {
    beforeEach(() => {
      hoisted.prisma.userProfile.findUnique.mockResolvedValue({ userId: "u2" });
    });

    it("400 when fullName provided but empty", async () => {
      const res = await request(makeApp())
        .put("/profiles/u2")
        .send({ fullName: "  " })
        .expect(400);

      expect(res.body.errors.join(" ")).toMatch(/fullName must be a non-empty string/i);
    });

    it("400 when location.address1 missing/empty", async () => {
      const res = await request(makeApp())
        .put("/profiles/u2")
        .send({
          location: { address1: "", address2: "", city: "c", state: "TX", zipCode: "73301" },
        })
        .expect(400);

      expect(res.body.errors.join(" ")).toMatch(/address1 is required and must be a non-empty string/i);
    });

    it("400 when state invalid and zip invalid", async () => {
      const res = await request(makeApp())
        .put("/profiles/u2")
        .send({
          location: { address1: "a", address2: "", city: "c", state: "t", zipCode: "bad" },
        })
        .expect(400);

      const msg = res.body.errors.join(" ");
      expect(msg).toMatch(/2-letter uppercase code/i);
      expect(msg).toMatch(/Zip code must be in format/i);
    });

    it("400 when availability is not an array and preferences not a string", async () => {
      const res = await request(makeApp())
        .put("/profiles/u2")
        .send({
          availability: "Mon",
          preferences: 123,
        })
        .expect(400);

      const msg = res.body.errors.join(" ");
      expect(msg).toMatch(/availability must be an array/i);
      expect(msg).toMatch(/preferences must be a string/i);
    });

    it("200 when partial valid update maps fields and syncs volunteer", async () => {
      hoisted.prisma.userProfile.update.mockResolvedValueOnce({
        userId: "u2",
        fullName: "Bea",
        address1: "a",
        address2: null,
        city: "c",
        state: "TX",
        zipCode: "73301",
        skills: ["s1", "s2"],
        preferences: null,
        availability: ["Mon"],
      });

      await request(makeApp())
        .put("/profiles/u2")
        .send({
          fullName: "Bea",
          location: { address1: "a", address2: null, city: "c", state: "tx", zipCode: "73301" },
          skills: ["s1", "s2"],
          preferences: "",
          availability: ["Mon"],
        })
        .expect(200);

      expect(hoisted.prisma.userProfile.update).toHaveBeenCalledWith({
        where: { userId: "u2" },
        data: {
          fullName: "Bea",
          address1: "a",
          address2: null,
          city: "c",
          state: "TX",
          zipCode: "73301",
          skills: ["s1", "s2"],
          preferences: null,
          availability: ["Mon"],
        },
      });

      expect(hoisted.storeFns.upsertVolunteers).toHaveBeenCalled();
    });
  });

  describe("DELETE /profiles/:userId", () => {
    it("404 when profile not found", async () => {
      hoisted.prisma.userProfile.findUnique.mockResolvedValueOnce(null);
      await request(makeApp()).delete("/profiles/u-missing").expect(404);
    });

    it("200 when delete succeeds", async () => {
      hoisted.prisma.userProfile.findUnique.mockResolvedValueOnce({ userId: "u3" });
      hoisted.prisma.userProfile.delete.mockResolvedValueOnce({});
      await request(makeApp()).delete("/profiles/u3").expect(200);
      expect(hoisted.prisma.userProfile.delete).toHaveBeenCalledWith({ where: { userId: "u3" } });
    });
  });
});
