/**
 * Loan Bill Series Management
 * 
 * Configurable loan numbering series.
 * Starting a new series separates bill numbering so auto-generated
 * bill numbers restart from 1 (and ★1) for all loans created on or after
 * the series start date.
 */

export interface LoanSeries {
  id?: number | string;
  startDate: string; // YYYY-MM-DD
  label?: string;
  createdAt?: string;
}

/** Pre-configured default series start dates requested by the user */
export const DEFAULT_LOAN_SERIES: LoanSeries[] = [
  { id: "preset-2026", startDate: "2026-03-19", label: "Series 2026 (From 19 Mar 2026)" },
  { id: "preset-2025", startDate: "2025-03-30", label: "Series 2025 (From 30 Mar 2025)" },
  { id: "preset-2024", startDate: "2024-04-09", label: "Series 2024 (From 09 Apr 2024)" },
  { id: "preset-2023", startDate: "2023-03-22", label: "Series 2023 (From 22 Mar 2023)" },
  { id: "preset-2022", startDate: "2022-04-02", label: "Series 2022 (From 02 Apr 2022)" },
  { id: "preset-2021", startDate: "2021-04-13", label: "Series 2021 (From 13 Apr 2021)" },
  { id: "preset-2020", startDate: "2020-03-25", label: "Series 2020 (From 25 Mar 2020)" },
];

/**
 * Normalizes various date string formats (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, ISO timestamps)
 * to a standard ISO YYYY-MM-DD string.
 */
export function normalizeDateToISO(dateStr: string): string {
  if (!dateStr) return "";
  const clean = String(dateStr).trim().split("T")[0].split(" ")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const parts = clean.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    }
    if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }
  return clean;
}

/**
 * Returns the series identifier for a given loan date.
 * Loans taken on or after a series start date belong to that series until the next series begins.
 * 
 * @param dateStr ISO date string (YYYY-MM-DD or DD/MM/YYYY)
 * @param customSeries Array of custom series start dates or LoanSeries objects
 */
export function getLoanSeriesKey(dateStr: string, customSeries: (string | LoanSeries)[] = []): string {
  const isoDate = normalizeDateToISO(dateStr);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "series-default";

  // Combine default preset series and any custom series added by the user
  const allSeries: LoanSeries[] = [
    ...DEFAULT_LOAN_SERIES,
    ...customSeries.map(s => (typeof s === "string" ? { startDate: s } : s))
  ];

  // Extract unique valid start dates sorted descending (newest first)
  const startDates = Array.from(new Set(
    allSeries
      .map(s => normalizeDateToISO(s.startDate))
      .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
  )).sort((a, b) => b.localeCompare(a));

  // Find the newest series whose startDate is <= isoDate
  const match = startDates.find(d => isoDate >= d);
  if (match) return `series-${match}`;

  // If loan date is before the earliest defined series start date
  const oldest = startDates[startDates.length - 1];
  return oldest ? `series-${oldest}` : "series-default";
}

/** Returns a friendly name for the series of a given date */
export function getLoanSeriesLabel(dateStr: string, customSeries: (string | LoanSeries)[] = []): string {
  const key = getLoanSeriesKey(dateStr, customSeries);
  const dateMatch = key.replace(/^series-/, "");
  const allSeries: LoanSeries[] = [
    ...customSeries.map(s => (typeof s === "string" ? { startDate: s, label: `Series from ${s}` } : s)),
    ...DEFAULT_LOAN_SERIES,
  ];
  const found = allSeries.find(s => s.startDate === dateMatch);
  if (found?.label) return found.label;
  if (dateMatch && dateMatch !== "default") {
    return `Series (${formatSeriesDate(dateMatch)})`;
  }
  return "Default Series";
}

/** Formats an ISO date string (YYYY-MM-DD) to DD/MM/YYYY */
export function formatSeriesDate(dateStr: string): string {
  if (!dateStr) return "";
  const clean = dateStr.slice(0, 10);
  const parts = clean.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/** Legacy fallback so any external calls continue seamlessly */
export function teluguBillSeriesYear(date: string): number {
  const key = getLoanSeriesKey(date);
  const match = key.match(/^series-(\d{4})/);
  if (match) return Number(match[1]);
  const year = Number(String(date || "").slice(0, 4));
  return Number.isFinite(year) ? year : new Date().getFullYear();
}
