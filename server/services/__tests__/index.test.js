import { describe, it, expect } from "vitest";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  resetEvents,
  listEvents,
} from "../../api/events.prisma.js";

describe.skip("api/events prisma helpers", () => {
  it("update/delete throw on unknown id", async () => {
    const payload = { name: "n", description: "d", location: "l", eventDate: "2099-01-01", requiredSkills: ["A"] };
    await expect(updateEvent("__nope__", payload)).rejects.toThrow();
    await expect(deleteEvent("__nope__")).rejects.toThrow();
  });

  it("resetEvents normalizes skills and copies", async () => {
    await resetEvents([
      { id: "e1", name: "N", description: "D", location: "L", eventDate: "2099-01-01", requiredSkills: ["A", "A", "B"], urgency: "High" },
    ]);
    const list = await listEvents();
    const [ev] = list;
    expect(ev.requiredSkills).toEqual(["A", "B"]);
  });

  it("createEvent returns independent copy", async () => {
    await resetEvents([]);
    const ev = await createEvent({ name: "X", description: "D", location: "L", eventDate: "2099-01-01", requiredSkills: ["Q"] });
    ev.requiredSkills.push("Z");
    const storeCopy = (await listEvents()).find((e) => e.id === ev.id);
    expect(storeCopy.requiredSkills).toEqual(["Q"]);
  });
});
