import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { score } from "../services/matching.js";
import { bus } from "../services/notifications.js"; // for SSE notices

export const matching = Router();
const prisma = new PrismaClient();

const toVolunteerDTO = (p) => ({
  id: p.userId,                    // UI expects id = userId
  name: p.fullName,
  location: p.city,                // UI shows a single location string
  skills: Array.isArray(p.skills) ? p.skills : [],
});

const toEventDTO = (e) => ({
  id: e.id,
  name: e.eventName,
  location: e.location,
  requiredSkills: Array.isArray(e.requiredSkills) ? e.requiredSkills : [],
  date: new Date(e.eventDate).toISOString().slice(0, 10),
  urgency: e.urgency, // keep as provided ("Low"|"Medium"|"High")
});


matching.get("/volunteers", async (_req, res) => {
  try {
    const rows = await prisma.userProfile.findMany({
      orderBy: { createdAt: "desc" },
      select: { userId: true, fullName: true, city: true, skills: true },
    });
    res.json(rows.map(toVolunteerDTO));
  } catch {
    res.status(500).json({ error: "list_volunteers_failed" });
  }
});

// GET /api/match/events → [{id,name,location,requiredSkills,date,urgency}]
matching.get("/events", async (_req, res) => {
  try {
    const rows = await prisma.eventDetails.findMany({
      orderBy: { eventDate: "asc" },
      select: { id: true, eventName: true, location: true, requiredSkills: true, eventDate: true, urgency: true },
    });
    res.json(rows.map(toEventDTO));
  } catch {
    res.status(500).json({ error: "list_events_failed" });
  }
});

// GET /api/match/volunteer/:id → ranked matches
// UI sends :id = volunteer.userId (because of our DTO above)
matching.get("/volunteer/:id", async (req, res) => {
  const { id } = req.params; // this is userId
  const topN = Number(req.query.topN ?? 9999);
  try {
    const v = await prisma.userProfile.findUnique({ where: { userId: id } });
    if (!v) return res.status(404).json({ error: "volunteer not found" });

    const vDTO = toVolunteerDTO(v);

    const events = await prisma.eventDetails.findMany();
    const ranked = events
      .map((e) => {
        const eDTO = toEventDTO(e);
        return { event: eDTO, score: score(vDTO, eDTO) };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);

    res.json(ranked);
  } catch {
    res.status(500).json({ error: "rank_failed" });
  }
});

// POST /api/match/assign { volunteerId, eventId }
matching.post("/assign", async (req, res) => {
  const { volunteerId, eventId } = req.body || {};
  if (!volunteerId || !eventId) return res.status(400).json({ error: "volunteerId and eventId required" });

  try {
    const [v, e] = await Promise.all([
      prisma.userProfile.findUnique({ where: { userId: volunteerId } }),
      prisma.eventDetails.findUnique({ where: { id: eventId } }),
    ]);
    if (!v || !e) return res.status(404).json({ error: "not found" });

    const assignment = await prisma.assignment.create({ data: { volunteerId, eventId } });

    // success notice for SSE consumers
    const title = `Assigned: ${e.eventName}`;
    const body = `${e.location} • ${new Date(e.eventDate).toISOString()}`;
    const notice = await prisma.notice.create({ data: { volunteerId, title, body, type: "success" } });
    bus.emit(`notice:${volunteerId}`, {
      id: notice.id,
      volunteerId: notice.volunteerId,
      title: notice.title,
      body: notice.body,
      type: notice.type,
      createdAtMs: Number(notice.createdAtMs ?? 0n),
    });

    res.json({ ok: true, assignment: { id: assignment.id, volunteerId, eventId, createdAtMs: Number(assignment.createdAtMs ?? 0n) } });
  } catch {
    res.status(500).json({ error: "assign_failed" });
  }
});

// simple health probe
matching.get("/health", (_req, res) => res.json({ ok: true }));