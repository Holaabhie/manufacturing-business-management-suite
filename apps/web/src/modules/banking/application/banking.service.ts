import crypto from "crypto";
import { AppError, ErrorCode } from "@/shared/lib/errors";
import type {
  BankAccount,
  BankStatementImport,
  BankTransaction,
  BankMatchLink,
  CandidatePayment,
  CsvMapping,
  ExcludeReason,
  PreviewResult,
  ReconciliationSummary,
  TransactionFilters,
  TransactionsSummary,
  VarianceReason,
} from "../domain/types";
import {
  createBankAccountSchema,
  updateBankAccountSchema,
  csvMappingSchema,
  CreateBankAccountInput,
  UpdateBankAccountInput,
  CsvMappingInput,
  MatchLinkItemInput,
  CandidateFilterInput,
} from "../domain/schemas";
import {
  decodeCsvBuffer,
  parseRfc4180Csv,
  suggestMappingFromHeaders,
  processCsvRows,
  checkBalanceContinuity,
  MAX_FILE_SIZE_BYTES,
  MAX_ROWS_LIMIT,
} from "./csv-parser";
import {
  MongoBankingRepository,
  getBankingRepository,
} from "../infrastructure/banking.repository";

export class BankingService {
  constructor(private repo: MongoBankingRepository) {}

  // ─── Bank Accounts ──────────────────────────────────────────────

  async listAccounts(userId: string): Promise<BankAccount[]> {
    return this.repo.listAccounts(userId);
  }

  async getAccountById(id: string, userId: string): Promise<BankAccount | null> {
    return this.repo.findAccountById(id, userId);
  }

  async createAccount(
    userId: string,
    createdBy: string,
    input: CreateBankAccountInput
  ): Promise<BankAccount> {
    const validated = createBankAccountSchema.parse(input);

    // Check unique { userId, bank_name, account_last4 }
    const existing = await this.repo.findAccountByBankAndLast4(
      validated.bank_name,
      validated.account_last4,
      userId
    );
    if (existing) {
      throw new AppError(
        `Account with ${validated.bank_name} ending in ${validated.account_last4} already exists`,
        ErrorCode.CONFLICT,
        409
      );
    }

    const account: BankAccount = {
      id: crypto.randomUUID(),
      userId,
      name: validated.name,
      bank_name: validated.bank_name,
      account_last4: validated.account_last4,
      ifsc: validated.ifsc || null,
      account_type: validated.account_type,
      opening_balance_paise: validated.opening_balance_paise ?? null,
      opening_balance_date: validated.opening_balance_date || null,
      status: "Active",
      created_by: createdBy,
      created_at: new Date(),
      updated_at: new Date(),
    };

    try {
      return await this.repo.createAccount(account);
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new AppError(
          `Account with ${validated.bank_name} ending in ${validated.account_last4} already exists`,
          ErrorCode.CONFLICT,
          409
        );
      }
      throw err;
    }
  }

  async updateAccount(
    id: string,
    userId: string,
    input: UpdateBankAccountInput
  ): Promise<BankAccount> {
    const validated = updateBankAccountSchema.parse(input);
    const existing = await this.repo.findAccountById(id, userId);
    if (!existing) {
      throw new AppError("Bank account not found", ErrorCode.NOT_FOUND, 404);
    }

    const updated = await this.repo.updateAccount(id, userId, validated);
    if (!updated) {
      throw new AppError("Bank account not found", ErrorCode.NOT_FOUND, 404);
    }
    return updated;
  }

  async deleteAccount(id: string, userId: string): Promise<void> {
    const existing = await this.repo.findAccountById(id, userId);
    if (!existing) {
      throw new AppError("Bank account not found", ErrorCode.NOT_FOUND, 404);
    }

    // Check if any imports exist for this account
    const importsCount = await this.repo.countImportsForAccount(id, userId);
    if (importsCount > 0) {
      throw new AppError(
        "Cannot delete bank account with existing statement imports. Please close the account instead.",
        ErrorCode.CONFLICT,
        409
      );
    }

    await this.repo.deleteAccount(id, userId);
  }

  // ─── Preview & Parse ────────────────────────────────────────────

  async previewImport(
    userId: string,
    bankAccountId: string,
    fileBuffer: Buffer,
    fileName: string,
    mappingOverride?: Partial<CsvMappingInput> | null
  ): Promise<PreviewResult> {
    // 1. Verify account belongs to tenant
    const account = await this.repo.findAccountById(bankAccountId, userId);
    if (!account) {
      throw new AppError("Bank account not found", ErrorCode.NOT_FOUND, 404);
    }

    // 2. Check file size cap (5 MB)
    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      throw new AppError(
        `File size (${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds the 5 MB limit`,
        ErrorCode.VALIDATION_FAILED,
        400
      );
    }

    // 3. File hash and check for duplicate committed import
    const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    const existingImport = await this.repo.findCommittedImportByHash(
      bankAccountId,
      fileHash,
      userId
    );

    // 4. Decode text
    const { text, encoding } = decodeCsvBuffer(fileBuffer);

    // 5. Parse CSV
    const rows = parseRfc4180Csv(text);
    if (rows.length > MAX_ROWS_LIMIT) {
      throw new AppError(
        `File has ${rows.length} rows, which exceeds the 20,000 rows limit`,
        ErrorCode.VALIDATION_FAILED,
        400
      );
    }

    if (rows.length === 0) {
      throw new AppError("The uploaded CSV file is empty", ErrorCode.VALIDATION_FAILED, 400);
    }

    // 6. Resolve mapping
    const headerRow = rows[0] || [];
    const suggested = suggestMappingFromHeaders(headerRow);
    const lastUsed = account.mapping_profile || null;

    let finalMapping: CsvMapping = {
      ...suggested,
      ...(lastUsed || {}),
      ...(mappingOverride || {}),
    };

    // Validate final mapping
    finalMapping = csvMappingSchema.parse(finalMapping);

    // 7. Process rows
    const { validRows, errors, totalRows } = processCsvRows(rows, finalMapping);

    // 8. Balance continuity check
    const balanceCheck = checkBalanceContinuity(validRows);

    return {
      file_hash: fileHash,
      file_name: fileName,
      file_size: fileBuffer.length,
      encoding_detected: encoding,
      rows_total: totalRows,
      rows_valid: validRows.length,
      rows_error: errors.length,
      preview_rows: validRows.slice(0, 10),
      errors: errors.slice(0, 100),
      balance_check: balanceCheck,
      suggested_mapping: suggested,
      already_imported: Boolean(existingImport),
      existing_import_id: existingImport ? existingImport.id : null,
    };
  }

  // ─── Commit Import ──────────────────────────────────────────────

  async commitImport(
    userId: string,
    importedBy: string,
    bankAccountId: string,
    fileBuffer: Buffer,
    fileName: string,
    mappingInput: CsvMappingInput
  ): Promise<BankStatementImport> {
    // 1. Verify account belongs to tenant
    const account = await this.repo.findAccountById(bankAccountId, userId);
    if (!account) {
      throw new AppError("Bank account not found", ErrorCode.NOT_FOUND, 404);
    }

    // 2. Enforce limits
    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      throw new AppError("File size exceeds 5 MB limit", ErrorCode.VALIDATION_FAILED, 400);
    }

    const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    // 3. Block same file_hash for this account if already committed (409 with original import_id)
    const existingImport = await this.repo.findCommittedImportByHash(
      bankAccountId,
      fileHash,
      userId
    );
    if (existingImport) {
      throw new AppError(
        `This statement file has already been imported on ${new Date(existingImport.created_at).toLocaleDateString()}`,
        ErrorCode.CONFLICT,
        409,
        { existing_import_id: existingImport.id }
      );
    }

    // 4. Validate mapping
    const mapping = csvMappingSchema.parse(mappingInput);

    // 5. Decode and parse
    const { text, encoding } = decodeCsvBuffer(fileBuffer);
    const rows = parseRfc4180Csv(text);
    if (rows.length > MAX_ROWS_LIMIT) {
      throw new AppError("File exceeds 20,000 rows limit", ErrorCode.VALIDATION_FAILED, 400);
    }

    // 6. Process rows
    const { validRows, errors, totalRows } = processCsvRows(rows, mapping);

    const importId = crypto.randomUUID();

    // 7. Convert valid rows to BankTransaction entities
    const transactions: BankTransaction[] = validRows.map((r) => ({
      id: crypto.randomUUID(),
      userId,
      bank_account_id: bankAccountId,
      import_id: importId,
      row_no: r.row_no,
      value_date: r.value_date,
      narration: r.narration,
      bank_ref: r.bank_ref || null,
      cheque_no: r.cheque_no || null,
      debit_paise: r.debit_paise,
      credit_paise: r.credit_paise,
      balance_after_paise: r.balance_after_paise ?? null,
      row_hash: r.row_hash || null,
      reverted: false,
      allocated_paise: 0,
      created_at: new Date(),
    }));

    // 8. Insert transactions, deduplicating row_hash
    const { inserted, skippedDuplicates } = await this.repo.insertTransactions(transactions);

    // 9. Save last used mapping profile on the bank account
    await this.repo.updateAccount(bankAccountId, userId, {
      mapping_profile: mapping,
    });

    // 10. Create bank_statement_imports record
    const importDoc: BankStatementImport = {
      id: importId,
      userId,
      bank_account_id: bankAccountId,
      file_name: fileName,
      file_hash: fileHash,
      file_size: fileBuffer.length,
      encoding_detected: encoding,
      mapping,
      rows_total: totalRows,
      rows_inserted: inserted,
      rows_skipped_duplicate: skippedDuplicates,
      rows_error: errors.length,
      errors: errors.slice(0, 100),
      status: "Committed",
      imported_by: importedBy,
      created_at: new Date(),
      reverted_at: null,
      reverted_by: null,
      revert_reason: null,
    };

    try {
      return await this.repo.createImport(importDoc);
    } catch (err: any) {
      if (err?.code === 11000) {
        const existing = await this.repo.findCommittedImportByHash(
          bankAccountId,
          fileHash,
          userId
        );
        throw new AppError(
          `This statement file has already been imported on ${existing ? new Date(existing.created_at).toLocaleDateString() : "earlier"}`,
          ErrorCode.CONFLICT,
          409,
          { existing_import_id: existing?.id || null }
        );
      }
      throw err;
    }
  }

  // ─── Imports List & Revert ──────────────────────────────────────

  async listImports(userId: string, bankAccountId?: string): Promise<BankStatementImport[]> {
    return this.repo.listImports(userId, bankAccountId);
  }

  async getImportById(id: string, userId: string): Promise<BankStatementImport | null> {
    return this.repo.findImportById(id, userId);
  }

  async revertImport(
    id: string,
    userId: string,
    revertedBy: string,
    reason: string
  ): Promise<BankStatementImport> {
    if (!reason || reason.trim() === "") {
      throw new AppError("Revert reason is required", ErrorCode.VALIDATION_FAILED, 400);
    }

    const importDoc = await this.repo.findImportById(id, userId);
    if (!importDoc) {
      throw new AppError("Bank statement import not found", ErrorCode.NOT_FOUND, 404);
    }

    if (importDoc.status === "Reverted") {
      throw new AppError("This import has already been reverted", ErrorCode.BUSINESS_RULE_VIOLATION, 400);
    }

    // Check if any transactions in this import are linked or allocated
    const hasLinks = await this.repo.hasActiveLinksForImport(id, userId);
    if (hasLinks) {
      throw new AppError(
        "Cannot revert import because some transactions are already matched or linked. Please unlink them first.",
        ErrorCode.CONFLICT,
        409
      );
    }

    // 1. Mark transactions as reverted and unset row_hash
    await this.repo.revertTransactionsByImportId(id, userId);

    // 2. Update import document
    const updated = await this.repo.markImportReverted(
      id,
      userId,
      revertedBy,
      reason.trim()
    );
    if (!updated) {
      throw new AppError("Failed to revert import", ErrorCode.INTERNAL_ERROR, 500);
    }
    return updated;
  }

  // ─── Transactions List ──────────────────────────────────────────

  async listTransactions(
    userId: string,
    filters: TransactionFilters
  ): Promise<{
    transactions: BankTransaction[];
    total: number;
    summary: TransactionsSummary;
  }> {
    return this.repo.listTransactions(userId, filters);
  }

  async getTransactionById(id: string, userId: string): Promise<BankTransaction | null> {
    return this.repo.findTransactionById(id, userId);
  }

  // ─── Phase 7b: Matching, Linking & Reconciliation ───────────────

  async getSuggestions(txId: string, userId: string): Promise<CandidatePayment[]> {
    return this.repo.findSuggestionsForTransaction(txId, userId);
  }

  async searchCandidates(
    userId: string,
    filters: CandidateFilterInput
  ): Promise<CandidatePayment[]> {
    return this.repo.searchCandidatePayments(userId, filters);
  }

  async getLinksForTransaction(txId: string, userId: string): Promise<BankMatchLink[]> {
    return this.repo.findLinksForTransaction(txId, userId);
  }

  async createLinks(
    txId: string,
    userId: string,
    links: MatchLinkItemInput[],
    userIdentifier: string,
    idempotencyKey?: string | null
  ): Promise<BankMatchLink[]> {
    if (!links || links.length === 0) {
      throw new AppError("At least one link is required", ErrorCode.VALIDATION_FAILED, 400);
    }

    const tx = await this.repo.findTransactionById(txId, userId);
    if (!tx) {
      throw new AppError("Bank transaction not found", ErrorCode.NOT_FOUND, 404);
    }
    if (tx.reverted) {
      throw new AppError("Cannot link a reverted transaction", ErrorCode.VALIDATION_FAILED, 400);
    }
    if (tx.excluded) {
      throw new AppError("Cannot link an excluded transaction. Please unexclude it first.", ErrorCode.VALIDATION_FAILED, 400);
    }

    const isCredit = tx.credit_paise > 0;
    const isDebit = tx.debit_paise > 0;
    if (!isCredit && !isDebit) {
      throw new AppError("Cannot link transaction with zero amount", ErrorCode.VALIDATION_FAILED, 400);
    }

    // Direction check
    for (const item of links) {
      if (isCredit && item.entity_type !== "payment") {
        throw new AppError(
          "Direction mismatch: Credit transaction can only be linked to payments",
          ErrorCode.VALIDATION_FAILED,
          400
        );
      }
      if (isDebit && item.entity_type !== "vendor_bill_payment") {
        throw new AppError(
          "Direction mismatch: Debit transaction can only be linked to vendor bill payments",
          ErrorCode.VALIDATION_FAILED,
          400
        );
      }
    }

    // Collect snapshots and sum up allocated paise
    let totalAllocatingPaise = 0;
    const linksData: Omit<BankMatchLink, "id">[] = [];

    for (const item of links) {
      const snap = await this.repo.getEntitySnapshot(
        item.entity_type,
        item.entity_id,
        userId
      );
      totalAllocatingPaise += snap.amount_paise;
      linksData.push({
        userId,
        bank_transaction_id: txId,
        bank_account_id: tx.bank_account_id,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        allocated_paise: snap.amount_paise,
        snapshot: snap.snapshot,
        status: "Active",
        created_by: userIdentifier,
        created_at: new Date(),
        unlinked_by: null,
        unlinked_at: null,
        unlink_reason: null,
        idempotency_key: idempotencyKey || null,
      });
    }

    return this.repo.atomicAllocateAndCreateLinks(
      txId,
      userId,
      totalAllocatingPaise,
      linksData
    );
  }

  async unlink(
    linkId: string,
    userId: string,
    unlinkedBy: string,
    reason?: string | null
  ): Promise<BankMatchLink> {
    const link = await this.repo.atomicUnlink(linkId, userId, unlinkedBy, reason);
    if (!link) {
      throw new AppError("Active link not found", ErrorCode.NOT_FOUND, 404);
    }
    return link;
  }

  async excludeTransaction(
    txId: string,
    userId: string,
    reason: ExcludeReason,
    note: string | null,
    by: string
  ): Promise<BankTransaction> {
    const tx = await this.repo.excludeTransaction(txId, userId, reason, note, by);
    if (!tx) {
      throw new AppError(
        "Failed to exclude transaction or transaction not found",
        ErrorCode.VALIDATION_FAILED,
        400
      );
    }
    return tx;
  }

  async unexcludeTransaction(
    txId: string,
    userId: string
  ): Promise<BankTransaction> {
    const tx = await this.repo.unexcludeTransaction(txId, userId);
    if (!tx) {
      throw new AppError("Transaction not found or not excluded", ErrorCode.NOT_FOUND, 404);
    }
    return tx;
  }

  async acceptVariance(
    txId: string,
    userId: string,
    reason: VarianceReason,
    by: string
  ): Promise<BankTransaction> {
    const tx = await this.repo.acceptVariance(txId, userId, reason, by);
    if (!tx) {
      throw new AppError("Failed to accept variance", ErrorCode.VALIDATION_FAILED, 400);
    }
    return tx;
  }

  async getReconciliationSummary(
    userId: string,
    bankAccountId?: string,
    from?: string,
    to?: string
  ): Promise<ReconciliationSummary> {
    return this.repo.getReconciliationSummary(userId, bankAccountId, from, to);
  }
}

let _service: BankingService | null = null;
export function getBankingService(): BankingService {
  if (!_service) {
    _service = new BankingService(getBankingRepository());
  }
  return _service;
}
