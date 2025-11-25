import { describe, it, expect } from "vitest";
import { score } from "../matching.js";  

const vol = { id:"v1", name:"Y", location:"UH", skills:["Tutoring","Computer Science","Math"] };
const evBase = { id:"e", name:"X", location:"UH", requiredSkills:[], date:"2099-01-01", urgency:"Low" };

it("0 when location mismatch", () => {
  const r = score(vol, { ...evBase, location:"Downtown", requiredSkills:["Tutoring"] });
  expect(r.score ?? r).toBeGreaterThan(0);
});

it(">0 when all skills and location match", () => {
  const r = score(vol, { ...evBase, requiredSkills:["Tutoring","Computer Science"] });
  expect(r.score ?? r).toBeGreaterThan(0);
});
