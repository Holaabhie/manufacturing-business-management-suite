export type BankAccountType = "Current" | "Savings" | "OD" | "CC" | "Other";
export type BankAccountStatus = "Active" | "Closed";
export type AmountMode = "separate" | "signed" | "indicator";
export type DateFormat =
  | "DD/MM/YYYY"
  | "DD/MM/YY"
  | "DD-MM-YYYY"
  | "DD-MMM-YYYY"
  | "YYYY-MM-DD";
export type ImportStatus = "Committed" | "Reverted";

export interface CsvMapping {
  header_row_index: number;
  date_column: string;
  narration_column: string;
  bank_ref_column?: string | null;
  cheque_no_column?: string | null;
  balance_column?: string | null;
  amount_mode: AmountMode;
  debit_column?: string | null;
  credit_column?: string | null;
  amount_column?: string | null;
  indicator_column?: string | null;
  date_format: DateFormat;
}

export interface BankAccount {
  id: string;
  userId: string;
  name: string;
  bank_name: string;
  account_last4: string;
  ifsc?: string | null;
  account_type: BankAccountType;
  opening_balance_paise?: number | null;
  opening_balance_date?: string | null;
  mapping_profile?: CsvMapping | null;
  status: BankAccountStatus;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface BankStatementImportError {
  row_no: number;
  message: string;
}

export interface BankStatementImport {
  id: string;
  userId: string;
  bank_account_id: string;
  file_name: string;
  file_hash: string;
  file_size: number;
  encoding_detected: string;
  mapping: CsvMapping;
  rows_total: number;
  rows_inserted: number;
  rows_skipped_duplicate: number;
  rows_error: number;
  errors: BankStatementImportError[];
  status: ImportStatus;
  imported_by: string;
  created_at: Date;
  reverted_at?: Date | null;
  reverted_by?: string | null;
  revert_reason?: string | null;
}

export type MatchStatus = "Unmatched" | "Partial" | "Matched" | "Excluded";
export type ExcludeReason =
  | "Bank charges"
  | "Interest"
  | "Internal transfer"
  | "Other";
export type VarianceReason = "TDS" | "Bank charges" | "Rounding" | "Other";

export interface BankTransactionExcluded {
  reason: ExcludeReason;
  note?: string | null;
  by: string;
  at: Date | string;
}

export interface BankTransactionVariance {
  paise: number;
  reason: VarianceReason;
  by: string;
  at: Date | string;
}

export interface BankTransaction {
  id: string;
  userId: string;
  bank_account_id: string;
  import_id: string;
  row_no: number;
  value_date: string; // 'YYYY-MM-DD'
  narration: string;
  bank_ref?: string | null;
  cheque_no?: string | null;
  debit_paise: number;
  credit_paise: number;
  balance_after_paise?: number | null;
  row_hash?: string | null;
  reverted: boolean;
  created_at: Date;
  // Phase 7b Additive Fields
  allocated_paise: number;
  excluded?: BankTransactionExcluded | null;
  variance?: BankTransactionVariance | null;
  // Derived at read time
  match_status?: MatchStatus;
  links_count?: number;
  needs_review?: boolean;
}

export type MatchEntityType = "payment" | "vendor_bill_payment";
export type MatchLinkStatus = "Active" | "Unlinked";

export interface MatchLinkSnapshot {
  amount_paise: number;
  date: string;
  party_name: string;
  reference: string;
}

export interface BankMatchLink {
  id: string;
  userId: string;
  bank_transaction_id: string;
  bank_account_id: string;
  entity_type: MatchEntityType;
  entity_id: string;
  allocated_paise: number;
  snapshot: MatchLinkSnapshot;
  status: MatchLinkStatus;
  created_by: string;
  created_at: Date;
  unlinked_by?: string | null;
  unlinked_at?: Date | null;
  unlink_reason?: string | null;
  idempotency_key?: string | null;
  needs_review?: boolean;
}

export interface SuggestionReason {
  amount_exact: boolean;
  date_diff_n: number;
  reference_in_narration: boolean;
}

export interface CandidatePayment {
  entity_type: MatchEntityType;
  entity_id: string;
  amount_paise: number;
  amount: number;
  date: string;
  party_name: string;
  reference: string;
  payment_method: string;
  is_cash: boolean;
  reasons?: SuggestionReason;
  score?: number;
}

export interface ParsedRowResult {
  row_no: number;
  value_date: string;
  narration: string;
  bank_ref?: string | null;
  cheque_no?: string | null;
  debit_paise: number;
  credit_paise: number;
  balance_after_paise?: number | null;
  row_hash?: string;
  error?: string | null;
}

export interface BalanceCheckResult {
  checked: boolean;
  total_checked: number;
  mismatches: number;
  warning?: string | null;
}

export interface PreviewResult {
  file_hash: string;
  file_name: string;
  file_size: number;
  encoding_detected: string;
  rows_total: number;
  rows_valid: number;
  rows_error: number;
  preview_rows: ParsedRowResult[];
  errors: BankStatementImportError[];
  balance_check: BalanceCheckResult;
  suggested_mapping: CsvMapping;
  already_imported: boolean;
  existing_import_id?: string | null;
}

export interface TransactionsSummary {
  total_credit_paise: number;
  total_debit_paise: number;
  count: number;
}

export interface ReconciliationStatusSummary {
  count: number;
  total_paise: number;
}

export interface ReconciliationSummary {
  unmatched: ReconciliationStatusSummary;
  partial: ReconciliationStatusSummary;
  matched: ReconciliationStatusSummary;
  excluded: ReconciliationStatusSummary;
  needs_review_count: number;
}

export interface TransactionFilters {
  account?: string;
  from?: string;
  to?: string;
  direction?: "all" | "credit" | "debit";
  match_status?: MatchStatus | "all";
  needs_review?: boolean | "true" | "false";
  search?: string;
  import_id?: string;
  page?: number;
  limit?: number;
}

