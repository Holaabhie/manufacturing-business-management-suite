import crypto from "crypto";
import {
  type CsvMapping,
  type DateFormat,
  type AmountMode,
  type ParsedRowResult,
  type BankStatementImportError,
  type BalanceCheckResult,
  MAX_FILE_SIZE_BYTES,
} from "../domain/types";

export { MAX_FILE_SIZE_BYTES };
export const MAX_ROWS_LIMIT = 20000;

export interface DecodeResult {
  text: string;
  encoding: "UTF-8" | "UTF-16LE";
}

/**
 * Detect encoding from buffer (BOM inspection) and decode to text.
 */
export function decodeCsvBuffer(buffer: Buffer): DecodeResult {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    // UTF-16LE with BOM
    return {
      text: buffer.subarray(2).toString("utf16le"),
      encoding: "UTF-16LE",
    };
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  ) {
    // UTF-8 with BOM - strip 3 bytes
    return {
      text: buffer.subarray(3).toString("utf8"),
      encoding: "UTF-8",
    };
  }

  // Default to UTF-8
  return {
    text: buffer.toString("utf8"),
    encoding: "UTF-8",
  };
}

/**
 * In-house RFC-4180 compliant CSV parser.
 * Handles:
 *  - Quoted fields with commas, CR, LF
 *  - Escaped double quotes ("") inside quotes
 *  - Mixed CRLF and LF line breaks
 *  - Unquoted fields
 */
export function parseRfc4180Csv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];

    if (insideQuotes) {
      if (char === '"') {
        if (i + 1 < len && text[i + 1] === '"') {
          // Escaped quote
          currentField += '"';
          i += 2;
          continue;
        } else {
          // End of quoted field
          insideQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
        i++;
        continue;
      } else if (char === ",") {
        currentRow.push(currentField);
        currentField = "";
        i++;
        continue;
      } else if (char === "\r") {
        if (i + 1 < len && text[i + 1] === "\n") {
          i++;
        }
        currentRow.push(currentField);
        currentField = "";
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else if (char === "\n") {
        currentRow.push(currentField);
        currentField = "";
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push final field/row if any data exists
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  // Filter out trailing empty rows
  while (
    rows.length > 0 &&
    rows[rows.length - 1].every((cell) => cell.trim() === "")
  ) {
    rows.pop();
  }

  return rows;
}

/**
 * Parse an amount string into integer paise.
 * Rules:
 *  - Strip currency prefixes/suffixes and spaces
 *  - Strip all commas (both Western 1,000,000 and Indian 10,00,000)
 *  - Must have at most 2 decimal places. 3+ decimals -> error
 *  - Returns integer paise
 */
export function parseAmountToPaise(
  raw: string | undefined | null
): { success: true; paise: number; isNegative: boolean } | { success: false; error: string } {
  if (!raw || raw.trim() === "") {
    return { success: false, error: "Empty amount" };
  }

  let str = raw.trim();

  // Handle accounting format (1,234.50) as negative
  let isNegative = false;
  if (str.startsWith("(") && str.endsWith(")")) {
    isNegative = true;
    str = str.slice(1, -1).trim();
  }

  // Strip currency symbols and common indicators
  str = str.replace(/[₹$€£\s]|INR|Rs\.?|Dr\.?|Cr\.?/gi, "").trim();

  if (str.startsWith("-")) {
    isNegative = true;
    str = str.substring(1).trim();
  } else if (str.startsWith("+")) {
    str = str.substring(1).trim();
  }

  if (str === "") {
    return { success: false, error: "Amount contains no numeric digits" };
  }

  // Remove grouping commas
  str = str.replace(/,/g, "");

  // Check valid decimal format
  if (!/^\d+(\.\d+)?$/.test(str)) {
    return { success: false, error: `Invalid amount format: "${raw}"` };
  }

  const parts = str.split(".");
  const integerPart = parts[0];
  const decimalPart = parts[1] || "";

  if (decimalPart.length > 2) {
    return {
      success: false,
      error: `Amount "${raw}" has ${decimalPart.length} decimal places (max 2 allowed)`,
    };
  }

  const paddedDecimal = decimalPart.padEnd(2, "0");
  const paiseStr = `${integerPart}${paddedDecimal}`;
  const parsedPaise = parseInt(paiseStr, 10);

  if (isNaN(parsedPaise)) {
    return { success: false, error: `Could not parse amount: "${raw}"` };
  }

  return {
    success: true,
    paise: isNegative ? -parsedPaise : parsedPaise,
    isNegative,
  };
}

/**
 * Month name abbreviations for DD-MMM-YYYY
 */
const MONTH_MAP: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Parse date string to 'YYYY-MM-DD'
 */
export function parseDateToKolkataYYYYMMDD(
  raw: string | undefined | null,
  format: DateFormat
): { success: true; dateStr: string } | { success: false; error: string } {
  if (!raw || raw.trim() === "") {
    return { success: false, error: "Empty date" };
  }

  const str = raw.trim();
  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;

  switch (format) {
    case "DD/MM/YYYY": {
      const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (!match) return { success: false, error: `Invalid DD/MM/YYYY format: "${str}"` };
      day = parseInt(match[1], 10);
      month = parseInt(match[2], 10);
      year = parseInt(match[3], 10);
      break;
    }
    case "DD/MM/YY": {
      const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
      if (!match) return { success: false, error: `Invalid DD/MM/YY format: "${str}"` };
      day = parseInt(match[1], 10);
      month = parseInt(match[2], 10);
      const yy = parseInt(match[3], 10);
      year = 2000 + yy;
      break;
    }
    case "DD-MM-YYYY": {
      const match = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
      if (!match) return { success: false, error: `Invalid DD-MM-YYYY format: "${str}"` };
      day = parseInt(match[1], 10);
      month = parseInt(match[2], 10);
      year = parseInt(match[3], 10);
      break;
    }
    case "DD-MMM-YYYY": {
      const match = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
      if (!match) return { success: false, error: `Invalid DD-MMM-YYYY format: "${str}"` };
      day = parseInt(match[1], 10);
      const mName = match[2].toUpperCase();
      month = MONTH_MAP[mName] || null;
      if (!month) return { success: false, error: `Unknown month abbreviation: "${match[2]}"` };
      year = parseInt(match[3], 10);
      break;
    }
    case "YYYY-MM-DD": {
      const match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (!match) return { success: false, error: `Invalid YYYY-MM-DD format: "${str}"` };
      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10);
      day = parseInt(match[3], 10);
      break;
    }
    default:
      return { success: false, error: `Unsupported date format: ${format}` };
  }

  if (month < 1 || month > 12) {
    return { success: false, error: `Invalid month: ${month}` };
  }

  const maxDays = daysInMonth(year, month);
  if (day < 1 || day > maxDays) {
    return {
      success: false,
      error: `Invalid day ${day} for month ${month}/${year} (max ${maxDays} days)`,
    };
  }

  const yyyy = String(year);
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return { success: true, dateStr: `${yyyy}-${mm}-${dd}` };
}

/**
 * Suggest mapping based purely on header keywords (no bank-specific logic).
 */
export function suggestMappingFromHeaders(headers: string[]): CsvMapping {
  let dateCol = "";
  let narrationCol = "";
  let refCol = "";
  let chqCol = "";
  let balCol = "";
  let debitCol = "";
  let creditCol = "";
  let amountCol = "";
  let indicatorCol = "";

  headers.forEach((h) => {
    const raw = h.trim();
    const lower = raw.toLowerCase();

    // Check date
    if (!dateCol && /(value.*date|txn.*date|trans.*date|^date$|posting.*date)/i.test(lower)) {
      dateCol = raw;
    } else if (!dateCol && /date/i.test(lower)) {
      dateCol = raw;
    }

    // Check narration
    if (!narrationCol && /(narration|description|particulars|remarks|details)/i.test(lower)) {
      narrationCol = raw;
    }

    // Check bank ref / UTR
    if (!refCol && /(ref.*no|reference|utr|txn.*id|transaction.*id)/i.test(lower)) {
      refCol = raw;
    }

    // Check cheque no
    if (!chqCol && /(chq|cheque|check.*no)/i.test(lower)) {
      chqCol = raw;
    }

    // Check balance
    if (!balCol && /(closing.*bal|balance|bal)/i.test(lower)) {
      balCol = raw;
    }

    // Check debit
    if (!debitCol && /(withdrawal|debit|dr(\.|\b)|dr_amount)/i.test(lower) && !/dr.*cr/i.test(lower)) {
      debitCol = raw;
    }

    // Check credit
    if (!creditCol && /(deposit|credit|cr(\.|\b)|cr_amount)/i.test(lower) && !/dr.*cr/i.test(lower)) {
      creditCol = raw;
    }

    // Check generic amount
    if (!amountCol && /(^amount$|txn.*amount|transaction.*amount)/i.test(lower)) {
      amountCol = raw;
    }

    // Check indicator (Dr/Cr column)
    if (!indicatorCol && /(dr.*cr|cr.*dr|type|indicator)/i.test(lower)) {
      indicatorCol = raw;
    }
  });

  // Decide amount mode
  let amountMode: AmountMode = "separate";
  if (debitCol && creditCol) {
    amountMode = "separate";
  } else if (amountCol && indicatorCol) {
    amountMode = "indicator";
  } else if (amountCol) {
    amountMode = "signed";
  }

  // Fallbacks if not detected
  if (!dateCol && headers.length > 0) dateCol = headers[0];
  if (!narrationCol && headers.length > 1) narrationCol = headers[1];

  return {
    header_row_index: 0,
    date_column: dateCol || "Date",
    narration_column: narrationCol || "Narration",
    bank_ref_column: refCol || null,
    cheque_no_column: chqCol || null,
    balance_column: balCol || null,
    amount_mode: amountMode,
    debit_column: debitCol || null,
    credit_column: creditCol || null,
    amount_column: amountCol || null,
    indicator_column: indicatorCol || null,
    date_format: "DD/MM/YYYY",
  };
}

/**
 * Normalized narration for row_hash calculation:
 * trimmed, lowercase, collapsed whitespace.
 */
export function normalizeNarration(narration: string): string {
  return narration.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Parse parsed CSV rows with a specified mapping.
 * Calculates row_hash with ordinal for deduplication.
 */
export function processCsvRows(
  rows: string[][],
  mapping: CsvMapping
): {
  validRows: ParsedRowResult[];
  errors: BankStatementImportError[];
  totalRows: number;
} {
  const headerIdx = mapping.header_row_index;
  if (rows.length <= headerIdx) {
    return {
      validRows: [],
      errors: [{ row_no: headerIdx + 1, message: "Header row index out of range" }],
      totalRows: 0,
    };
  }

  const headers = rows[headerIdx].map((h) => h.trim());
  const colIndexMap = new Map<string, number>();
  headers.forEach((h, idx) => {
    colIndexMap.set(h, idx);
    colIndexMap.set(h.toLowerCase(), idx);
  });

  function getColIndex(colName?: string | null): number {
    if (!colName) return -1;
    if (colIndexMap.has(colName)) return colIndexMap.get(colName)!;
    if (colIndexMap.has(colName.toLowerCase())) return colIndexMap.get(colName.toLowerCase())!;
    return -1;
  }

  const dateIdx = getColIndex(mapping.date_column);
  const narrationIdx = getColIndex(mapping.narration_column);
  const refIdx = getColIndex(mapping.bank_ref_column);
  const chqIdx = getColIndex(mapping.cheque_no_column);
  const balIdx = getColIndex(mapping.balance_column);

  const debitIdx = getColIndex(mapping.debit_column);
  const creditIdx = getColIndex(mapping.credit_column);
  const amountIdx = getColIndex(mapping.amount_column);
  const indicatorIdx = getColIndex(mapping.indicator_column);

  const validRows: ParsedRowResult[] = [];
  const errors: BankStatementImportError[] = [];

  // Map to track occurrence index (ordinal) for identical rows within this statement
  const ordinalMap = new Map<string, number>();

  const dataRows = rows.slice(headerIdx + 1);
  const totalRows = dataRows.length;

  for (let r = 0; r < dataRows.length; r++) {
    const row = dataRows[r];
    const rowNo = headerIdx + 2 + r; // 1-based line number for user

    // Skip entirely empty row
    if (row.every((cell) => cell.trim() === "")) {
      continue;
    }

    // 1. Date
    if (dateIdx === -1 || dateIdx >= row.length) {
      errors.push({ row_no: rowNo, message: `Missing date column "${mapping.date_column}"` });
      continue;
    }
    const rawDate = row[dateIdx];
    const dateRes = parseDateToKolkataYYYYMMDD(rawDate, mapping.date_format);
    if (!dateRes.success) {
      errors.push({ row_no: rowNo, message: `Row ${rowNo}: ${dateRes.error}` });
      continue;
    }
    const valueDate = dateRes.dateStr;

    // 2. Narration
    let narration = "";
    if (narrationIdx !== -1 && narrationIdx < row.length) {
      narration = row[narrationIdx].trim();
    }
    if (!narration) {
      narration = "Transaction";
    }

    // 3. Bank Ref & Cheque No
    const bankRef = refIdx !== -1 && refIdx < row.length ? row[refIdx].trim() || null : null;
    const chequeNo = chqIdx !== -1 && chqIdx < row.length ? row[chqIdx].trim() || null : null;

    // 4. Amount parsing based on amount_mode
    let debitPaise = 0;
    let creditPaise = 0;
    let amountError: string | null = null;

    if (mapping.amount_mode === "separate") {
      const rawDebit = debitIdx !== -1 && debitIdx < row.length ? row[debitIdx].trim() : "";
      const rawCredit = creditIdx !== -1 && creditIdx < row.length ? row[creditIdx].trim() : "";

      const hasDebit = rawDebit !== "" && rawDebit !== "0" && rawDebit !== "0.00";
      const hasCredit = rawCredit !== "" && rawCredit !== "0" && rawCredit !== "0.00";

      if (hasDebit && hasCredit) {
        amountError = "Both debit and credit amounts are present";
      } else if (!hasDebit && !hasCredit) {
        amountError = "Neither debit nor credit amount found";
      } else if (hasDebit) {
        const p = parseAmountToPaise(rawDebit);
        if (!p.success) {
          amountError = `Debit: ${p.error}`;
        } else {
          const val = Math.abs(p.paise);
          if (val === 0) amountError = "Debit amount is 0";
          else debitPaise = val;
        }
      } else {
        const p = parseAmountToPaise(rawCredit);
        if (!p.success) {
          amountError = `Credit: ${p.error}`;
        } else {
          const val = Math.abs(p.paise);
          if (val === 0) amountError = "Credit amount is 0";
          else creditPaise = val;
        }
      }
    } else if (mapping.amount_mode === "signed") {
      const rawAmount = amountIdx !== -1 && amountIdx < row.length ? row[amountIdx].trim() : "";
      if (!rawAmount) {
        amountError = "Missing amount";
      } else {
        const p = parseAmountToPaise(rawAmount);
        if (!p.success) {
          amountError = p.error;
        } else {
          if (p.paise < 0) {
            debitPaise = Math.abs(p.paise);
          } else if (p.paise > 0) {
            creditPaise = p.paise;
          } else {
            amountError = "Amount cannot be zero";
          }
        }
      }
    } else if (mapping.amount_mode === "indicator") {
      const rawAmount = amountIdx !== -1 && amountIdx < row.length ? row[amountIdx].trim() : "";
      const rawInd = indicatorIdx !== -1 && indicatorIdx < row.length ? row[indicatorIdx].trim() : "";

      if (!rawAmount) {
        amountError = "Missing amount";
      } else {
        const p = parseAmountToPaise(rawAmount);
        if (!p.success) {
          amountError = p.error;
        } else {
          const val = Math.abs(p.paise);
          if (val === 0) {
            amountError = "Amount cannot be zero";
          } else {
            const indLower = rawInd.toLowerCase();
            if (/(^dr|debit|w)/i.test(indLower)) {
              debitPaise = val;
            } else if (/(^cr|credit|d)/i.test(indLower)) {
              creditPaise = val;
            } else {
              amountError = `Unrecognized Dr/Cr indicator: "${rawInd}"`;
            }
          }
        }
      }
    }

    if (amountError) {
      errors.push({ row_no: rowNo, message: `Row ${rowNo}: ${amountError}` });
      continue;
    }

    // 5. Balance after
    let balanceAfterPaise: number | null = null;
    if (balIdx !== -1 && balIdx < row.length) {
      const rawBal = row[balIdx].trim();
      if (rawBal !== "") {
        const balParsed = parseAmountToPaise(rawBal);
        if (balParsed.success) {
          balanceAfterPaise = balParsed.paise;
        }
      }
    }

    // 6. Compute row_hash with ordinal
    const normNarr = normalizeNarration(narration);
    const balanceKey = balanceAfterPaise != null ? String(balanceAfterPaise) : "";
    const signature = `${valueDate}|${debitPaise}|${creditPaise}|${balanceKey}|${normNarr}`;

    const ordinal = ordinalMap.get(signature) || 0;
    ordinalMap.set(signature, ordinal + 1);

    const hashPayload = `${signature}|${ordinal}`;
    const rowHash = crypto.createHash("sha256").update(hashPayload).digest("hex");

    validRows.push({
      row_no: rowNo,
      value_date: valueDate,
      narration,
      bank_ref: bankRef,
      cheque_no: chequeNo,
      debit_paise: debitPaise,
      credit_paise: creditPaise,
      balance_after_paise: balanceAfterPaise,
      row_hash: rowHash,
    });
  }

  return {
    validRows,
    errors,
    totalRows,
  };
}

/**
 * Balance continuity check when balance column is mapped.
 * Compares running balance vs balance_after; returns mismatch count
 * and warning "sign convention may be wrong" when mismatches > 20%.
 * Non-blocking.
 */
export function checkBalanceContinuity(rows: ParsedRowResult[]): BalanceCheckResult {
  const rowsWithBal = rows.filter((r) => r.balance_after_paise != null);
  if (rowsWithBal.length < 2) {
    return {
      checked: false,
      total_checked: rowsWithBal.length,
      mismatches: 0,
    };
  }

  // Check both Ascending (earliest date first) and Descending hypotheses
  let ascMismatches = 0;
  let descMismatches = 0;
  const total = rowsWithBal.length - 1;

  // Hypothesis A: Chronological top-to-bottom (running balance = prev + credit - debit)
  for (let i = 1; i < rowsWithBal.length; i++) {
    const prev = rowsWithBal[i - 1].balance_after_paise!;
    const curr = rowsWithBal[i].balance_after_paise!;
    const expected = prev + rowsWithBal[i].credit_paise - rowsWithBal[i].debit_paise;
    if (Math.abs(expected - curr) > 1) {
      // allowing 1 paise rounding
      ascMismatches++;
    }
  }

  // Hypothesis B: Reverse chronological top-to-bottom (newer row first, so curr was before next: next = curr - credit + debit)
  for (let i = 1; i < rowsWithBal.length; i++) {
    const nextNewer = rowsWithBal[i - 1].balance_after_paise!;
    const prevOlder = rowsWithBal[i].balance_after_paise!;
    // Older row + newer credit - newer debit = newer row
    const expected = prevOlder + rowsWithBal[i - 1].credit_paise - rowsWithBal[i - 1].debit_paise;
    if (Math.abs(expected - nextNewer) > 1) {
      descMismatches++;
    }
  }

  const bestMismatches = Math.min(ascMismatches, descMismatches);
  const mismatchRatio = total > 0 ? bestMismatches / total : 0;

  let warning: string | null = null;
  if (mismatchRatio > 0.2) {
    warning = "sign convention may be wrong";
  }

  return {
    checked: true,
    total_checked: total,
    mismatches: bestMismatches,
    warning,
  };
}
