// Ugadi dates for Andhra Pradesh/India; each date begins that Telugu bill series.
const ugadiDates = [
  "2020-03-25", "2021-04-13", "2022-04-02", "2023-03-22", "2024-04-09",
  "2025-03-30", "2026-03-19", "2027-04-07", "2028-03-27", "2029-04-14",
  "2030-04-03", "2031-03-24", "2032-04-11", "2033-03-31", "2034-03-21",
  "2035-04-09", "2036-03-28", "2037-03-17", "2038-04-05", "2039-03-25",
  "2040-04-12",
];

/** Returns the Gregorian start year of the Telugu year containing this ISO date. */
export function teluguBillSeriesYear(date: string): number {
  const isoDate = String(date || "").slice(0, 10);
  const gregorianYear = Number(isoDate.slice(0, 4));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate) || !Number.isFinite(gregorianYear)) return gregorianYear;
  const thisYearUgadi = ugadiDates.find(value => value.startsWith(`${gregorianYear}-`));
  return thisYearUgadi && isoDate < thisYearUgadi ? gregorianYear - 1 : gregorianYear;
}
