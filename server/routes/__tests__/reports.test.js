import { describe, it, beforeEach, vi, expect } from "vitest";
import express from "express";
import request from "supertest";

const prismaMock = {
  userProfile: { findMany: vi.fn() },
  eventDetails: { findMany: vi.fn() },
};

class FakePDFDocument {
  constructor() {
    this.page = {
      margins: { left: 40, right: 40, top: 40, bottom: 40 },
      width: 612,
      height: 792,
    };
    this.y = 0;
  }
  pipe(stream) {
    this.stream = stream;
    return stream;
  }
  font() { return this; }
  fontSize() { return this; }
  text() { return this; }
  moveDown() { this.y += 12; return this; }
  moveTo() { return this; }
  lineTo() { return this; }
  lineWidth() { return this; }
  stroke() { return this; }
  addPage() { this.y = 0; return this; }
  end() { this.stream?.end(); }
}

vi.mock("../../db.js", () => ({ default: prismaMock }));
vi.mock("pdfkit", () => ({ default: FakePDFDocument }));

async function makeApp() {
  const routerModule = await import("../reports.js");
  const app = express();
  app.use("/reports", routerModule.default);
  return app;
}

const volunteerProfile = {
  userId: "u1",
  fullName: "Uno",
  volunteerHistory: [
    {
      participationStatus: "Completed",
      hoursVolunteered: 2,
      event: { eventName: "Cleanup", eventDate: new Date("2024-01-02") },
    },
  ],
};

const emptyProfile = { userId: "u2", fullName: "Dos", volunteerHistory: [] };

const eventsData = [
  {
    id: "e1",
    eventName: "Tree Planting",
    eventDate: new Date("2024-02-03"),
    location: "Austin",
    Assignment: [
      { volunteer: { userId: "u1", fullName: "Uno" } },
    ],
  },
  {
    id: "e2",
    eventName: "Food Drive",
    eventDate: new Date("2024-03-04"),
    location: "Dallas",
    Assignment: [],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("reports router", () => {
  it("returns volunteer CSV report", async () => {
    prismaMock.userProfile.findMany.mockResolvedValueOnce([volunteerProfile, emptyProfile]);

    const res = await request(await makeApp()).get("/reports/volunteers/csv").expect(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain("volunteerId,fullName,eventName,eventDate,participationStatus,hoursVolunteered");
    expect(res.text).toContain("Uno");
    expect(res.text).toContain("-");
  });

  it("streams volunteer PDF report", async () => {
    prismaMock.userProfile.findMany.mockResolvedValueOnce([volunteerProfile]);

    const res = await request(await makeApp()).get("/reports/volunteers/pdf").expect(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
  });

  it("returns event CSV", async () => {
    prismaMock.eventDetails.findMany.mockResolvedValueOnce(eventsData);

    const res = await request(await makeApp()).get("/reports/events/csv").expect(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain("eventId,eventName,eventDate,location,volunteerId,volunteerName");
    expect(res.text).toContain("Tree Planting");
    expect(res.text).toContain("Food Drive");
  });

  it("streams event PDF", async () => {
    prismaMock.eventDetails.findMany.mockResolvedValueOnce(eventsData);

    const res = await request(await makeApp()).get("/reports/events/pdf").expect(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
  });
});
