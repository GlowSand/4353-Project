import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../db.js", () => ({
  default: {
    volunteerHistory: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    userProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    eventDetails: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("../../shared.js", () => {
  const PARTICIPATION_STATUSES = ["Registered", "Attended", "No Show"];
  const ensureVolunteerPayload = vi.fn((x) => x);
  const generateId = vi.fn((p) => `${p}_GEN`);
  return { PARTICIPATION_STATUSES, ensureVolunteerPayload, generateId };
});

import prisma from "../../db.js";
import {
  PARTICIPATION_STATUSES,
  ensureVolunteerPayload,
  generateId,
} from "../../shared.js";

import {
  listVolunteerHistory,
  addVolunteerHistory,
  resetVolunteerHistory,
  PARTICIPATION_STATUSES as EXPORTED_STATUSES,
} from "../volunteerHistory.prisma.js";

function historyRow({ feedback = {}, overrides = {} } = {}) {
  return {
    id: "vh1",
    userId: "u1",
    participationStatus: "Registered",
    hoursVolunteered: 3,
    feedback: JSON.stringify({
      volunteerName: "Alex",
      assignment: "Park Cleanup",
      location: "Central Park",
      eventDate: "2025-02-03",
      ...feedback,
    }),
    event: { eventDate: new Date("2025-02-03T00:00:00.000Z") },
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.clearAllMocks());

describe("exports", () => {
  it("re-exports PARTICIPATION_STATUSES", () => {
    expect(EXPORTED_STATUSES).toEqual(PARTICIPATION_STATUSES);
  });
});

describe("listVolunteerHistory", () => {
  it("maps rows", async () => {
    prisma.volunteerHistory.findMany.mockResolvedValue([
      historyRow(),
      historyRow({ overrides: { feedback: "{bad-json", hoursVolunteered: null } }),
    ]);
    const out = await listVolunteerHistory();
    expect(prisma.volunteerHistory.findMany).toHaveBeenCalled();
    expect(out[0].volunteerName).toBe("Alex");
    expect(out[1].hours).toBe(0);
  });
});

describe("addVolunteerHistory", () => {
  it("creates profile and uses found event", async () => {
    const payload = {
      volunteerId: "u9",
      volunteerName: "Jamie",
      assignment: "Food Drive",
      location: "Warehouse",
      eventDate: "2025-06-01",
      status: "Registered",
      hours: 5,
    };
    prisma.userProfile.findUnique.mockResolvedValueOnce(null);
    prisma.eventDetails.findFirst.mockResolvedValueOnce({ id: "evt-5" });
    prisma.volunteerHistory.create.mockResolvedValueOnce(historyRow());
    await addVolunteerHistory(payload);
    expect(prisma.userProfile.create).toHaveBeenCalled();
    expect(prisma.eventDetails.findFirst).toHaveBeenCalled();
    expect(prisma.volunteerHistory.create).toHaveBeenCalled();
  });

  it("creates event when not found", async () => {
    prisma.userProfile.findUnique.mockResolvedValue({ userId: "u2" });
    prisma.eventDetails.findFirst.mockResolvedValueOnce(null);
    prisma.eventDetails.create.mockResolvedValueOnce({ id: "evt-created" });
    prisma.volunteerHistory.create.mockResolvedValueOnce(historyRow());
    await addVolunteerHistory({
      volunteerId: "u2",
      volunteerName: "Riley",
      assignment: "Shelter Shift",
      location: "Downtown",
      eventDate: "2025-07-04",
      status: "Attended",
      hours: 2,
    });
    expect(prisma.eventDetails.create).toHaveBeenCalled();
  });
});

describe("resetVolunteerHistory", () => {
  it("clears and seeds", async () => {
    prisma.volunteerHistory.deleteMany.mockResolvedValue({});
    prisma.userProfile.findUnique.mockResolvedValue({ userId: "x" });
    prisma.eventDetails.findFirst
      .mockResolvedValueOnce({ id: "evt-found" })
      .mockResolvedValueOnce(null);
    prisma.eventDetails.create.mockResolvedValueOnce({ id: "evt-new" });

    const seed = [
      {
        id: "vh-explicit",
        volunteerId: "uA",
        volunteerName: "A",
        assignment: "Found Event",
        location: "Loc1",
        eventDate: "2025-01-01",
        status: "Attended",
        hours: 1,
      },
      {
        volunteerId: "uB",
        volunteerName: "B",
        assignment: "New Event",
        location: "Loc2",
        eventDate: "2025-01-02",
        status: "Invalid",
        hours: 2,
      },
    ];

    await resetVolunteerHistory(seed);
    expect(prisma.volunteerHistory.deleteMany).toHaveBeenCalled();
    expect(prisma.volunteerHistory.create).toHaveBeenCalledTimes(2);
    expect(generateId).toHaveBeenCalledWith("vol-history");
  });
});
