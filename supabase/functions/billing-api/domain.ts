export type Row = Record<string, any>;

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function object(value: unknown, name: string): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, `${name} must be an object.`);
  }
  return value as Row;
}

export function text(value: unknown, name: string, max = 500): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new ApiError(400, `${name} is required (maximum ${max} characters).`);
  }
  return value;
}

export function day(value: unknown, name = "Date"): string {
  const result = text(value, name, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) ||
      !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result) {
    throw new ApiError(400, `${name} must be a valid YYYY-MM-DD date.`);
  }
  return result;
}

export function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => same(v, b[i]));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const aa = a as Row, bb = b as Row;
    const keys = Object.keys(aa);
    return keys.length === Object.keys(bb).length && keys.every(k => Object.hasOwn(bb, k) && same(aa[k], bb[k]));
  }
  return false;
}

export function transaction(row: Row): Row {
  // A malformed legacy record must never be silently rewritten as empty items.
  let loaded: any;
  try { loaded = JSON.parse(row.itemsJson || "[]"); }
  catch { throw new ApiError(409, "A stored record needs repair. No data was changed."); }
  const result: Row = {
    id: row.id, customerId: row.customerId, type: row.type, amount: row.amount,
    category: row.category, date: row.date, status: row.status, clearedDate: row.clearedDate,
    items: loaded,
  };
  if (row.type === "loan") {
    if (loaded && !Array.isArray(loaded) && typeof loaded === "object" && "items" in loaded) {
      result.loanDetails = loaded;
      result.items = loaded.items;
    } else {
      result.loanDetails = { items: loaded, interestRate: "1.5%", takenDate: row.date, endDate: row.date };
    }
  }
  return result;
}

export function billNumber(row: Row): string {
  const saved = transaction(row).loanDetails?.billNumber;
  return String(saved || row.id.replace("BILL-", "").replace("TXN-OFFLINE-", "").replace(/-\d{4}$/, ""))
    .trim().replace(/^\*/, "★");
}

export function validateTransaction(input: unknown): Row {
  const t = object(input, "Transaction");
  text(t.id, "Record ID", 200);
  text(t.customerId, "Customer ID", 200);
  if (!["loan", "purchase"].includes(t.type)) throw new ApiError(400, "Invalid transaction type.");
  if (!Number.isInteger(t.amount) || t.amount < 0 || t.amount > 2147483647) {
    throw new ApiError(400, "Amount must be a non-negative whole rupee value within the existing database limit.");
  }
  day(t.date);
  if (t.status !== undefined && !["Pending", "Cleared"].includes(t.status)) throw new ApiError(400, "Invalid loan status.");
  if (t.clearedDate != null) day(t.clearedDate, "Cleared date");
  if (t.category !== undefined) text(t.category, "Category", 100);
  if (t.type === "loan") {
    const details = object(t.loanDetails, "Loan details");
    if (!Array.isArray(details.items)) throw new ApiError(400, "Pledged items must be a list.");
    if (details.billNumber !== undefined) text(details.billNumber, "Bill number", 100);
  } else if (!Array.isArray(t.items)) throw new ApiError(400, "Items must be a list.");
  return t;
}

export function validateCustomer(input: unknown): Row {
  const c = object(input, "Customer");
  text(c.id, "Customer ID", 200);
  text(c.name, "Customer name");
  // Existing records may deliberately have empty contact fields.
  const result: Row = { id: c.id, name: c.name };
  for (const key of ["phone", "address", "father", "idproof", "mandal"]) {
    const value = c[key] ?? (["phone", "address"].includes(key) ? "" : null);
    if (value !== null && (typeof value !== "string" || value.length > 2000)) throw new ApiError(400, `Invalid customer ${key}.`);
    result[key] = value;
  }
  return result;
}

export function assertExpected(current: unknown, expected: unknown): void {
  if (expected === undefined || !same(current, expected)) {
    throw new ApiError(409, "This record changed or has no edit snapshot. Refresh before retrying so no changes are lost.");
  }
}

export function today(): string {
  // Daily reminders follow the shop's Mumbai time, independent of worker region.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function reminders(transactions: Row[], customers: Row[], queue: Row[], dueOnly = false): Row[] {
  const byId = new Map(customers.map(c => [c.id, c]));
  const now = Date.parse(today());
  return transactions.filter(t => t.type === "loan" && t.status !== "Cleared").flatMap(t => {
    const c = byId.get(t.customerId);
    if (!c) return [];
    const details = t.loanDetails || {};
    let endDate = details.endDate;
    if (!endDate) {
      const taken = Date.parse(details.takenDate || t.date);
      if (!Number.isFinite(taken)) return [];
      endDate = new Date(taken + (t.category === "Silver" ? 90 : 365) * 86400000).toISOString().slice(0, 10);
    }
    if (!Number.isFinite(Date.parse(endDate))) return [];
    const daysLeft = Math.round((Date.parse(endDate) - now) / 86400000);
    if (dueOnly && daysLeft > 30) return [];
    const sent = (days: number) => queue.some(s => s.phone === c.phone && String(s.message).includes(t.id) && String(s.message).includes(`${days} రోజులు`));
    return [{ loanId: t.id, customerId: c.id, customerName: c.name, phone: c.phone,
      amount: t.amount, endDate, releaseDate: endDate, daysLeft, sent30Day: sent(30), sent7Day: sent(7),
      status: daysLeft <= 0 ? "Due" : "Approaching" }];
  });
}
