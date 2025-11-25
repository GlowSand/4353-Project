import { describe, it, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyMock: vi.fn(),
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: (...args) => mocks.verifyMock(...args),
  },
}));

import { authenticate, requireRole, auth as basicAuth } from "../authenticate.js";

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authenticate middleware", () => {
  it("rejects when header missing", () => {
    const res = createRes();
    authenticate({ headers: {} }, res, vi.fn());
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/authentication required/i);
  });

  it("stores user on valid token", () => {
    const next = vi.fn();
    const req = { headers: { authorization: "Bearer token" } };
    mocks.verifyMock.mockReturnValueOnce({ userId: "u1", role: "admin" });

    authenticate(req, createRes(), next);
    expect(req.user).toEqual({ userId: "u1", role: "admin" });
    expect(next).toHaveBeenCalled();
  });

  it("handles expired token", () => {
    const res = createRes();
    mocks.verifyMock.mockImplementationOnce(() => {
      const err = new Error("expired");
      err.name = "TokenExpiredError";
      throw err;
    });

    authenticate({ headers: { authorization: "Bearer expired" } }, res, vi.fn());
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/expired/i);
  });

  it("handles invalid token", () => {
    const res = createRes();
    mocks.verifyMock.mockImplementationOnce(() => {
      throw new Error("bad");
    });

    authenticate({ headers: { authorization: "Bearer nope" } }, res, vi.fn());
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/invalid token/i);
  });
});

describe("requireRole middleware", () => {
  it("401s when user missing", () => {
    const handler = requireRole("admin");
    const res = createRes();
    handler({ }, res, vi.fn());
    expect(res.statusCode).toBe(401);
  });

  it("403s for insufficient role", () => {
    const handler = requireRole("admin");
    const res = createRes();
    handler({ user: { role: "user" } }, res, vi.fn());
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/insufficient/i);
  });

  it("passes through on allowed role", () => {
    const handler = requireRole("admin", "manager");
    const next = vi.fn();
    handler({ user: { role: "manager" } }, createRes(), next);
    expect(next).toHaveBeenCalled();
  });
});

describe("basic auth helper", () => {
  it("401s without header", () => {
    const res = createRes();
    basicAuth({ headers: {} }, res, vi.fn());
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("calls next with header", () => {
    const next = vi.fn();
    basicAuth({ headers: { authorization: "abc" } }, createRes(), next);
    expect(next).toHaveBeenCalled();
  });
});
