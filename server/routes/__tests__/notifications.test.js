import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";


vi.mock("@prisma/client", () => {
  const prismaMock = {
    notice: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  };
  const PrismaClient = vi.fn(() => prismaMock);
  return { PrismaClient, prismaMock };
});

vi.mock("../../services/notifications.js", () => {
  const bus = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };
  return { bus };
});


import { prismaMock } from "@prisma/client";
import { bus } from "../../services/notifications.js";
import { notifications as router } from "../notifications.js";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/notifications", router);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /notifications/list/:volId", () => {
  it("lists notices and serializes output", async () => {
    prismaMock.notice.findMany.mockResolvedValueOnce([
      {
        id: "n1",
        volunteerId: "u1",
        title: "Welcome",
        body: null,
        type: "info",
        createdAtMs: "1700000000000", 
      },
      {
        id: "n2",
        volunteerId: "u1",
        title: "Assigned",
        body: "Report 9am",
        type: "success",
        createdAtMs: 1700000001000,
      },
    ]);

    const res = await request(makeApp())
      .get("/notifications/list/u1")
      .expect(200);

    expect(prismaMock.notice.findMany).toHaveBeenCalledWith({
      where: { volunteerId: "u1" },
      orderBy: { createdAtMs: "asc" },
    });

    expect(res.body).toEqual([
      {
        id: "n1",
        volunteerId: "u1",
        title: "Welcome",
        body: null,
        type: "info",
        createdAtMs: 1700000000000,
      },
      {
        id: "n2",
        volunteerId: "u1",
        title: "Assigned",
        body: "Report 9am",
        type: "success",
        createdAtMs: 1700000001000,
      },
    ]);
  });

  it("500 on prisma failure", async () => {
    prismaMock.notice.findMany.mockRejectedValueOnce(new Error("boom"));
    const res = await request(makeApp())
      .get("/notifications/list/u1")
      .expect(500);
    expect(res.body).toEqual({ error: "failed_to_list_notices" });
  });
});

describe("DELETE /notifications/clear/:volId", () => {
  it("clears all for volunteer", async () => {
    prismaMock.notice.deleteMany.mockResolvedValueOnce({ count: 2 });
    const res = await request(makeApp())
      .delete("/notifications/clear/u2")
      .expect(200);
    expect(prismaMock.notice.deleteMany).toHaveBeenCalledWith({
      where: { volunteerId: "u2" },
    });
    expect(res.body).toEqual({ ok: true });
  });

  it("500 on prisma failure", async () => {
    prismaMock.notice.deleteMany.mockRejectedValueOnce(new Error("boom"));
    const res = await request(makeApp())
      .delete("/notifications/clear/u2")
      .expect(500);
    expect(res.body).toEqual({ error: "failed_to_clear_notices" });
  });
});

describe("POST /notifications/send", () => {
  it("400 when required fields missing", async () => {
    await request(makeApp()).post("/notifications/send").send({}).expect(400);
  });

  it("creates notice, normalizes type, emits bus, returns payload", async () => {
    prismaMock.notice.create.mockResolvedValueOnce({
      id: "n3",
      volunteerId: "u3",
      title: "Heads up",
      body: "Be on time",
      type: "info",
      createdAtMs: 1700000002222,
    });

    const res = await request(makeApp())
      .post("/notifications/send")
      .send({ volunteerId: "u3", title: "Heads up", body: "Be on time", type: "weird" }) 
      .expect(200);

    expect(prismaMock.notice.create).toHaveBeenCalledWith({
      data: { volunteerId: "u3", title: "Heads up", body: "Be on time", type: undefined },
    });

    expect(bus.emit).toHaveBeenCalledWith(
      "notice:u3",
      {
        id: "n3",
        volunteerId: "u3",
        title: "Heads up",
        body: "Be on time",
        type: "info",
        createdAtMs: 1700000002222,
      },
    );

    expect(res.body).toEqual({
      id: "n3",
      volunteerId: "u3",
      title: "Heads up",
      body: "Be on time",
      type: "info",
      createdAtMs: 1700000002222,
    });
  });

  it("500 on prisma failure", async () => {
    prismaMock.notice.create.mockRejectedValueOnce(new Error("boom"));
    const res = await request(makeApp())
      .post("/notifications/send")
      .send({ volunteerId: "u3", title: "X" })
      .expect(500);
    expect(res.body).toEqual({ error: "failed_to_create_notice" });
  });
});

describe("GET /notifications/stream/:volId", () => {
  
  function getHandler(method, path) {
    for (const layer of router.stack) {
      if (layer.route && layer.route.path === path && layer.route.methods[method]) {
        return layer.route.stack[0].handle;
      }
    }
    throw new Error("handler not found");
  }

  it("seeds existing notices and subscribes to bus", async () => {
    const handler = getHandler("get", "/stream/:volId");

    prismaMock.notice.findMany.mockResolvedValueOnce([
      { id: "n1", volunteerId: "u4", title: "T1", body: null, type: "info", createdAtMs: 1 },
      { id: "n2", volunteerId: "u4", title: "T2", body: "B", type: "success", createdAtMs: 2 },
    ]);

    const req = {
      params: { volId: "u4" },
      on: vi.fn((evt, fn) => {
        if (evt === "close") req._close = fn;
      }),
    };

    const res = {
      setHeader: vi.fn(),
      flushHeaders: vi.fn(),
      write: vi.fn(),
    };

    await handler(req, res);

    expect(prismaMock.notice.findMany).toHaveBeenCalledWith({
      where: { volunteerId: "u4" },
      orderBy: { createdAtMs: "asc" },
    });
    
    expect(res.write).toHaveBeenCalledTimes(2);
    expect(bus.on).toHaveBeenCalledWith(
      "notice:u4",
      expect.any(Function),
    );

    
    req._close?.();
    expect(bus.off).toHaveBeenCalledWith("notice:u4", expect.any(Function));
  });
});

it("stream tolerates initial findMany failure and still subscribes", async () => {
  
  function getHandler(method, path) {
    for (const layer of router.stack) {
      if (layer.route && layer.route.path === path && layer.route.methods[method]) {
        return layer.route.stack[0].handle;
      }
    }
    throw new Error("handler not found");
  }
  const handler = getHandler("get", "/stream/:volId");

  
  prismaMock.notice.findMany.mockRejectedValueOnce(new Error("boom"));

  const req = {
    params: { volId: "uX" },
    on: vi.fn((evt, fn) => {
      if (evt === "close") req._close = fn;
    }),
  };
  const res = { setHeader: vi.fn(), flushHeaders: vi.fn(), write: vi.fn() };

  await handler(req, res);

  
  expect(bus.on).toHaveBeenCalledWith("notice:uX", expect.any(Function));
  
  expect(res.write).not.toHaveBeenCalled();

  
  req._close?.();
  expect(bus.off).toHaveBeenCalledWith("notice:uX", expect.any(Function));
});
