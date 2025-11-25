import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";


vi.mock("@prisma/client", () => {
  const prismaMock = {
    notice: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    assignment: {
      findMany: vi.fn(),
    },
  };
  const PrismaClient = vi.fn(() => prismaMock);
  return { PrismaClient, prismaMock };
});

import { prismaMock } from "@prisma/client";

function fixedNow(ms = Date.UTC(2099, 0, 1, 12, 0, 0)) {
  vi.spyOn(Date, "now").mockReturnValue(ms);
  return ms;
}

function futureDateISO(daysFromNow = 1) {
  const ms = Date.now() + daysFromNow * 24 * 3600 * 1000;
  return new Date(ms).toISOString();
}


async function freshModule() {
  vi.resetModules();
  return await import("../notifications.js");
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  fixedNow();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("services/notifications getPrisma singleton", () => {
  it("returns the same instance and constructs PrismaClient once", async () => {
    const mod = await freshModule();
    const a = mod.getPrisma();
    const b = mod.getPrisma();
    expect(a).toBe(b);
    
    const { PrismaClient } = await import("@prisma/client");
    expect(PrismaClient).toHaveBeenCalledTimes(1);
  });
});

describe("notify()", () => {
  it("creates notice, serializes bigint createdAtMs, and emits on bus", async () => {
    const { notify, bus } = await freshModule();

    prismaMock.notice.create.mockResolvedValueOnce({
      id: "n1",
      volunteerId: "u1",
      title: "T",
      body: "B",
      type: "info",
      createdAtMs: 123n, 
    });

    const handler = vi.fn();
    bus.on("notice:u1", handler);

    const out = await notify("u1", { title: "T", body: "B" });

    expect(prismaMock.notice.create).toHaveBeenCalledWith({
      data: { volunteerId: "u1", title: "T", body: "B", type: "info" },
    });

    
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toEqual({
      id: "n1",
      volunteerId: "u1",
      title: "T",
      body: "B",
      type: "info",
      createdAtMs: 123, 
    });

    
    expect(out).toEqual({
      id: "n1",
      volunteerId: "u1",
      title: "T",
      body: "B",
      type: "info",
      createdAtMs: 123,
    });

    bus.off("notice:u1", handler);
  });
});

describe("startReminders()", () => {
 it("runs an initial tick, dedupes recent notices, and sends warn notices for upcoming events", async () => {
  
  vi.useRealTimers();

  const { startReminders, bus } = await freshModule();

  
  const soonISO = futureDateISO(1);
  prismaMock.assignment.findMany.mockResolvedValueOnce([
    {
      volunteerId: "u1",
      event: { eventName: "Cleanup", location: "Park", eventDate: soonISO },
    },
    {
      volunteerId: "u2",
      event: { eventName: "Orientation", location: "HQ", eventDate: soonISO },
    },
    { volunteerId: "u3", event: null }, 
  ]);

  
  prismaMock.notice.findFirst
    .mockResolvedValueOnce(null)                 
    .mockResolvedValueOnce({ id: "recent-u2" }); 

  
  prismaMock.notice.create.mockResolvedValueOnce({
    id: "nu1",
    volunteerId: "u1",
    title: "Reminder: Cleanup tomorrow",
    body: `Park • ${soonISO}`,
    type: "warn",
    createdAtMs: 1000n,
  });

  const received = [];
  const handlerU1 = (p) => received.push(p);
  bus.on("notice:u1", handlerU1);

  const interval = startReminders(); 

  
  
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 5 && prismaMock.notice.create.mock.calls.length === 0; i++) {
    await sleep(0);
  }

  
  expect(prismaMock.assignment.findMany).toHaveBeenCalledTimes(1);

  
  expect(prismaMock.notice.create).toHaveBeenCalledWith({
    data: {
      volunteerId: "u1",
      title: "Reminder: Cleanup tomorrow",
      body: `Park • ${soonISO}`,
      type: "warn",
    },
  });
  expect(received).toHaveLength(1);
  expect(received[0]).toMatchObject({ volunteerId: "u1", type: "warn" });

  
  const createdArgs = prismaMock.notice.create.mock.calls.map((call) => call[0]);
  expect(createdArgs.some((arg) => arg?.data?.volunteerId === "u2")).toBe(false);

  
  clearInterval(interval);
  bus.off("notice:u1", handlerU1);
});
});

it("startReminders swallows errors thrown inside notify()", async () => {
  vi.useRealTimers();
  const { startReminders } = await (await import("../notifications.js"));

  const soonISO = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  const { prismaMock } = await import("@prisma/client");
  prismaMock.assignment.findMany.mockResolvedValueOnce([
    { volunteerId: "u1", event: { eventName: "X", location: "Y", eventDate: soonISO } },
  ]);
  prismaMock.notice.findFirst.mockResolvedValueOnce(null);
  
  prismaMock.notice.create.mockRejectedValueOnce(new Error("create-fail"));

  const interval = startReminders();
  
  await new Promise((r) => setTimeout(r, 0));
  clearInterval(interval);
  
});

it("notify serializes number createdAtMs and null body via ??", async () => {
  const { notify, bus } = await (await import("../notifications.js"));

  const { prismaMock } = await import("@prisma/client");
  
  prismaMock.notice.create.mockResolvedValueOnce({
    id: "n2",
    volunteerId: "u2",
    title: "Hi",
    body: undefined,
    type: "info",
    createdAtMs: 456, 
  });

  const received = [];
  const handler = (p) => received.push(p);
  bus.on("notice:u2", handler);

  const out = await notify("u2", { title: "Hi" }); 

  expect(out).toEqual({
    id: "n2",
    volunteerId: "u2",
    title: "Hi",
    body: null,       
    type: "info",
    createdAtMs: 456, 
  });

  
  expect(received).toHaveLength(1);
  expect(received[0]).toEqual(out);

  bus.off("notice:u2", handler);
});
