import { describe, it, expect } from "vitest";
import {
  generateId, toUniqueSkills,
  ensureEventPayload, ensureVolunteerPayload,
  isParticipationStatus, PARTICIPATION_STATUSES
} from "../../shared.js";

describe("ensureEventPayload additional guards", () => {
  const base = {
    name: "Cleanup",
    description: "desc",
    location: "Austin",
    requiredSkills: ["bag"],
    urgency: "Low",
  };

 it("rejects invalid ISO date format (not yyyy-mm-dd)", () => {
  const bad = { ...base, eventDate: "not-a-date" };
  expect(() => ensureEventPayload(bad)).toThrow();
});

  it("rejects overlong title (length guard)", () => {
    const bad = {
      ...base,
      name: "X".repeat(10_000), 
      eventDate: "2099-01-01",
    };
    expect(() => ensureEventPayload(bad)).toThrow();
  });
});


describe("shared helpers edge cases (fixed)", () => {
  it("ensureEventPayload rejects invalid urgency", () => {
  const bad = {
    name: 2,                 
    description: 3,          
    location: " Park ",
    requiredSkills: [" x ", "x", "", " y "],
    urgency: "weird",        
    eventDate: "2099-02-03", 
  };
  expect(() => ensureEventPayload(bad)).toThrow(/Invalid urgency/);
});

  it("toUniqueSkills trims, stringifies, filters empties, and dedupes", () => {
    expect(toUniqueSkills([" a ", "", "a", "b", 123, "123"])).toEqual([
      "a",
      "b",
      "123",
    ]);
  });
});


describe("shared helpers", () => {
  it("generateId uses prefix and increments", () => {
    const a = generateId("x");
    const b = generateId("x");
    expect(a).toMatch(/^x-/);
    expect(b).not.toBe(a);
  });

  it("toUniqueSkills trims, dedups, filters empties", () => {
    const r = toUniqueSkills(["  CPR ", "CPR", "", " First Aid "]);
    expect(r).toEqual(["CPR", "First Aid"]);
  });

  it("ensureEventPayload rejects bad types and missing fields", () => {
    expect(() => ensureEventPayload(null)).toThrow();
    expect(() => ensureEventPayload({})).toThrow(/Missing required/);
  });

  it("ensureEventPayload normalizes and defaults urgency", () => {
    const r = ensureEventPayload({
        name:" n ", description:" d ", location:" l ",
        eventDate:"2099-01-01",
        requiredSkills:[" A ","A","B"], urgency:"High"
    });
    expect(r).toMatchObject({
      name:"n", description:"d", location:"l", eventDate:"2099-01-01",
      requiredSkills:["A","B"], urgency:"High"
    });
  });

  it("isParticipationStatus validates list", () => {
    expect(isParticipationStatus(PARTICIPATION_STATUSES[0])).toBe(true);
    expect(isParticipationStatus("__nope__")).toBe(false);
  });

  it("ensureVolunteerPayload validates, generates id, rounds hours", () => {
    expect(() => ensureVolunteerPayload(null)).toThrow();
    expect(() => ensureVolunteerPayload({ volunteerName:"", assignment:"a", location:"l", eventDate:"d", status: PARTICIPATION_STATUSES[0]})).toThrow();
    expect(() => ensureVolunteerPayload({ volunteerName:"v", assignment:"", location:"l", eventDate:"d", status: PARTICIPATION_STATUSES[0]})).toThrow();
    expect(() => ensureVolunteerPayload({ volunteerName:"v", assignment:"a", location:"", eventDate:"d", status: PARTICIPATION_STATUSES[0]})).toThrow();
    expect(() => ensureVolunteerPayload({ volunteerName:"v", assignment:"a", location:"l", eventDate:"", status: PARTICIPATION_STATUSES[0]})).toThrow();
    expect(() => ensureVolunteerPayload({ volunteerName:"v", assignment:"a", location:"l", eventDate:"d", status:"NOPE"})).toThrow(/Invalid participation/);

    const ok = ensureVolunteerPayload({ volunteerName:"v", assignment:"a", location:"l", eventDate:"d", status: PARTICIPATION_STATUSES[0], hours: 3.6 });
    expect(ok.volunteerId).toMatch(/^vol-/);
    expect(ok.hours).toBe(4);        
  });
});
