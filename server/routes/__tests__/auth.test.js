import { describe, it, beforeEach, vi, expect } from "vitest";
import express from "express";
import request from "supertest";

const prismaMock = {
  userCredentials: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

const bcryptMock = {
  hash: vi.fn(),
  compare: vi.fn(),
};

const jwtMock = {
  sign: vi.fn(() => "signed-token"),
};

vi.mock("../../db.js", () => ({ default: prismaMock }));
vi.mock("bcrypt", () => ({ default: bcryptMock }));
vi.mock("jsonwebtoken", () => ({ default: jwtMock }));

async function makeApp() {
  const routerModule = await import("../auth.js");
  const app = express();
  app.use(express.json());
  app.use("/api/auth", routerModule.auth);
  return app;
}

const validBody = { email: "user@example.com", password: "supersecret" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/register", () => {
  it("rejects invalid payload", async () => {
    const res = await request(await makeApp())
      .post("/api/auth/register")
      .send({ email: "", password: "short" })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
    expect(prismaMock.userCredentials.findUnique).not.toHaveBeenCalled();
  });

  it("creates user and returns token", async () => {
    prismaMock.userCredentials.findUnique.mockResolvedValueOnce(null);
    bcryptMock.hash.mockResolvedValueOnce("hashed");
    prismaMock.userCredentials.create.mockResolvedValueOnce({ userId: validBody.email });

    const res = await request(await makeApp())
      .post("/api/auth/register")
      .send(validBody)
      .expect(201);

    expect(prismaMock.userCredentials.create).toHaveBeenCalledWith({
      data: { userId: validBody.email, password: "hashed" },
    });
    expect(jwtMock.sign).toHaveBeenCalledWith(
      { userId: validBody.email, role: "user" },
      expect.any(String),
      { expiresIn: "7d" },
    );
    expect(res.body.data).toMatchObject({ email: validBody.email, token: "signed-token" });
  });

  it("409s when user already exists", async () => {
    prismaMock.userCredentials.findUnique.mockResolvedValueOnce({ userId: validBody.email });

    const res = await request(await makeApp())
      .post("/api/auth/register")
      .send(validBody)
      .expect(409);

    expect(res.body.message).toMatch(/already exists/i);
    expect(prismaMock.userCredentials.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/login", () => {
  it("returns 400 when email/password missing", async () => {
    const res = await request(await makeApp())
      .post("/api/auth/login")
      .send({ email: "" })
      .expect(400);

    expect(res.body.errors).toContain("Email and password are required");
  });

  it("returns 401 when user missing", async () => {
    prismaMock.userCredentials.findUnique.mockResolvedValueOnce(null);

    const res = await request(await makeApp())
      .post("/api/auth/login")
      .send(validBody)
      .expect(401);

    expect(res.body.errors).toContain("Invalid email or password");
  });

  it("returns token on success", async () => {
    prismaMock.userCredentials.findUnique.mockResolvedValueOnce({ userId: validBody.email, password: "hashed" });
    bcryptMock.compare.mockResolvedValueOnce(true);

    const res = await request(await makeApp())
      .post("/api/auth/login")
      .send(validBody)
      .expect(200);

    expect(bcryptMock.compare).toHaveBeenCalledWith(validBody.password, "hashed");
    expect(res.body.data).toEqual({ email: validBody.email, token: "signed-token" });
  });
});

describe("PUT /api/auth/change-password", () => {
  const payload = {
    email: validBody.email,
    currentPassword: "old-pass",
    newPassword: "new-password",
  };

  it("validates required fields", async () => {
    const res = await request(await makeApp())
      .put("/api/auth/change-password")
      .send({ email: "", currentPassword: "", newPassword: "" })
      .expect(400);

    expect(res.body.errors).toContain("Email, currentPassword, and newPassword are required");
  });

  it("401s when current password mismatch", async () => {
    prismaMock.userCredentials.findUnique.mockResolvedValueOnce({ userId: payload.email, password: "hashed-old" });
    bcryptMock.compare.mockResolvedValueOnce(false);

    const res = await request(await makeApp())
      .put("/api/auth/change-password")
      .send(payload)
      .expect(401);

    expect(res.body.errors).toContain("Current password is incorrect");
    expect(prismaMock.userCredentials.update).not.toHaveBeenCalled();
  });

  it("updates password on success", async () => {
    prismaMock.userCredentials.findUnique.mockResolvedValueOnce({ userId: payload.email, password: "hashed-old" });
    bcryptMock.compare.mockResolvedValueOnce(true);
    bcryptMock.hash.mockResolvedValueOnce("hashed-new");
    prismaMock.userCredentials.update.mockResolvedValueOnce({});

    const res = await request(await makeApp())
      .put("/api/auth/change-password")
      .send(payload)
      .expect(200);

    expect(res.body.message).toMatch(/success/i);
    expect(prismaMock.userCredentials.update).toHaveBeenCalledWith({
      where: { userId: payload.email },
      data: { password: "hashed-new" },
    });
  });
});
