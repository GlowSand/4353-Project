import { useEffect, useState } from "react";

const URGENCY_OPTIONS = ["Low", "Medium", "High", "Critical"] as const;
type EventUrgency = (typeof URGENCY_OPTIONS)[number];

type EventItem = {
  id: string;
  name: string;
  description: string;
  location: string;
  requiredSkills: string[];
  urgency: EventUrgency;
  eventDate: string;
};
type Form = Omit<EventItem, "id">;

type ApiSuccess<T> = { data: T };
type ApiError = { error: string };

const EVENTS_ENDPOINT = "/api/events";

const readJson = async <T,>(res: Response): Promise<T> => {
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
};

const handleResponse = async <T,>(res: Response): Promise<T> => {
  const body = await readJson<ApiSuccess<T> | ApiError>(res);
  if (!res.ok) {
    const message = "error" in body && body.error ? body.error : "Request failed.";
    throw new Error(message);
  }
  return "data" in body ? body.data : (undefined as T);
};

async function fetchEvents(): Promise<EventItem[]> {
  const res = await fetch(EVENTS_ENDPOINT);
  return handleResponse<EventItem[]>(res);
}

async function createEvent(payload: Form): Promise<EventItem> {
  const res = await fetch(EVENTS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<EventItem>(res);
}

async function updateEvent(id: string, payload: Form): Promise<EventItem> {
  const res = await fetch(`${EVENTS_ENDPOINT}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<EventItem>(res);
}

async function deleteEvent(id: string): Promise<void> {
  const res = await fetch(`${EVENTS_ENDPOINT}/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await readJson<ApiError>(res);
    throw new Error(body.error ?? "Failed to delete event.");
  }
}

const ALL_SKILLS = [
  "Teamwork",
  "Lifting",
  "Organization",
  "Customer Service",
  "First Aid",
  "Event Coordination",
  "Logistics",
];

const PAGE_CLASS = "bg-stone-100 text-stone-900";
const CARD_CLASS = "rounded-2xl border border-amber-200 bg-white shadow";
const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium transition focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-60";
const PRIMARY_BUTTON = `${BUTTON_BASE} bg-amber-600 text-white hover:bg-amber-500`;
const DANGER_BUTTON = `${BUTTON_BASE} bg-rose-500 text-white hover:bg-rose-600`;
const INPUT_CLASS =
  "w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:border-amber-300 focus:ring-2 focus:ring-amber-200 focus:outline-none";

export default function EventManage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const emptyForm: Form = {
    name: "",
    description: "",
    location: "",
    requiredSkills: [],
    urgency: "Low",
    eventDate: "",
  };
  const [form, setForm] = useState<Form>(emptyForm);

  const [mode, setMode] = useState<"create" | "edit">("create");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchEvents()
      .then(setEvents)
      .catch(() => setError("Failed to load events."))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const resetForm = () => {
    setForm(emptyForm);
    setSelectedId(null);
    setMode("create");
    setError(null);
  };

  const hydrateFormForEdit = (e: EventItem) => {
    const { id, ...rest } = e;
    setForm(rest);
    setMode("edit");
    setSelectedId(id);
  };

  const handleSelectEvent = (id: string) => {
    const e = events.find((x) => x.id === id);
    if (e) hydrateFormForEdit(e);
  };

  const toggleSkill = (s: string) =>
    setForm((f) => ({
      ...f,
      requiredSkills: f.requiredSkills.includes(s)
        ? f.requiredSkills.filter((x) => x !== s)
        : [...f.requiredSkills, s],
    }));

  const validate = (): string | null => {
    if (!form.name.trim()) return "Event Name is required.";
    if (form.name.trim().length > 100)
      return "Event Name must be ≤ 100 characters.";
    if (!form.description.trim()) return "Event Description is required.";
    if (!form.location.trim()) return "Location is required.";
    if (form.requiredSkills.length === 0)
      return "Select at least one Required Skill.";
    if (!form.urgency) return "Urgency is required.";
    if (!form.eventDate) return "Event Date is required.";
    return null;
  };

  const handleSave = async () => {
    const v = validate();
    if (v) return setError(v);
    setSaving(true);
    try {
      if (mode === "create") {
        const created = await createEvent({
          ...form,
          name: form.name.trim(),
          description: form.description.trim(),
          location: form.location.trim(),
        });
        setEvents((prev) => [created, ...prev]);
        hydrateFormForEdit(created);
      } else if (selectedId) {
        const updated = await updateEvent(selectedId, {
          ...form,
          name: form.name.trim(),
          description: form.description.trim(),
          location: form.location.trim(),
        });
        setEvents((prev) => prev.map((e) => (e.id === selectedId ? updated : e)));
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

  return (
    <div
      className={`grid min-h-screen w-full grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] ${PAGE_CLASS}`}
    >
      <aside className="flex h-full flex-col bg-stone-100 p-6 lg:p-8">
        <div className={`${CARD_CLASS} flex h-full flex-col gap-4 overflow-hidden p-5 lg:p-6`}>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <span className="rounded-lg bg-white px-4 py-2 text-lg font-semibold text-stone-900 shadow-sm">
              Events
            </span>
            <button className={PRIMARY_BUTTON} onClick={resetForm}>+ New</button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            {loading ? (
              <div className="text-stone-500">Loading events…</div>
            ) : events.length === 0 ? (
              <div className="text-stone-500">No events yet.</div>
            ) : (
              <ul className="space-y-3 pr-1">
                {events.map((e) => {
                  const isActive = selectedId === e.id;
                  return (
                    <li
                      key={e.id}
                      onClick={() => handleSelectEvent(e.id)}
                      className={`cursor-pointer rounded-lg border border-amber-200 bg-white px-4 py-3 shadow-sm transition hover:bg-amber-50 ${isActive ? "ring-2 ring-amber-300" : ""}`}
                    >
                      <div className="mb-1 text-lg font-semibold text-stone-900">{e.name}</div>
                      <div className="text-sm text-stone-500">
                        {new Date(e.eventDate).toLocaleDateString()} • {e.urgency}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </aside>

      <main className="flex h-full flex-col bg-stone-100 p-6 lg:p-8">
        <div className={`${CARD_CLASS} flex h-full flex-col gap-4 overflow-hidden p-6 lg:p-8`}>
          <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="rounded-lg bg-white px-5 py-3 text-2xl font-bold text-stone-900 shadow-sm">
              {mode === "create" ? "Create Event" : "Manage Event"}
            </h2>
            <div className="flex items-center gap-3">
              {mode === "edit" && (
                <button className={DANGER_BUTTON} disabled={saving} onClick={handleDelete}>
                  Delete
                </button>
              )}
              <button className={PRIMARY_BUTTON} disabled={saving} onClick={handleSave}>
                {mode === "create" ? "Create" : "Save"}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-600">
              {error}
            </div>
          )}

          <div className="flex-1 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50 p-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-stone-700">
                  Event Name<span className="ml-1 text-rose-500">*</span>
                </span>
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Up to 100 characters"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-stone-700">
                  Event Date<span className="ml-1 text-rose-500">*</span>
                </span>
                <input
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => set("eventDate", e.target.value)}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-stone-700">
                  Urgency<span className="ml-1 text-rose-500">*</span>
                </span>
                <select
                  value={form.urgency}
                  onChange={(e) => set("urgency", e.target.value as EventUrgency)}
                  className={`${INPUT_CLASS} appearance-none pr-10`}
                >
                  {URGENCY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 lg:col-span-2">
                <span className="text-sm font-semibold text-stone-700">
                  Location<span className="ml-1 text-rose-500">*</span>
                </span>
                <textarea
                  rows={2}
                  placeholder="Address, instructions, etc."
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  className={`${INPUT_CLASS} min-h-[96px] resize-y`}
                />
              </label>

              <label className="flex flex-col gap-2 lg:col-span-2">
                <span className="text-sm font-semibold text-stone-700">
                  Event Description<span className="ml-1 text-rose-500">*</span>
                </span>
                <textarea
                  rows={5}
                  placeholder="Describe the event goals, tasks, and details…"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  className={`${INPUT_CLASS} min-h-[160px] resize-y`}
                />
              </label>

              <div className="flex flex-col gap-2 lg:col-span-2">
                <span className="text-sm font-semibold text-stone-700">
                  Required Skills<span className="ml-1 text-rose-500">*</span>
                </span>
                <div className="flex flex-wrap gap-3">
                  {ALL_SKILLS.map((s) => {
                    const on = form.requiredSkills.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSkill(s)}
                        className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                          on
                            ? "border-amber-500 bg-amber-500 text-white"
                            : "border-amber-200 bg-white text-stone-600 hover:bg-amber-50"
                        }`}
                      >
                        {s}
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
