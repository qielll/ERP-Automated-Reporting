import { useState } from "react";
import Swal from "sweetalert2";

// ─── Types ────────────────────────────────────────────────────────────────────
type DailyReport = {
  id?: number | null;
  x_studio_report_date: string;
  x_studio_email_sent_today: number | null;
  x_studio_email_sent_screenshots: string | null;
  x_studio_email_sent_description: string | null;
  isExcluded?: boolean;
  isWeekend?: boolean;
  statusLabel?: string;
};

// Mirrors GenerateReportBody — week/month/year match getCountedWeek params
type GenerateReportBody = {
  week: string;
  month: string;
  year: string;
  user: string;
};

type ReportsResult = {
  dailyMail: DailyReport[];
  emailSentValues: number[];
};

type ApiReportsResponse = {
  success: boolean;
  count: number;
  data: ReportsResult;
  message?: string;
};

// ─── API Client ───────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function fetchReports(body: GenerateReportBody): Promise<ApiReportsResponse> {
  const res = await fetch(`${API_BASE}/api/call-email-reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: ApiReportsResponse = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? res.statusText);
  }
  return json;
}

async function submitEmailSent(body: { dates: string[]; user: string; emailSentVal: number[] }) {
  const res = await fetch(`${API_BASE}/api/write-email-sent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.message ?? "Failed to write data");
  }

  return json;
}

// ─── Utilities ────────────────────────────────────────────────────────────────
// Mirrors server-side getCountedWeek exactly — used for the live date preview
function getCountedWeek(weekInput: string, monthInput: string, yearInput: string): string[] {
  const year = parseInt(yearInput);
  const month = parseInt(monthInput);
  const week = parseInt(weekInput) - 1;

  const initialDate = new Date(Date.UTC(year, month, 1));
  if (week > 0) initialDate.setDate(initialDate.getDate() + 7 * week);

  const dates: string[] = [];
  const initialMonth = initialDate.getMonth();

  for (let i = 0; i < 7; i++) {
    const temp = new Date(initialDate);
    temp.setDate(temp.getDate() + i);
    if (temp.getMonth() !== initialMonth) break;
    dates.push(temp.toISOString().split("T")[0]);
  }
  return dates;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function getDayName(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr);
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

function isExcludedDate(dateStr: string, excluded: string[]): boolean {
  return excluded.includes(dateStr);
}

function applyDateExclusions(reports: DailyReport[], excludedDates: string[]) {
  return reports.map((r) => {
    const date = r.x_studio_report_date;

    const isOff = isWeekend(date) || isExcludedDate(date, excludedDates);

    return {
      date,
      value: isOff ? null : (r.x_studio_email_sent_today ?? null),
    };
  });
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ label, value, icon, accent }: { label: string; value: string | number; icon: string; accent: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${accent}`}>
        <i className={`ti ${icon} text-xl`} aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function ReportRow({ report, index }: { report: DailyReport; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasData = report.x_studio_email_sent_today !== null;
  const day = getDayName(report.x_studio_report_date);
  const isWeekend = report.isWeekend;
  const isExcluded = report.isExcluded;

  return (
    <div className={`border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden transition-all duration-200 ${isWeekend ? "opacity-50" : ""}`}>
      <button
        onClick={() => hasData && setExpanded(!expanded)}
        className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${hasData ? "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer" : "cursor-default"} bg-white dark:bg-zinc-900`}
      >
        <span className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex-shrink-0">{String(index + 1).padStart(2, "0")}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-zinc-800 dark:text-zinc-200 text-sm">{formatDate(report.x_studio_report_date)}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">{day}</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {isExcluded && <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Excluded</span>}

          {!isExcluded && isWeekend && <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Weekend</span>}
        </div>
        {hasData ? (
          <span className="inline-flex items-center gap-1.5 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-sm font-semibold px-3 py-1 rounded-full">
            <i className="ti ti-mail text-base" aria-hidden="true" />
            {report.x_studio_email_sent_today} emails
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 text-xs px-3 py-1 rounded-full">
            <i className="ti ti-circle-dashed text-sm" aria-hidden="true" />
            No report
          </span>
        )}
        {report.x_studio_email_sent_screenshots && (
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
            <i className="ti ti-photo text-sm" aria-hidden="true" />
            screenshot
          </span>
        )}
        {hasData && <i className={`ti ti-chevron-down text-zinc-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />}
      </button>

      {expanded && hasData && (
        <div className="px-5 pb-4 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800">
          <div className="pt-3 space-y-3">
            {report.x_studio_email_sent_description && (
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{report.x_studio_email_sent_description}</p>
              </div>
            )}
            {report.x_studio_email_sent_screenshots && (
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">Screenshot</p>
                <a href={report.x_studio_email_sent_screenshots} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  <i className="ti ti-external-link text-base" aria-hidden="true" />
                  View attachment
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 mb-4 text-sm">
      <i className="ti ti-alert-circle text-base mt-0.5 flex-shrink-0" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-600 dark:hover:text-red-200">
        <i className="ti ti-x text-base" aria-hidden="true" />
      </button>
    </div>
  );
}

// ─── Select helper ────────────────────────────────────────────────────────────
function SelectField({ label, id, icon, value, onChange, children }: { label: string; id: string; icon: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </label>
      <div className="relative">
        <i className={`ti ${icon} absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-base pointer-events-none`} aria-hidden="true" />
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
        >
          {children}
        </select>
        <i className="ti ti-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none" aria-hidden="true" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SalesDailyReport() {
  const now = new Date();
  const currentYear = now.getFullYear();

  const [user, setUser] = useState("");
  const [week, setWeek] = useState("1");
  // month is 0-indexed to match getCountedWeek (parseInt(monthInput) used directly as Date month)
  const [month, setMonth] = useState(String(now.getMonth()));
  const [year, setYear] = useState(String(currentYear));

  const [reports, setReports] = useState<DailyReport[]>([]);
  const [lastCount, setLastCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailValues, setEmailValues] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [excludedDates, setExcludedDates] = useState<string[]>([]);

  // Live preview — mirrors exactly what the server will compute
  const previewDates = getCountedWeek(week, month, year);

  const totalEmails = reports.reduce((sum, r) => sum + (r.x_studio_email_sent_today ?? 0), 0);
  const reportedDays = reports.filter((r) => r.x_studio_email_sent_today !== null).length;
  const avgEmails = reportedDays > 0 ? (totalEmails / reportedDays).toFixed(1) : "—";

  const handleFetch = async () => {
    if (!user.trim()) return;

    setLoading(true);
    setHasSearched(true);
    setError(null);

    try {
      const result = await fetchReports({
        week,
        month,
        year,
        user: user.trim(),
      });

      const processedReports = result.data.dailyMail.map((report) => {
        const date = report.x_studio_report_date;

        const weekend = isWeekend(date);
        const excluded = isExcludedDate(date, excludedDates);

        return {
          ...report,

          isWeekend: weekend,
          isExcluded: excluded,

          statusLabel: excluded ? "Excluded" : weekend ? "Weekend" : "Working Day",
        };
      });

      setReports(processedReports);

      setEmailValues(result.data.emailSentValues);
      setLastCount(result.count);
    } catch (err: any) {
      setError(err.message ?? "An unexpected error occurred.");
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!reports.length || !emailValues.length) return;

    setSubmitting(true);
    try {
      const datesCombined = applyDateExclusions(reports, excludedDates);

      await submitEmailSent({
        dates: datesCombined.map((d) => d.date),
        // dates: reports.map((r) => r.x_studio_report_date), // reuse existing data
        user: user.trim(),
        emailSentVal: datesCombined.map((d) => d.value ?? 0),
      });
      Swal.fire({
        title: "Success!",
        text: "Your data has been submitted.",
        icon: "success",
        confirmButtonText: "Ok",
      });
    } catch (err: any) {
      Swal.fire({
        title: "Submission Failed",
        text: err.message ?? "An unexpected error occurred.",
        icon: "error",
        confirmButtonText: "Close",
        confirmButtonColor: "#d33", // Optional: Changes the button to a warning red
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <div className="flex">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 px-4 py-6 gap-1 fixed top-0 left-0">
          <div className="flex items-center gap-2.5 px-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
              <i className="ti ti-chart-bar text-white text-lg" aria-hidden="true" />
            </div>
            <span className="font-semibold text-zinc-800 dark:text-zinc-100 text-sm tracking-tight">SalesTrack</span>
          </div>

          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-sm font-medium">
            <i className="ti ti-report-analytics text-lg" aria-hidden="true" />
            Daily Reports
          </a>
          {[
            { icon: "ti-users", label: "Salespeople" },
            { icon: "ti-chart-line", label: "Analytics" },
            { icon: "ti-file-spreadsheet", label: "Export" },
            { icon: "ti-settings", label: "Settings" },
          ].map((item) => (
            <a key={item.label} href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-medium transition-colors">
              <i className={`ti ${item.icon} text-lg`} aria-hidden="true" />
              {item.label}
            </a>
          ))}
          <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3 px-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-xs font-semibold text-blue-600 dark:text-blue-400">A</div>
              <div>
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Admin</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Odoo Manager</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main className="flex-1 lg:ml-60 px-4 sm:px-6 lg:px-8 py-8 max-w-full">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 mb-2">
              <i className="ti ti-home text-sm" aria-hidden="true" />
              <span>/</span>
              <span>Daily Reports</span>
            </div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Sales Daily Report</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Generate weekly email-activity reports by salesperson, week number, month, and year.</p>
          </div>

          {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

          {/* ── Filter card ──────────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 mb-6">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">Generate Report</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Salesperson */}
              <div className="flex flex-col gap-1">
                <label htmlFor="user-input" className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Salesperson
                </label>
                <div className="relative">
                  <i className="ti ti-user absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-base pointer-events-none" aria-hidden="true" />
                  <input
                    id="user-input"
                    type="text"
                    placeholder="e.g. reno"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Week */}
              <SelectField label="Week" id="week-select" icon="ti-calendar-week" value={week} onChange={setWeek}>
                {["1", "2", "3", "4", "5"].map((w) => (
                  <option key={w} value={w}>
                    Week {w}
                  </option>
                ))}
              </SelectField>

              {/* Month — 0-indexed to match getCountedWeek's parseInt(monthInput) */}
              <SelectField label="Month" id="month-select" icon="ti-calendar-month" value={month} onChange={setMonth}>
                {MONTH_NAMES.map((name, i) => (
                  <option key={i} value={String(i)}>
                    {name}
                  </option>
                ))}
              </SelectField>

              {/* Year */}
              <SelectField label="Year" id="year-select" icon="ti-calendar" value={year} onChange={setYear}>
                {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="mt-4">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Exclude Dates (optional)</label>

              <div className="mt-1 flex flex-col gap-2">
                <input
                  type="date"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && !excludedDates.includes(val)) {
                      setExcludedDates((prev) => [...prev, val]);
                    }
                  }}
                  className="w-full sm:w-60 px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />

                {/* Selected excluded dates */}
                <div className="flex flex-wrap gap-2">
                  {excludedDates.map((d) => (
                    <span key={d} className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded flex items-center gap-1">
                      {d}
                      <button onClick={() => setExcludedDates((prev) => prev.filter((x) => x !== d))} className="ml-1 text-red-500 hover:text-red-700">
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Date preview + submit */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              {/* Live date range derived from getCountedWeek */}
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
                  <i className="ti ti-calendar-event text-sm" aria-hidden="true" />
                  <span>
                    Computed dates ({previewDates.length} day{previewDates.length !== 1 ? "s" : ""}):
                  </span>
                  <span className="font-medium text-zinc-600 dark:text-zinc-300">
                    {previewDates.length > 0 ? `${formatDate(previewDates[0])}${previewDates.length > 1 ? ` → ${formatDate(previewDates[previewDates.length - 1])}` : ""}` : "—"}
                  </span>
                </div>

                {/* Individual date chips */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {previewDates.map((d) => {
                    const dayName = getDayName(d);
                    const isWeekend = dayName === "Saturday" || dayName === "Sunday";
                    return (
                      <span key={d} className={`text-xs px-2 py-0.5 rounded-md font-mono ${isWeekend ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600" : "bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300"}`}>
                        {d}
                      </span>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleFetch}
                disabled={loading || !user.trim()}
                className="flex-shrink-0 inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
              >
                {loading ? (
                  <>
                    <i className="ti ti-loader-2 animate-spin text-base" aria-hidden="true" />
                    Generating…
                  </>
                ) : (
                  <>
                    <i className="ti ti-database-search text-base" aria-hidden="true" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── Stats ─────────────────────────────────────────────────────────── */}
          {hasSearched && !loading && reports.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <StatCard label="Records returned" value={lastCount} icon="ti-list-check" accent="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300" />
              <StatCard label="Total emails sent" value={totalEmails} icon="ti-mail" accent="bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400" />
              <StatCard label="Days reported" value={`${reportedDays} / ${reports.length}`} icon="ti-calendar-check" accent="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400" />
              <StatCard label="Avg. emails / day" value={avgEmails} icon="ti-chart-line" accent="bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400" />
            </div>
          )}

          {/* ── Empty / loading / no-result states ───────────────────────────── */}
          {!hasSearched && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                <i className="ti ti-report-search text-3xl text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">No data yet</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                Fill in the fields above and click <strong>Generate Report</strong>.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-24 gap-3 text-zinc-400">
              <i className="ti ti-loader-2 animate-spin text-2xl" aria-hidden="true" />
              <span className="text-sm">Fetching from Odoo…</span>
            </div>
          )}

          {hasSearched && !loading && reports.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center mb-4">
                <i className="ti ti-inbox-off text-3xl text-amber-400" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">No reports found</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Check the salesperson name matches exactly in Odoo, or try a different week.</p>
            </div>
          )}

          {/* ── Report list ────────────────────────────────────────────────────── */}
          {hasSearched && !loading && reports.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Report entries — {user}</p>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {MONTH_NAMES[parseInt(month)]} {year}, Week {week}
                </span>
              </div>
              <div className="space-y-2">
                {reports.map((report, i) => (
                  <ReportRow key={report.x_studio_report_date} report={report} index={i} />
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={submitting || reports.length === 0}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              {submitting ? (
                <>
                  <i className="ti ti-loader-2 animate-spin text-base" />
                  Submitting…
                </>
              ) : (
                <>
                  <i className="ti ti-upload text-base" />
                  Submit to Spreadsheet
                </>
              )}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
