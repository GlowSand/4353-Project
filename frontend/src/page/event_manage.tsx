import { useEffect, useMemo, useState } from "react";

/** ---------- Types ---------- */
const URGENCY_OPTIONS = ["Low", "Medium", "High", "Critical"] as const;
type EventUrgency = (typeof URGENCY_OPTIONS)[number];

type EventItem = {
  id: string;
  name: string;
  description: string;
  location: string;
  requiredSkills: string[];
  urgency: EventUrgency;
  eventDate: string; // ISO yyyy-mm-dd
};

/** ---------- Placeholder backend calls (replace later) ---------- */
async function fetchEvents(): Promise<EventItem[]> {
  return Promise.resolve([
    {
      id: "seed-1",
      name: "Community Cleanup",
      description: "Neighborhood cleanup and recycling drive.",
      location: "123 Main St, Houston, TX",
      requiredSkills: ["Teamwork", "Lifting"],
      urgency: "Medium",
      eventDate: "2025-10-01",
    },
  ]);
}

async function createEvent(payload: Omit<EventItem, "id">): Promise<EventItem> {
  return Promise.resolve({ id: crypto.randomUUID(), ...payload });
}
async function updateEvent(id: string, payload: Omit<EventItem, "id">) {
  return Promise.resolve({ id, ...payload });
}
async function deleteEvent(_id: string) {
  return Promise.resolve();
}

/** ---------- Constants ---------- */
const ALL_SKILLS = [
  "Teamwork",
  "Lifting",
  "Organization",
  "Customer Service",
  "First Aid",
  "Event Coordination",
  "Logistics",
];

const pageBg = "bg-[#ede5d9] text-[#2b1f14]";
const cardBase =
  "rounded-[32px] border border-[#c9b08e] bg-[#ede5d9]/90 shadow-[0_18px_32px_-12px_rgba(114,91,60,0.35)]";
const buttonBase =
  "inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-semibold transition focus:outline-none focus:ring-4 focus:ring-[#c9b08e]/40 disabled:cursor-not-allowed disabled:opacity-60";
const primaryButton =
  `${buttonBase} bg-[#a57b42] text-white shadow-[0_3px_10px_rgba(167,131,80,0.25)] hover:bg-[#b79568]`;
const dangerButton =
  `${buttonBase} bg-rose-500 text-white shadow-md hover:bg-rose-600`;
const inputBase =
  "w-full rounded-2xl border border-[#c9b08e] bg-[#ede5d9] px-4 py-3 text-[#2b1f14] shadow-sm placeholder:text-[#b79568] focus:border-[#b79568] focus:ring-4 focus:ring-[#c9b08e]/40 focus:outline-none";

/** ---------- Component ---------- */
export default function EventManage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [urgency, setUrgency] = useState<EventUrgency>("Low");
  const [eventDate, setEventDate] = useState("");

  // UI state
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** ---------- Load events ---------- */
  useEffect(() => {
    setLoading(true);
    fetchEvents()
      .then((data) => setEvents(data))
      .catch(() => setError("Failed to load events."))
      .finally(() => setLoading(false));
  }, []);

  /** ---------- Helpers ---------- */
  const resetForm = () => {
    setName("");
    setDescription("");
    setLocation("");
    setRequiredSkills([]);
    setUrgency("Low");
    setEventDate("");
    setSelectedId(null);
    setMode("create");
    setError(null);
  };

  const hydrateFormForEdit = (e: EventItem) => {
    setName(e.name);
    setDescription(e.description);
    setLocation(e.location);
    setRequiredSkills(e.requiredSkills);
    setUrgency(e.urgency);
    setEventDate(e.eventDate);
    setMode("edit");
    setSelectedId(e.id);
  };

  const handleSelectEvent = (id: string) => {
    const e = events.find((x) => x.id === id);
    if (e) hydrateFormForEdit(e);
  };

  const toggleSkill = (s: string) => {
    setRequiredSkills((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const validate = (): string | null => {
    if (!name.trim()) return "Event Name is required.";
    if (name.trim().length > 100) return "Event Name must be ≤ 100 characters.";
    if (!description.trim()) return "Event Description is required.";
    if (!location.trim()) return "Location is required.";
    if (requiredSkills.length === 0) return "Select at least one Required Skill.";
    if (!urgency) return "Urgency is required.";
    if (!eventDate) return "Event Date is required.";
    return null;
  };

  const payload = (): Omit<EventItem, "id"> => ({
    name: name.trim(),
    description: description.trim(),
    location: location.trim(),
    requiredSkills,
    urgency,
    eventDate,
  });

  const handleSave = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSaving(true);
    try {
      if (mode === "create") {
        const created = await createEvent(payload());
        setEvents((prev) => [created, ...prev]);
        hydrateFormForEdit(created);
      } else if (mode === "edit" && selectedId) {
        const updated = await updateEvent(selectedId, payload());
        setEvents((prev) =>
          prev.map((e) => (e.id === selectedId ? updated : e))
        );
        hydrateFormForEdit(updated);
      }
    } catch {
      setError("Failed to save event.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await deleteEvent(selectedId);
      setEvents((prev) => prev.filter((e) => e.id !== selectedId));
      resetForm();
    } catch {
      setError("Failed to delete event.");
    } finally {
      setSaving(false);
    }
  };

  const listItems = useMemo(
    () =>
      events.map((event) => {
        const isActive = selectedId === event.id;
        return (
          <li
            key={event.id}
            onClick={() => handleSelectEvent(event.id)}
            className={`cursor-pointer rounded-[28px] border border-[#c9b08e] bg-[#ede5d9]/85 px-5 py-4 shadow-[0_2px_10px_rgba(167,131,80,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(167,131,80,0.28)] ${
              isActive ? "bg-[#c9b08e]/60" : ""
            }`}
          >
            <div className="mb-1 text-lg font-semibold text-[#2b1f14]">{event.name}</div>
            <div className="text-sm text-[#725b3c]">
              {new Date(event.eventDate).toLocaleDateString()} • {event.urgency}
            </div>
          </li>
        );
      }),
    [events, selectedId]
  );

  return (
    <div className={`grid min-h-screen w-full grid-cols-1 bg-cover lg:grid-cols-[360px_minmax(0,1fr)] ${pageBg}`}>
      <aside className="flex h-full flex-col bg-[#ede5d9] p-6 lg:p-8">
        <div className={`${cardBase} flex h-full flex-col gap-5 overflow-hidden p-5 lg:p-6`}>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#c9b08e] bg-[#dbcab3] px-4 py-3 shadow-[0_8px_22px_rgba(167,131,80,0.28)]">
            <span className="rounded-2xl bg-[#ede5d9] px-4 py-2 text-lg font-semibold text-[#2b1f14] shadow-sm">
              Events
            </span>
            <button className={primaryButton} onClick={resetForm}>
              + New
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            {loading ? (
              <div className="text-[#725b3c]">Loading events…</div>
            ) : events.length === 0 ? (
              <div className="text-[#725b3c]">No events yet.</div>
            ) : (
              <ul className="space-y-3 pr-1">{listItems}</ul>
            )}
          </div>
        </div>
      </aside>

      <main className="flex h-full flex-col bg-[#ede5d9] p-5 lg:p-7">
        <div className={`${cardBase} flex h-full flex-col gap-5 overflow-hidden p-5 lg:p-7`}>
          <div className="flex flex-col gap-3 rounded-2xl border border-[#c9b08e] bg-[#dbcab3] px-5 py-4 shadow-[0_8px_22px_rgba(167,131,80,0.28)] sm:flex-row sm:items-center sm:justify-between">
            <h2 className="rounded-2xl bg-[#ede5d9] px-6 py-3 text-2xl font-bold text-[#2b1f14] shadow-md">
              {mode === "create" ? "Create Event" : "Manage Event"}
            </h2>
            <div className="flex items-center gap-3">
              {mode === "edit" && (
                <button className={dangerButton} disabled={saving} onClick={handleDelete}>
                  Delete
                </button>
              )}
              <button className={primaryButton} disabled={saving} onClick={handleSave}>
                {mode === "create" ? "Create" : "Save"}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-rose-700 shadow-sm">
              {error}
            </div>
          )}

          <div className="flex-1 overflow-y-auto rounded-[28px] border border-[#c9b08e] bg-[#dbcab3]/60 p-6 shadow-inner">
            <div className="grid gap-6 lg:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-[#4c3a29]">
                  Event Name<span className="ml-1 text-rose-500">*</span>
                </span>
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Up to 100 characters"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={inputBase}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-[#4c3a29]">
                  Event Date<span className="ml-1 text-rose-500">*</span>
                </span>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                  className={inputBase}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-[#4c3a29]">
                  Urgency<span className="ml-1 text-rose-500">*</span>
                </span>
                <select
                  value={urgency}
                  onChange={(event) => setUrgency(event.target.value as EventUrgency)}
                  className={`${inputBase} appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22 stroke=%22%23a57b42%22%3E%3Cpath stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E')] bg-[length:1.25rem] bg-[right_1rem_center] bg-no-repeat`}
                >
                  {URGENCY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 lg:col-span-2">
                <span className="text-sm font-semibold text-[#4c3a29]">
                  Location<span className="ml-1 text-rose-500">*</span>
                </span>
                <textarea
                  rows={2}
                  placeholder="Address, instructions, etc."
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className={`${inputBase} min-h-[96px] resize-y`}
                />
              </label>

              <label className="flex flex-col gap-2 lg:col-span-2">
                <span className="text-sm font-semibold text-[#4c3a29]">
                  Event Description<span className="ml-1 text-rose-500">*</span>
                </span>
                <textarea
                  rows={5}
                  placeholder="Describe the event goals, tasks, and details…"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className={`${inputBase} min-h-[160px] resize-y`}
                />
              </label>

              <div className="flex flex-col gap-2 lg:col-span-2">
                <span className="text-sm font-semibold text-[#4c3a29]">
                  Required Skills<span className="ml-1 text-rose-500">*</span>
                </span>
                <div className="flex flex-wrap gap-3">
                  {ALL_SKILLS.map((skill) => {
                    const isSelected = requiredSkills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                          isSelected
                            ? "border-[#a57b42] bg-[#a57b42] text-white shadow-[0_6px_14px_rgba(165,123,66,0.35)]"
                            : "border-[#c9b08e] bg-[#ede5d9] text-[#725b3c] hover:bg-[#dbcab3]"
                        }`}
                      >
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
