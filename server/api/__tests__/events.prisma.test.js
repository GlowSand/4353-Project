import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../db.js", () => ({
  default: {
    eventDetails: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    volunteerHistory: {
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("../../shared.js", () => {
  const ensureEventPayload = vi.fn((x) => x);
  const EVENT_URGENCY_OPTIONS = ["low", "medium", "high"];
  const generateId = vi.fn(() => "event_gen_id");
  const toUniqueSkills = vi.fn((arr) => Array.from(new Set(arr)));
  return {
    ensureEventPayload,
    EVENT_URGENCY_OPTIONS,
    generateId,
    toUniqueSkills,
  };
});

import prisma from "../../db.js";
import {
  ensureEventPayload,
  EVENT_URGENCY_OPTIONS,
  generateId,
  toUniqueSkills,
} from "../../shared.js";

import {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  resetEvents,
  EVENT_URGENCY_OPTIONS as EXPORTED_URGENCY,
} from "../events.prisma.js";

function row(overrides = {}) {
  return {
    id: "e1",
    eventName: "Cleanup",
    description: "Park cleanup",
    location: "Central Park",
    requiredSkills: ["gloves", "gloves", "trash-bags"],
    urgency: "medium",
    eventDate: new Date("2025-02-03T12:34:56.000Z"),
    ...overrides,
  };
}

function safePayload(overrides = {}) {
  return {
    name: "Cleanup",
    description: "Park cleanup",
    location: "Central Park",
    requiredSkills: ["gloves", "trash-bags"],
    urgency: "medium",
    eventDate: "2025-02-03",
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.clearAllMocks());

describe("exports", () => {
  it("re-exports EVENT_URGENCY_OPTIONS", () => {
    expect(EXPORTED_URGENCY).toEqual(EVENT_URGENCY_OPTIONS);
  });
});

describe("listEvents", () => {
  it("maps events", async () => {
    prisma.eventDetails.findMany.mockResolvedValue([
      row({ id: "a", eventDate: new Date("2025-03-01T00:00:00Z") }),
      row({ id: "b", eventDate: new Date("2025-02-01T00:00:00Z") }),
    ]);
    const out = await listEvents();
    expect(prisma.eventDetails.findMany).toHaveBeenCalledWith({
      orderBy: { eventDate: "desc" },
    });
    expect(out[0].eventDate).toBe("2025-03-01");
    expect(out[1].eventDate).toBe("2025-02-01");
  });

  it("handles non-array requiredSkills", async () => {
    prisma.eventDetails.findMany.mockResolvedValue([row({ requiredSkills: null })]);
    const out = await listEvents();
    expect(toUniqueSkills).toHaveBeenCalledWith([]);
    expect(out[0].requiredSkills).toEqual([]);
  });
});

describe("createEvent", () => {
  it("validates payload and maps result", async () => {
    const safe = safePayload();
    ensureEventPayload.mockImplementationOnce(() => safe);
    prisma.eventDetails.create.mockResolvedValue(
      row({
        id: "new-id",
        eventName: safe.name,
        eventDate: new Date("2025-02-03T00:00:00.000Z"),
      }),
    );
    const out = await createEvent({});
    expect(prisma.eventDetails.create).toHaveBeenCalled();
    expect(out.id).toBe("new-id");
    expect(out.name).toBe(safe.name);
  });
});

describe("updateEvent", () => {
  it("updates and maps result", async () => {
    const safe = safePayload({ name: "Updated" });
    ensureEventPayload.mockImplementationOnce(() => safe);
    prisma.eventDetails.update.mockResolvedValue(
      row({ id: "e123", eventName: "Updated" }),
    );
    const out = await updateEvent("e123", {});
    expect(prisma.eventDetails.update).toHaveBeenCalled();
    expect(out.name).toBe("Updated");
  });
});

describe("deleteEvent", () => {
  it("deletes by id", async () => {
    prisma.eventDetails.delete.mockResolvedValue({});
    await deleteEvent("xyz");
    expect(prisma.eventDetails.delete).toHaveBeenCalledWith({ where: { id: "xyz" } });
  });
});

describe("resetEvents", () => {
  it("clears and seeds items", async () => {
    const seed = [
      { id: "evt-1", ...safePayload({ name: "A" }) },
      { ...safePayload({ name: "B" }) },
    ];
    prisma.eventDetails.create.mockResolvedValue({});
    await resetEvents(seed);
    expect(prisma.volunteerHistory.deleteMany).toHaveBeenCalled();
    expect(prisma.eventDetails.deleteMany).toHaveBeenCalled();
    expect(prisma.eventDetails.create).toHaveBeenCalledTimes(2);
  });
});
