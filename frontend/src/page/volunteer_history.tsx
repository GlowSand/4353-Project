import { useEffect, useMemo, useState } from "react";

type EngagementLevel = "Low" | "Medium" | "High" | "Critical";
type ParticipationStatus =
  | "Registered"
  | "Confirmed"
  | "CheckedIn"
  | "NoShow"
  | "Cancelled"
  | "Completed";

type VolunteerHistoryItem = {
  id: string;
  name: string; // assignment or primary activity name
  description: string; // notes about recent participation
  location: string;
  requiredSkills: string[];
  urgency: EngagementLevel;
  eventDate: string; // last activity date
  status: ParticipationStatus;
  volunteerId?: string;
  volunteerName?: string;
  hours?: number;
  notes?: string;
};

type SortKey = "eventDate" | "name" | "urgency" | "status";
type SortDir = "asc" | "desc";

type VolunteerHistoryParams = {
  page: number;
  pageSize: number;
  sortKey: SortKey;
  sortDir: SortDir;
  search: string;
  filters: {
    urgency?: string[];
    status?: string[];
    dateFrom?: string;
    dateTo?: string;
  };
};

type VolunteerHistoryResponse = {
  items: VolunteerHistoryItem[];
  total: number;
};

const ENGAGEMENT_OPTIONS: EngagementLevel[] = ["Low", "Medium", "High", "Critical"];
const STATUS_OPTIONS: ParticipationStatus[] = [
  "Registered",
  "Confirmed",
  "CheckedIn",
  "NoShow",
  "Cancelled",
  "Completed",
];

const DEFAULT_SORT_KEY: SortKey = "eventDate";
const DEFAULT_SORT_DIR: SortDir = "desc";

const pageContainer = "min-h-screen w-full bg-[#ede5d9] px-6 py-8 text-[#2b1f14] md:px-12";
const cardBase =
  "rounded-[32px] border border-[#c9b08e] bg-[#ede5d9]/90 shadow-[0_18px_32px_-12px_rgba(114,91,60,0.35)]";
const buttonBase =
  "inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-semibold transition focus:outline-none focus:ring-4 focus:ring-[#c9b08e]/40 disabled:cursor-not-allowed disabled:opacity-60";
const primaryButton =
  `${buttonBase} bg-[#a57b42] text-white shadow-[0_3px_10px_rgba(167,131,80,0.25)] hover:bg-[#b79568]`;
const ghostButton =
  `${buttonBase} border border-[#c9b08e] bg-[#ede5d9] text-[#a57b42] hover:bg-[#dbcab3]`;
const inputBase =
  "w-full rounded-2xl border border-[#c9b08e] bg-[#ede5d9] px-4 py-3 text-[#2b1f14] shadow-sm placeholder:text-[#b79568] focus:border-[#b79568] focus:ring-4 focus:ring-[#c9b08e]/40 focus:outline-none";

async function fetchVolunteerHistory(
  params: VolunteerHistoryParams,
  signal?: AbortSignal
): Promise<VolunteerHistoryResponse> {
  const { page, pageSize, search, sortKey, sortDir, filters } = params;
  const roster = [ //placeholder data
    {
      volunteerName: "Jordan Smith",
      volunteerId: "vol-001",
      location: "Houston, TX",
      skills: ["skill1", "skill2", "skill3"],
      engagement: "High" as EngagementLevel,
      status: "Confirmed" as ParticipationStatus,
      assignment: "Emergency Shelter Intake",
      hours: 62,
      description:
        "description",
      lastActivity: "2025-02-14",
    },
    {
      volunteerName: "John Smith",
      volunteerId: "vol-002",
      location: "Houston, TX",
      skills: ["skill1", "skill2", "skill3"],
      engagement: "Critical" as EngagementLevel,
      status: "CheckedIn" as ParticipationStatus,
      assignment: "Mobile Wellness Clinic",
      hours: 88,
      description:
        "description",
      lastActivity: "2025-02-11",
    },
    {
      volunteerName: "Miguel Hernandez",
      volunteerId: "vol-003",
      location: "Houston, TX",
      skills: ["skill1", "skill2", "skill3"],
      engagement: "Medium" as EngagementLevel,
      status: "Completed" as ParticipationStatus,
      assignment: "Warehouse Logistics",
      hours: 47,
      description:
        "description",
      lastActivity: "2025-01-29",
    },
    {
      volunteerName: "Jack Lee",
      volunteerId: "vol-004",
      location: "Houston, TX",
      skills: ["skill1", "skill2", "skill3"],
      engagement: "High" as EngagementLevel,
      status: "Registered" as ParticipationStatus,
      assignment: "Neighborhood Outreach Canvassing",
      hours: 33,
      description: "description",
      lastActivity: "2025-02-05",
    },
    {
      volunteerName: "Morgan Davis",
      volunteerId: "vol-005",
      location: "Houston, TX",
      skills: ["skill1", "skill2", "skill3"],
      engagement: "Low" as EngagementLevel,
      status: "NoShow" as ParticipationStatus,
      assignment: "Intake Data QA",
      hours: 12,
      description:
        "description",
      lastActivity: "2025-01-18",
    },
  ];

  const seed: VolunteerHistoryItem[] = Array.from({ length: 30 }, (_, index) => {
    const base = roster[index % roster.length];
    const date = new Date(base.lastActivity);
    date.setDate(date.getDate() - (index % 14) * 2);

    return {
      id: `history-${index + 1}`,
      name: base.assignment,
      description: base.description,
      location: base.location,
      requiredSkills: base.skills,
      urgency: base.engagement,
      eventDate: date.toISOString().slice(0, 10),
      status: STATUS_OPTIONS[(STATUS_OPTIONS.indexOf(base.status) + (index % 3)) % STATUS_OPTIONS.length],
      volunteerName: base.volunteerName,
      volunteerId: base.volunteerId,
      hours: base.hours + (index % 5) * 2,
      notes: base.description,
    };
  });

  const filtered = seed.filter((item) => {
    if (signal?.aborted) return false;
    const term = search.trim().toLowerCase();
    const matchesSearch =
      term.length === 0 ||
      item.name.toLowerCase().includes(term) ||
      item.location.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term);

    const matchesUrgency =
      !filters.urgency || filters.urgency.length === 0 || filters.urgency.includes(item.urgency);

    const matchesStatus =
      !filters.status || filters.status.length === 0 || filters.status.includes(item.status);

    const matchesDateFrom =
      !filters.dateFrom || new Date(item.eventDate) >= new Date(filters.dateFrom);
    const matchesDateTo = !filters.dateTo || new Date(item.eventDate) <= new Date(filters.dateTo);

    return matchesSearch && matchesUrgency && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  const sorted = [...filtered].sort((a, b) => {
    const direction = sortDir === "asc" ? 1 : -1;

    switch (sortKey) {
      case "eventDate":
        return (new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()) * direction;
      case "name":
        return a.name.localeCompare(b.name) * direction;
      case "urgency":
        return a.urgency.localeCompare(b.urgency) * direction;
      case "status":
        return a.status.localeCompare(b.status) * direction;
      default:
        return 0;
    }
  });

  const start = (page - 1) * pageSize;
  const items = sorted.slice(start, start + pageSize);

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, 350);
    signal?.addEventListener("abort", () => {
      clearTimeout(timeout);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

  return { items, total: sorted.length };
}

async function exportVolunteerHistoryCSV(params: VolunteerHistoryParams) {
  console.info("Export CSV with params", params);
  return Promise.resolve();
}

function formatDate(dateISO: string): string {
  const date = new Date(`${dateISO}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatSkills(skills: string[]): string {
  if (skills.length <= 3) return skills.join(", ");
  const [first, second, third, ...rest] = skills;
  return `${first}, ${second}, ${third} +${rest.length} more`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function statusToBadge(status: ParticipationStatus) {
  switch (status) {
    case "Registered":
      return { text: "Registered", className: "inline-flex items-center rounded-full bg-[#b79568] px-3 py-1 text-xs font-semibold text-white" };
    case "Confirmed":
      return { text: "Confirmed", className: "inline-flex items-center rounded-full bg-[#a57b42] px-3 py-1 text-xs font-semibold text-white" };
    case "CheckedIn":
      return { text: "Checked In", className: "inline-flex items-center rounded-full bg-[#c9b08e] px-3 py-1 text-xs font-semibold text-[#2b1f14]" };
    case "Completed":
      return { text: "Completed", className: "inline-flex items-center rounded-full bg-[#dbcab3] px-3 py-1 text-xs font-semibold text-[#2b1f14]" };
    case "NoShow":
      return { text: "No Show", className: "inline-flex items-center rounded-full bg-[#e7a854] px-3 py-1 text-xs font-semibold text-[#2b1f14]" };
    case "Cancelled":
      return { text: "Cancelled", className: "inline-flex items-center rounded-full bg-[#c45f5f] px-3 py-1 text-xs font-semibold text-white" };
    default:
      return { text: status, className: "inline-flex items-center rounded-full bg-[#ede5d9] px-3 py-1 text-xs font-semibold text-[#2b1f14]" };
  }
}

export default function VolunteerHistory() {
  const [data, setData] = useState<VolunteerHistoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    urgency: [] as string[],
    status: [] as string[],
    dateFrom: "",
    dateTo: "",
  });
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const hasFilters = useMemo(() => {
    return (
      searchQuery.trim().length > 0 ||
      filters.urgency.length > 0 ||
      filters.status.length > 0 ||
      Boolean(filters.dateFrom) ||
      Boolean(filters.dateTo)
    );
  }, [filters, searchQuery]);

  const columns = useMemo(
    () => [
      { key: "volunteerName", label: "Volunteer" },
      { key: "name", label: "Assignment" },
      { key: "eventDate", label: "Last Activity" },
      { key: "status", label: "Status" },
      { key: "hours", label: "Hours" },
      { key: "requiredSkills", label: "Skills" },
      { key: "location", label: "Location" },
      { key: "description", label: "Notes" },
    ],
    []
  );

  const csvParams = useMemo<VolunteerHistoryParams>(
    () => ({
      page,
      pageSize,
      sortKey: DEFAULT_SORT_KEY,
      sortDir: DEFAULT_SORT_DIR,
      search: searchQuery,
      filters: {
        urgency: filters.urgency,
        status: filters.status,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      },
    }),
    [filters, page, pageSize, searchQuery]
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchVolunteerHistory(csvParams, controller.signal)
      .then((response) => {
        setData(response.items);
        setTotalCount(response.total);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Failed to load volunteer history.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [csvParams, refreshToken]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const toggleFilterValue = (key: "urgency" | "status", value: string) => {
    setFilters((prev) => {
      const nextSet = prev[key].includes(value)
        ? prev[key].filter((item) => item !== value)
        : [...prev[key], value];
      return { ...prev, [key]: nextSet };
    });
    setPage(1);
  };

  const handleDateChange = (key: "dateFrom" | "dateTo", value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setFilters({ urgency: [], status: [], dateFrom: "", dateTo: "" });
    setPage(1);
  };

  const handlePageChange = (next: number) => {
    setPage(Math.min(Math.max(1, next), totalPages));
  };

  const handlePageSizeChange = (nextSize: number) => {
    setPageSize(nextSize);
    setPage(1);
  };

  const handleRowClick = (id: string) => {
    setSelectedRowId((prev) => (prev === id ? null : id));
  };

  const handleExportCSV = () => {
    exportVolunteerHistoryCSV(csvParams).catch(() => {
      setError("Failed to export volunteer history.");
    });
  };

  const handleRetry = () => {
    setError(null);
    setRefreshToken((prev) => prev + 1);
  };

  return (
    <div className={pageContainer}>
      <header className="flex flex-col gap-4 rounded-[28px] border border-[#c9b08e] bg-[#ede5d9]/90 px-6 py-5 shadow-[0_18px_32px_-12px_rgba(114,91,60,0.35)] md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-[#2b1f14]">Volunteer History</h1>
          <p className="text-base text-[#725b3c]">
            Track individual volunteer assignments and participation details.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasFilters && (
            <button className={ghostButton} onClick={handleClearFilters}>
              Clear
            </button>
          )}
          <button className={primaryButton} onClick={handleExportCSV}>
            Export CSV
          </button>
        </div>
      </header>

      <section className={`${cardBase} mt-6 flex flex-col gap-6 p-6 lg:p-8`}>
        <div className="grid gap-6 lg:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-[#4c3a29]">Search</span>
            <input
              aria-label="Search volunteer history"
              className={inputBase}
              placeholder="Search by volunteer name, location…"
              value={searchQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-[#4c3a29]">Date Range</span>
            <div className="flex items-center gap-3">
              <input
                type="date"
                className={inputBase}
                value={filters.dateFrom}
                onChange={(event) => handleDateChange("dateFrom", event.target.value)}
                aria-label="Filter from date"
              />
              <span className="text-sm text-[#725b3c]">to</span>
              <input
                type="date"
                className={inputBase}
                value={filters.dateTo}
                onChange={(event) => handleDateChange("dateTo", event.target.value)}
                aria-label="Filter to date"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-[#4c3a29]">Engagement Level</span>
            <div className="flex flex-wrap gap-3">
              {ENGAGEMENT_OPTIONS.map((option) => {
                const active = filters.urgency.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      active
                        ? "border-[#a57b42] bg-[#a57b42] text-white shadow-[0_6px_14px_rgba(165,123,66,0.35)]"
                        : "border-[#c9b08e] bg-[#ede5d9] text-[#725b3c] hover:bg-[#dbcab3]"
                    }`}
                    onClick={() => toggleFilterValue("urgency", option)}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-[#4c3a29]">Status</span>
            <div className="flex flex-wrap gap-3">
              {STATUS_OPTIONS.map((option) => {
                const active = filters.status.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      active
                        ? "border-[#a57b42] bg-[#a57b42] text-white shadow-[0_6px_14px_rgba(165,123,66,0.35)]"
                        : "border-[#c9b08e] bg-[#ede5d9] text-[#725b3c] hover:bg-[#dbcab3]"
                    }`}
                    onClick={() => toggleFilterValue("status", option)}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className={`${cardBase} mt-6 flex flex-col gap-6 p-6 lg:p-8`}>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4 text-sm text-[#725b3c]">
            <span>
              Showing {data.length} of {totalCount} records
            </span>
            {selectedRowId && <span>Selected row: {selectedRowId}</span>}
          </div>
          {loading && <span className="text-sm text-[#725b3c]">Loading…</span>}
        </header>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-rose-700 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <button className={ghostButton} onClick={handleRetry}>
                Retry
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-3xl border border-[#c9b08e] bg-[#ede5d9]/70 shadow-inner">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-[#dbcab3] text-xs uppercase tracking-wider text-[#5a442b]">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-4 py-3 font-semibold">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-[#725b3c]">
                    Loading volunteer history…
                  </td>
                </tr>
              )}

              {!loading && data.length === 0 && !error && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-[#725b3c]">
                    <div className="font-medium text-[#2b1f14]">No results</div>
                    <div className="text-sm text-[#725b3c]">
                      Try adjusting filters or search criteria.
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                data.map((item) => {
                  const badge = statusToBadge(item.status);
                  const isSelected = item.id === selectedRowId;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleRowClick(item.id)}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? "bg-[#c9b08e]/70 shadow-inner"
                          : "hover:bg-[#dbcab3]/60"
                      }`}
                    >
                      <td className="px-4 py-4 font-semibold text-[#2b1f14]">{item.volunteerName}</td>
                      <td className="px-4 py-4 text-[#725b3c]">{item.name}</td>
                      <td className="px-4 py-4 text-[#725b3c]">{formatDate(item.eventDate)}</td>
                      <td className="px-4 py-4">
                        <span className={badge.className}>{badge.text}</span>
                      </td>
                      <td className="px-4 py-4 text-[#725b3c]">{item.hours ?? "—"}</td>
                      <td className="px-4 py-4 text-[#725b3c]">{formatSkills(item.requiredSkills)}</td>
                      <td className="px-4 py-4 text-[#725b3c]">{item.location}</td>
                      <td className="px-4 py-4 text-[#725b3c]">{truncate(item.description, 120)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-4 border-t border-[#c9b08e]/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <label className="flex flex-col text-sm text-[#725b3c]">
              Rows per page
              <select
                className={`${inputBase} mt-1 w-[110px] appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22 stroke=%22%23a57b42%22%3E%3Cpath stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E')] bg-[length:1.25rem] bg-[right_1rem_center] bg-no-repeat`}
                value={pageSize}
                onChange={(event) => handlePageSizeChange(Number(event.target.value))}
              >
                {[10, 25, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center gap-3 text-sm text-[#725b3c]">
            <button
              className={ghostButton}
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              className={ghostButton}
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
            >
              Next
            </button>
          </div>

          <div className="flex items-center text-sm text-[#725b3c]">
            <span>Selected: {selectedRowId ? 1 : 0}</span>
          </div>
        </footer>
      </section>
    </div>
  );
}
