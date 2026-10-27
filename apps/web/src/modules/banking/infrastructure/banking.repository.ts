import { ObjectId, type Document, type Filter } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { ensureBankingIndexes } from "@/lib/migrations/ensureBankingIndexes";
import { AppError, ErrorCode } from "@/shared/lib/errors";
import type {
  BankAccount,
  BankStatementImport,
  BankTransaction,
  BankMatchLink,
  CandidatePayment,
  ExcludeReason,
  MatchEntityType,
  MatchLinkSnapshot,
  MatchStatus,
  ReconciliationSummary,
  TransactionFilters,
  TransactionsSummary,
  VarianceReason,
} from "../domain/types";
import type { CandidateFilterInput } from "../domain/schemas";

type BaseDoc = Document & { _id: ObjectId | string; userId?: string };

function buildIdQuery(id: string, userId: string): Filter<BaseDoc> {
  if (ObjectId.isValid(id)) {
    return {
      _id: { $in: [new ObjectId(id), id] },
      userId,
    };
  }
  return { _id: id, userId };
}

function toAccountEntity(doc: Document): BankAccount {
  return {
    id: String(doc._id),
    userId: String(doc.userId || ""),
    name: String(doc.name || ""),
    bank_name: String(doc.bank_name || ""),
    account_last4: String(doc.account_last4 || ""),
    ifsc: doc.ifsc ? String(doc.ifsc) : null,
    account_type: doc.account_type || "Current",
    opening_balance_paise:
      doc.opening_balance_paise != null ? Number(doc.opening_balance_paise) : null,
    opening_balance_date: doc.opening_balance_date ? String(doc.opening_balance_date) : null,
    mapping_profile: doc.mapping_profile || null,
    status: doc.status || "Active",
    created_by: String(doc.created_by || ""),
    created_at: doc.created_at instanceof Date ? doc.created_at : new Date(doc.created_at || Date.now()),
    updated_at: doc.updated_at instanceof Date ? doc.updated_at : new Date(doc.updated_at || Date.now()),
  };
}

function toImportEntity(doc: Document): BankStatementImport {
  return {
    id: String(doc._id),
    userId: String(doc.userId || ""),
    bank_account_id: String(doc.bank_account_id || ""),
    file_name: String(doc.file_name || ""),
    file_hash: String(doc.file_hash || ""),
    file_size: Number(doc.file_size || 0),
    encoding_detected: String(doc.encoding_detected || "UTF-8"),
    mapping: doc.mapping || {},
    rows_total: Number(doc.rows_total || 0),
    rows_inserted: Number(doc.rows_inserted || 0),
    rows_skipped_duplicate: Number(doc.rows_skipped_duplicate || 0),
    rows_error: Number(doc.rows_error || 0),
    errors: Array.isArray(doc.errors) ? doc.errors : [],
    status: doc.status || "Committed",
    imported_by: String(doc.imported_by || ""),
    created_at: doc.created_at instanceof Date ? doc.created_at : new Date(doc.created_at || Date.now()),
    reverted_at: doc.reverted_at ? (doc.reverted_at instanceof Date ? doc.reverted_at : new Date(doc.reverted_at)) : null,
    reverted_by: doc.reverted_by ? String(doc.reverted_by) : null,
    revert_reason: doc.revert_reason ? String(doc.revert_reason) : null,
  };
}

function toTransactionEntity(doc: Document): BankTransaction {
  const debitPaise = Number(doc.debit_paise || 0);
  const creditPaise = Number(doc.credit_paise || 0);
  const rowAmount = debitPaise > 0 ? debitPaise : creditPaise;
  const allocatedPaise = Number(doc.allocated_paise || 0);

  let matchStatus: MatchStatus = "Unmatched";
  if (doc.excluded) {
    matchStatus = "Excluded";
  } else if ((rowAmount > 0 && allocatedPaise === rowAmount) || doc.variance) {
    matchStatus = "Matched";
  } else if (allocatedPaise > 0 && allocatedPaise < rowAmount) {
    matchStatus = "Partial";
  } else {
    matchStatus = "Unmatched";
  }

  return {
    id: String(doc._id),
    userId: String(doc.userId || ""),
    bank_account_id: String(doc.bank_account_id || ""),
    import_id: String(doc.import_id || ""),
    row_no: Number(doc.row_no || 0),
    value_date: String(doc.value_date || ""),
    narration: String(doc.narration || ""),
    bank_ref: doc.bank_ref ? String(doc.bank_ref) : null,
    cheque_no: doc.cheque_no ? String(doc.cheque_no) : null,
    debit_paise: debitPaise,
    credit_paise: creditPaise,
    balance_after_paise: doc.balance_after_paise != null ? Number(doc.balance_after_paise) : null,
    row_hash: doc.row_hash ? String(doc.row_hash) : null,
    reverted: Boolean(doc.reverted),
    created_at: doc.created_at instanceof Date ? doc.created_at : new Date(doc.created_at || Date.now()),
    allocated_paise: allocatedPaise,
    excluded: doc.excluded
      ? {
          reason: doc.excluded.reason,
          note: doc.excluded.note || null,
          by: String(doc.excluded.by || ""),
          at: doc.excluded.at instanceof Date ? doc.excluded.at : new Date(doc.excluded.at || Date.now()),
        }
      : null,
    variance: doc.variance
      ? {
          paise: Number(doc.variance.paise || 0),
          reason: doc.variance.reason,
          by: String(doc.variance.by || ""),
          at: doc.variance.at instanceof Date ? doc.variance.at : new Date(doc.variance.at || Date.now()),
        }
      : null,
    match_status: matchStatus,
    links_count: doc.links_count != null ? Number(doc.links_count) : 0,
    needs_review: Boolean(doc.needs_review),
  };
}

function toLinkEntity(doc: Document): BankMatchLink {
  return {
    id: String(doc._id || doc.id),
    userId: String(doc.userId || ""),
    bank_transaction_id: String(doc.bank_transaction_id || ""),
    bank_account_id: String(doc.bank_account_id || ""),
    entity_type: doc.entity_type,
    entity_id: String(doc.entity_id || ""),
    allocated_paise: Number(doc.allocated_paise || 0),
    snapshot: {
      amount_paise: Number(doc.snapshot?.amount_paise || 0),
      date: String(doc.snapshot?.date || ""),
      party_name: String(doc.snapshot?.party_name || ""),
      reference: String(doc.snapshot?.reference || ""),
    },
    status: doc.status || "Active",
    created_by: String(doc.created_by || ""),
    created_at: doc.created_at instanceof Date ? doc.created_at : new Date(doc.created_at || Date.now()),
    unlinked_by: doc.unlinked_by ? String(doc.unlinked_by) : null,
    unlinked_at: doc.unlinked_at ? (doc.unlinked_at instanceof Date ? doc.unlinked_at : new Date(doc.unlinked_at)) : null,
    unlink_reason: doc.unlink_reason ? String(doc.unlink_reason) : null,
    idempotency_key: doc.idempotency_key ? String(doc.idempotency_key) : null,
    needs_review: Boolean(doc.needs_review),
  };
}

export class MongoBankingRepository {
  private async accountsCol() {
    return (await getDb()).collection<BaseDoc>("bank_accounts");
  }

  private async importsCol() {
    return (await getDb()).collection<BaseDoc>("bank_statement_imports");
  }

  private async transactionsCol() {
    return (await getDb()).collection<BaseDoc>("bank_transactions");
  }

  private async matchLinksCol() {
    return (await getDb()).collection<BaseDoc>("bank_match_links");
  }

  private async paymentsCol() {
    return (await getDb()).collection<BaseDoc>("payments");
  }

  private async vendorBillPaymentsCol() {
    return (await getDb()).collection<BaseDoc>("vendor_bill_payments");
  }

  private async clientsCol() {
    return (await getDb()).collection<BaseDoc>("clients");
  }

  private async vendorsCol() {
    return (await getDb()).collection<BaseDoc>("vendors");
  }

  constructor() {
    ensureBankingIndexes().catch(() => {});
  }

  // ─── Bank Accounts ──────────────────────────────────────────────

  async createAccount(account: BankAccount): Promise<BankAccount> {
    const col = await this.accountsCol();
    const docToInsert = {
      ...account,
      _id: account.id,
      created_at: account.created_at || new Date(),
      updated_at: account.updated_at || new Date(),
    };
    await col.insertOne(docToInsert);
    return account;
  }

  async findAccountById(id: string, userId: string): Promise<BankAccount | null> {
    const col = await this.accountsCol();
    const doc = await col.findOne(buildIdQuery(id, userId));
    return doc ? toAccountEntity(doc) : null;
  }

  async findAccountByBankAndLast4(
    bankName: string,
    last4: string,
    userId: string
  ): Promise<BankAccount | null> {
    const col = await this.accountsCol();
    const doc = await col.findOne({
      userId,
      bank_name: bankName,
      account_last4: last4,
    });
    return doc ? toAccountEntity(doc) : null;
  }

  async listAccounts(userId: string): Promise<BankAccount[]> {
    const col = await this.accountsCol();
    const docs = await col
      .find({ userId })
      .sort({ created_at: -1 })
      .toArray();
    return docs.map(toAccountEntity);
  }

  async updateAccount(
    id: string,
    userId: string,
    updates: Partial<BankAccount>
  ): Promise<BankAccount | null> {
    const col = await this.accountsCol();
    const cleanUpdates: Record<string, unknown> = {
      ...updates,
      updated_at: new Date(),
    };
    delete cleanUpdates.id;
    delete cleanUpdates._id;
    delete cleanUpdates.userId;

    const res = await col.findOneAndUpdate(
      buildIdQuery(id, userId),
      { $set: cleanUpdates },
      { returnDocument: "after" }
    );
    return res ? toAccountEntity(res) : null;
  }

  async deleteAccount(id: string, userId: string): Promise<boolean> {
    const col = await this.accountsCol();
    const res = await col.deleteOne(buildIdQuery(id, userId));
    return (res.deletedCount || 0) > 0;
  }

  async countImportsForAccount(bankAccountId: string, userId: string): Promise<number> {
    const col = await this.importsCol();
    return col.countDocuments({ bank_account_id: bankAccountId, userId });
  }

  // ─── Bank Statement Imports ─────────────────────────────────────

  async createImport(importDoc: BankStatementImport): Promise<BankStatementImport> {
    const col = await this.importsCol();
    const docToInsert = {
      ...importDoc,
      _id: importDoc.id,
      created_at: importDoc.created_at || new Date(),
    };
    await col.insertOne(docToInsert);
    return importDoc;
  }

  async findImportById(id: string, userId: string): Promise<BankStatementImport | null> {
    const col = await this.importsCol();
    const doc = await col.findOne(buildIdQuery(id, userId));
    return doc ? toImportEntity(doc) : null;
  }

  async findCommittedImportByHash(
    bankAccountId: string,
    fileHash: string,
    userId: string
  ): Promise<BankStatementImport | null> {
    const col = await this.importsCol();
    const doc = await col.findOne({
      userId,
      bank_account_id: bankAccountId,
      file_hash: fileHash,
      status: "Committed",
    });
    return doc ? toImportEntity(doc) : null;
  }

  async listImports(userId: string, bankAccountId?: string): Promise<BankStatementImport[]> {
    const col = await this.importsCol();
    const query: Record<string, unknown> = { userId };
    if (bankAccountId) {
      query.bank_account_id = bankAccountId;
    }
    const docs = await col.find(query).sort({ created_at: -1 }).toArray();
    return docs.map(toImportEntity);
  }

  async markImportReverted(
    id: string,
    userId: string,
    revertedBy: string,
    reason: string
  ): Promise<BankStatementImport | null> {
    const col = await this.importsCol();
    const now = new Date();
    const res = await col.findOneAndUpdate(
      buildIdQuery(id, userId),
      {
        $set: {
          status: "Reverted",
          reverted_at: now,
          reverted_by: revertedBy,
          revert_reason: reason,
        },
      },
      { returnDocument: "after" }
    );
    return res ? toImportEntity(res) : null;
  }

  // ─── Bank Transactions ──────────────────────────────────────────

  async insertTransactions(
    transactions: BankTransaction[]
  ): Promise<{ inserted: number; skippedDuplicates: number }> {
    if (transactions.length === 0) {
      return { inserted: 0, skippedDuplicates: 0 };
    }

    const col = await this.transactionsCol();
    const userId = transactions[0].userId;
    const bankAccountId = transactions[0].bank_account_id;

    const incomingHashes = transactions
      .map((t) => t.row_hash)
      .filter((h): h is string => Boolean(h));

    const existingDocs = await col
      .find(
        {
          userId,
          bank_account_id: bankAccountId,
          row_hash: { $in: incomingHashes },
        },
        { projection: { row_hash: 1 } }
      )
      .toArray();

    const existingHashSet = new Set(existingDocs.map((d) => d.row_hash));

    const toInsert = transactions.filter(
      (t) => !t.row_hash || !existingHashSet.has(t.row_hash)
    );
    const preSkipped = transactions.length - toInsert.length;

    if (toInsert.length === 0) {
      return { inserted: 0, skippedDuplicates: preSkipped };
    }

    const docsToInsert = toInsert.map((t) => ({
      ...t,
      _id: t.id,
      allocated_paise: 0,
      created_at: t.created_at || new Date(),
    }));

    try {
      const res = await col.insertMany(docsToInsert, { ordered: false });
      return {
        inserted: res.insertedCount,
        skippedDuplicates: preSkipped + (toInsert.length - res.insertedCount),
      };
    } catch (err: unknown) {
      const insertedCount = (err as { result?: { insertedCount?: number } })?.result?.insertedCount ?? 0;
      return {
        inserted: insertedCount,
        skippedDuplicates: preSkipped + (toInsert.length - insertedCount),
      };
    }
  }

  async revertTransactionsByImportId(importId: string, userId: string): Promise<number> {
    const col = await this.transactionsCol();
    const res = await col.updateMany(
      { import_id: importId, userId },
      {
        $set: { reverted: true },
        $unset: { row_hash: "" },
      }
    );
    return res.modifiedCount;
  }

  async hasActiveLinksForImport(importId: string, userId: string): Promise<boolean> {
    const txCol = await this.transactionsCol();
    const txDocs = await txCol
      .find({ import_id: importId, userId }, { projection: { _id: 1, allocated_paise: 1 } })
      .toArray();

    if (txDocs.some((d) => (d.allocated_paise || 0) > 0)) {
      return true;
    }

    const txIds = txDocs.map((d) => String(d._id));
    if (txIds.length === 0) return false;

    const matchLinksCol = await this.matchLinksCol();
    const activeLink = await matchLinksCol.findOne({
      userId,
      bank_transaction_id: { $in: txIds },
      status: "Active",
    });

    return Boolean(activeLink);
  }

  async findTransactionById(id: string, userId: string): Promise<BankTransaction | null> {
    const col = await this.transactionsCol();
    const doc = await col.findOne(buildIdQuery(id, userId));
    if (!doc) return null;

    // Check active links and stale status
    const matchLinksCol = await this.matchLinksCol();
    const activeLinks = await matchLinksCol
      .find({ userId, bank_transaction_id: String(doc._id), status: "Active" })
      .toArray();

    const staleSet = await this.checkStaleLinks(activeLinks);
    doc.links_count = activeLinks.length;
    doc.needs_review = activeLinks.some((l) => staleSet.has(String(l._id || l.id)));

    return toTransactionEntity(doc);
  }

  async checkStaleLinks(activeLinks: Document[]): Promise<Set<string>> {
    const staleLinkIds = new Set<string>();
    if (activeLinks.length === 0) return staleLinkIds;

    const paymentLinks = activeLinks.filter((l) => l.entity_type === "payment");
    const vbpLinks = activeLinks.filter((l) => l.entity_type === "vendor_bill_payment");

    const paymentsCol = await this.paymentsCol();
    const vbpCol = await this.vendorBillPaymentsCol();

    if (paymentLinks.length > 0) {
      const pIds = paymentLinks.map((l) => l.entity_id);
      const existingPayments = await paymentsCol
        .find(
          {
            _id: {
              $in: pIds.map((id) => (ObjectId.isValid(id) ? new ObjectId(id) : id)),
            },
          },
          { projection: { _id: 1 } }
        )
        .toArray();
      const existingPIdSet = new Set(existingPayments.map((p) => String(p._id)));
      for (const pl of paymentLinks) {
        if (!existingPIdSet.has(String(pl.entity_id))) {
          staleLinkIds.add(String(pl._id || pl.id));
        }
      }
    }

    if (vbpLinks.length > 0) {
      const vbpIds = vbpLinks.map((l) => l.entity_id);
      const existingVbps = await vbpCol
        .find(
          {
            _id: {
              $in: vbpIds.map((id) => (ObjectId.isValid(id) ? new ObjectId(id) : id)),
            },
            voided: { $ne: true },
          },
          { projection: { _id: 1 } }
        )
        .toArray();
      const existingVbpIdSet = new Set(existingVbps.map((v) => String(v._id)));
      for (const vl of vbpLinks) {
        if (!existingVbpIdSet.has(String(vl.entity_id))) {
          staleLinkIds.add(String(vl._id || vl.id));
        }
      }
    }

    return staleLinkIds;
  }

  async listTransactions(
    userId: string,
    filters: TransactionFilters
  ): Promise<{
    transactions: BankTransaction[];
    total: number;
    summary: TransactionsSummary;
  }> {
    const col = await this.transactionsCol();
    const match: Record<string, unknown> = { userId };

    if (filters.account) {
      match.bank_account_id = filters.account;
    }

    if (filters.from || filters.to) {
      const dateFilter: Record<string, string> = {};
      if (filters.from) dateFilter.$gte = filters.from;
      if (filters.to) dateFilter.$lte = filters.to;
      match.value_date = dateFilter;
    }

    if (filters.direction === "credit") {
      match.credit_paise = { $gt: 0 };
    } else if (filters.direction === "debit") {
      match.debit_paise = { $gt: 0 };
    }

    if (filters.import_id) {
      match.import_id = filters.import_id;
    }

    if (filters.search && filters.search.trim()) {
      const s = filters.search.trim();
      match.$or = [
        { narration: { $regex: s, $options: "i" } },
        { bank_ref: { $regex: s, $options: "i" } },
        { cheque_no: { $regex: s, $options: "i" } },
      ];
    }

    // Match status filtering
    if (filters.match_status && filters.match_status !== "all") {
      if (filters.match_status === "Excluded") {
        match.excluded = { $ne: null };
      } else if (filters.match_status === "Matched") {
        match.excluded = null;
        match.$or = [
          { variance: { $ne: null } },
          {
            $expr: {
              $and: [
                { $gt: ["$allocated_paise", 0] },
                {
                  $eq: [
                    "$allocated_paise",
                    {
                      $cond: [
                        { $gt: ["$debit_paise", 0] },
                        "$debit_paise",
                        "$credit_paise",
                      ],
                    },
                  ],
                },
              ],
            },
          },
        ];
      } else if (filters.match_status === "Partial") {
        match.excluded = null;
        match.variance = null;
        match.$expr = {
          $and: [
            { $gt: ["$allocated_paise", 0] },
            {
              $lt: [
                "$allocated_paise",
                {
                  $cond: [
                    { $gt: ["$debit_paise", 0] },
                    "$debit_paise",
                    "$credit_paise",
                  ],
                },
              ],
            },
          ],
        };
      } else if (filters.match_status === "Unmatched") {
        match.excluded = null;
        match.$or = [
          { allocated_paise: { $exists: false } },
          { allocated_paise: 0 },
        ];
      }
    }

    // Needs review filtering (derived from stale active links)
    if (filters.needs_review !== undefined && String(filters.needs_review) !== "") {
      const isNeedsReview =
        filters.needs_review === true || filters.needs_review === "true";
      const matchLinksCol = await this.matchLinksCol();
      const allActiveLinks = await matchLinksCol
        .find({ userId, status: "Active" })
        .toArray();
      const staleSet = await this.checkStaleLinks(allActiveLinks);
      const staleTxIds = Array.from(
        new Set(
          allActiveLinks
            .filter((l) => staleSet.has(String(l._id || l.id)))
            .map((l) => String(l.bank_transaction_id))
        )
      );

      const staleIdMatchers = staleTxIds.map((id) =>
        ObjectId.isValid(id) ? new ObjectId(id) : id
      );

      if (isNeedsReview) {
        match._id = { $in: staleIdMatchers };
      } else {
        match._id = { $nin: staleIdMatchers };
      }
    }

    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(1000, filters.limit || 50));
    const skip = (page - 1) * limit;

    const [docs, total, summaryAgg] = await Promise.all([
      col
        .find(match)
        .sort({ value_date: -1, created_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      col.countDocuments(match),
      col
        .aggregate<{
          _id: null;
          total_credit_paise: number;
          total_debit_paise: number;
        }>([
          { $match: match },
          {
            $group: {
              _id: null,
              total_credit_paise: { $sum: "$credit_paise" },
              total_debit_paise: { $sum: "$debit_paise" },
            },
          },
        ])
        .toArray(),
    ]);

    // Annotate page docs with links_count and needs_review
    const txIds = docs.map((d) => String(d._id));
    if (txIds.length > 0) {
      const matchLinksCol = await this.matchLinksCol();
      const activeLinks = await matchLinksCol
        .find({ userId, bank_transaction_id: { $in: txIds }, status: "Active" })
        .toArray();

      const staleLinkIds = await this.checkStaleLinks(activeLinks);
      const countMap = new Map<string, number>();
      const reviewMap = new Map<string, boolean>();

      for (const l of activeLinks) {
        const tid = String(l.bank_transaction_id);
        countMap.set(tid, (countMap.get(tid) || 0) + 1);
        if (staleLinkIds.has(String(l._id || l.id))) {
          reviewMap.set(tid, true);
        }
      }

      for (const d of docs) {
        const tid = String(d._id);
        d.links_count = countMap.get(tid) || 0;
        d.needs_review = reviewMap.get(tid) || false;
      }
    }

    const summary: TransactionsSummary = {
      total_credit_paise: summaryAgg[0]?.total_credit_paise || 0,
      total_debit_paise: summaryAgg[0]?.total_debit_paise || 0,
      count: total,
    };

    return {
      transactions: docs.map(toTransactionEntity),
      total,
      summary,
    };
  }

  // ─── Matching Links & Operations ────────────────────────────────

  async findLinksForTransaction(txId: string, userId: string): Promise<BankMatchLink[]> {
    const matchLinksCol = await this.matchLinksCol();
    const docs = await matchLinksCol
      .find({ userId, bank_transaction_id: txId })
      .sort({ created_at: -1 })
      .toArray();

    const activeDocs = docs.filter((d) => d.status === "Active");
    const staleSet = await this.checkStaleLinks(activeDocs);

    return docs.map((d) => {
      const entity = toLinkEntity(d);
      if (entity.status === "Active") {
        entity.needs_review = staleSet.has(entity.id);
      }
      return entity;
    });
  }

  async findLinkById(id: string, userId: string): Promise<BankMatchLink | null> {
    const matchLinksCol = await this.matchLinksCol();
    const doc = await matchLinksCol.findOne(buildIdQuery(id, userId));
    if (!doc) return null;
    const entity = toLinkEntity(doc);
    if (entity.status === "Active") {
      const staleSet = await this.checkStaleLinks([doc]);
      entity.needs_review = staleSet.has(entity.id);
    }
    return entity;
  }

  async getEntitySnapshot(
    entityType: MatchEntityType,
    entityId: string,
    userId: string
  ): Promise<{ amount_paise: number; snapshot: MatchLinkSnapshot }> {
    if (entityType === "payment") {
      const paymentsCol = await this.paymentsCol();
      const clientsCol = await this.clientsCol();

      const payment = await paymentsCol.findOne(buildIdQuery(entityId, userId));
      if (!payment) {
        throw new AppError(`Payment ${entityId} not found`, ErrorCode.NOT_FOUND, 404);
      }
      const amountRupees = Number(payment.amount || 0);
      const amountPaise = Math.round(amountRupees * 100);
      if (amountPaise <= 0) {
        throw new AppError("Payment amount must be greater than zero", ErrorCode.VALIDATION_FAILED, 400);
      }

      let partyName = "Unknown Client";
      if (payment.client_id) {
        const client = await clientsCol.findOne(
          buildIdQuery(String(payment.client_id), userId)
        );
        if (client) partyName = client.name || client.client_name || partyName;
      }

      const pDate = payment.payment_date || payment.createdAt;
      const dateStr =
        pDate instanceof Date
          ? pDate.toISOString().slice(0, 10)
          : String(pDate || "").slice(0, 10);
      const reference = String(
        payment.reference_id ||
          payment.reference ||
          payment.transaction_id ||
          payment.notes ||
          ""
      );

      return {
        amount_paise: amountPaise,
        snapshot: {
          amount_paise: amountPaise,
          date: dateStr,
          party_name: partyName,
          reference,
        },
      };
    } else {
      const vbpCol = await this.vendorBillPaymentsCol();
      const vendorsCol = await this.vendorsCol();

      const vbp = await vbpCol.findOne(buildIdQuery(entityId, userId));
      if (!vbp) {
        throw new AppError(`Vendor bill payment ${entityId} not found`, ErrorCode.NOT_FOUND, 404);
      }
      if (vbp.voided) {
        throw new AppError(`Vendor bill payment ${entityId} is voided and cannot be linked`, ErrorCode.VALIDATION_FAILED, 400);
      }

      const amountPaise = Number(
        vbp.amount_paise || Math.round(Number(vbp.amount || 0) * 100)
      );
      if (amountPaise <= 0) {
        throw new AppError("Payment amount must be greater than zero", ErrorCode.VALIDATION_FAILED, 400);
      }

      let partyName = "Unknown Vendor";
      if (vbp.vendor_id) {
        const vendor = await vendorsCol.findOne(
          buildIdQuery(String(vbp.vendor_id), userId)
        );
        if (vendor) partyName = vendor.name || partyName;
      }

      const pDate = vbp.payment_date || vbp.created_at;
      const dateStr =
        pDate instanceof Date
          ? pDate.toISOString().slice(0, 10)
          : String(pDate || "").slice(0, 10);
      const reference = String(vbp.reference || vbp.notes || "");

      return {
        amount_paise: amountPaise,
        snapshot: {
          amount_paise: amountPaise,
          date: dateStr,
          party_name: partyName,
          reference,
        },
      };
    }
  }

  async atomicAllocateAndCreateLinks(
    txId: string,
    userId: string,
    totalAllocatingPaise: number,
    linksData: Omit<BankMatchLink, "id">[]
  ): Promise<BankMatchLink[]> {
    const txCol = await this.transactionsCol();
    const matchLinksCol = await this.matchLinksCol();

    const txDoc = await txCol.findOne(buildIdQuery(txId, userId));
    if (!txDoc) {
      throw new AppError("Bank transaction not found", ErrorCode.NOT_FOUND, 404);
    }
    if (txDoc.reverted) {
      throw new AppError("Cannot link a reverted transaction", ErrorCode.VALIDATION_FAILED, 400);
    }
    if (txDoc.excluded) {
      throw new AppError("Cannot link an excluded transaction", ErrorCode.VALIDATION_FAILED, 400);
    }

    const rowAmountPaise = Number(
      txDoc.debit_paise > 0 ? txDoc.debit_paise : txDoc.credit_paise
    );
    const currentAllocated = Number(txDoc.allocated_paise || 0);
    const remainingPaise = rowAmountPaise - currentAllocated;

    if (totalAllocatingPaise > remainingPaise) {
      throw new AppError(
        `Allocation of ${(totalAllocatingPaise / 100).toFixed(2)} exceeds remaining transaction balance of ${(remainingPaise / 100).toFixed(2)}`,
        ErrorCode.CONFLICT,
        409,
        {
          remaining_paise: Math.max(0, remainingPaise),
          allocating_paise: totalAllocatingPaise,
        }
      );
    }

    // Pre-check for duplicate active link on entity
    const entityChecks = linksData.map((l) => ({
      entity_type: l.entity_type,
      entity_id: l.entity_id,
    }));
    const existingActive = await matchLinksCol.findOne({
      userId,
      status: "Active",
      $or: entityChecks,
    });
    if (existingActive) {
      throw new AppError(
        `Payment ${existingActive.entity_type} ${existingActive.entity_id} is already linked`,
        ErrorCode.CONFLICT,
        409
      );
    }

    // 1. Atomically $inc allocated_paise on bank_transactions
    const updatedTx = await txCol.findOneAndUpdate(
      {
        ...buildIdQuery(txId, userId),
        reverted: { $ne: true },
        excluded: null,
        allocated_paise: { $lte: rowAmountPaise - totalAllocatingPaise },
      },
      {
        $inc: { allocated_paise: totalAllocatingPaise },
      },
      { returnDocument: "after" }
    );

    const updatedTxDoc = ((updatedTx && typeof updatedTx === "object" && "value" in updatedTx ? (updatedTx as { value?: Document }).value : updatedTx) || {}) as Document;
    if (
      !updatedTxDoc ||
      (!updatedTxDoc._id && !(updatedTx as { lastErrorObject?: { updatedExisting?: boolean } })?.lastErrorObject?.updatedExisting)
    ) {
      const fresh = await txCol.findOne(buildIdQuery(txId, userId));
      const freshAllocated = Number(fresh?.allocated_paise || 0);
      const freshRemaining = Math.max(0, rowAmountPaise - freshAllocated);
      throw new AppError(
        `Concurrent update or balance exceeded. Remaining: ${(freshRemaining / 100).toFixed(2)}`,
        ErrorCode.CONFLICT,
        409,
        {
          remaining_paise: freshRemaining,
          allocating_paise: totalAllocatingPaise,
        }
      );
    }

    // 2. Insert links into bank_match_links
    const docsToInsert = linksData.map((l) => {
      const docId = new ObjectId();
      return {
        _id: docId,
        id: docId.toString(),
        ...l,
        created_at: l.created_at || new Date(),
      };
    });

    try {
      await matchLinksCol.insertMany(docsToInsert, { ordered: true });
      return docsToInsert.map(toLinkEntity);
    } catch (err: unknown) {
      // 3. Roll back the $inc on error
      await txCol.updateOne(buildIdQuery(txId, userId), {
        $inc: { allocated_paise: -totalAllocatingPaise },
      });
      if ((err as { code?: number })?.code === 11000) {
        throw new AppError(
          "One or more payments are already actively linked to another transaction",
          ErrorCode.CONFLICT,
          409
        );
      }
      throw err;
    }
  }

  async atomicUnlink(
    linkId: string,
    userId: string,
    unlinkedBy: string,
    reason?: string | null
  ): Promise<BankMatchLink | null> {
    const matchLinksCol = await this.matchLinksCol();
    const txCol = await this.transactionsCol();

    const updated = await matchLinksCol.findOneAndUpdate(
      {
        ...buildIdQuery(linkId, userId),
        status: "Active",
      },
      {
        $set: {
          status: "Unlinked",
          unlinked_by: unlinkedBy,
          unlinked_at: new Date(),
          unlink_reason: reason || null,
        },
      },
      { returnDocument: "after" }
    );

    const linkDoc = ((updated && typeof updated === "object" && "value" in updated ? (updated as { value?: Document }).value : updated) || {}) as Document;
    if (!linkDoc || !linkDoc.bank_transaction_id) {
      return null;
    }

    // Decrement allocated_paise and clear variance
    await txCol.updateOne(buildIdQuery(linkDoc.bank_transaction_id, userId), {
      $inc: { allocated_paise: -Number(linkDoc.allocated_paise || 0) },
      $unset: { variance: "" },
    });

    return toLinkEntity(linkDoc);
  }

  async excludeTransaction(
    txId: string,
    userId: string,
    reason: ExcludeReason,
    note: string | null,
    by: string
  ): Promise<BankTransaction | null> {
    const txCol = await this.transactionsCol();
    const res = await txCol.findOneAndUpdate(
      {
        ...buildIdQuery(txId, userId),
        reverted: { $ne: true },
        $or: [{ allocated_paise: 0 }, { allocated_paise: { $exists: false } }],
      },
      {
        $set: {
          excluded: {
            reason,
            note: note || null,
            by,
            at: new Date(),
          },
        },
      },
      { returnDocument: "after" }
    );
    const doc = ((res && typeof res === "object" && "value" in res ? (res as { value?: Document }).value : res) || {}) as Document;
    if (!doc || !doc._id) {
      const existing = await txCol.findOne(buildIdQuery(txId, userId));
      if (existing && existing.allocated_paise > 0) {
        throw new AppError(
          "Cannot exclude a transaction that has linked payments",
          ErrorCode.VALIDATION_FAILED,
          400
        );
      }
      return null;
    }
    return toTransactionEntity(doc);
  }

  async unexcludeTransaction(txId: string, userId: string): Promise<BankTransaction | null> {
    const txCol = await this.transactionsCol();
    const res = await txCol.findOneAndUpdate(
      {
        ...buildIdQuery(txId, userId),
        reverted: { $ne: true },
        excluded: { $ne: null },
      },
      {
        $unset: { excluded: "" },
      },
      { returnDocument: "after" }
    );
    const doc = ((res && typeof res === "object" && "value" in res ? (res as { value?: Document }).value : res) || {}) as Document;
    return doc ? toTransactionEntity(doc) : null;
  }

  async acceptVariance(
    txId: string,
    userId: string,
    reason: VarianceReason,
    by: string
  ): Promise<BankTransaction | null> {
    const txCol = await this.transactionsCol();
    const txDoc = await txCol.findOne(buildIdQuery(txId, userId));
    if (!txDoc) {
      throw new AppError("Bank transaction not found", ErrorCode.NOT_FOUND, 404);
    }
    if (txDoc.reverted) {
      throw new AppError("Cannot accept variance on reverted transaction", ErrorCode.VALIDATION_FAILED, 400);
    }
    if (txDoc.excluded) {
      throw new AppError("Cannot accept variance on excluded transaction", ErrorCode.VALIDATION_FAILED, 400);
    }

    const rowAmountPaise = Number(
      txDoc.debit_paise > 0 ? txDoc.debit_paise : txDoc.credit_paise
    );
    const allocated = Number(txDoc.allocated_paise || 0);

    if (allocated <= 0 || allocated >= rowAmountPaise) {
      throw new AppError(
        "Variance can only be accepted when transaction is partially allocated (0 < allocated < amount)",
        ErrorCode.VALIDATION_FAILED,
        400
      );
    }

    const variancePaise = rowAmountPaise - allocated;
    const res = await txCol.findOneAndUpdate(
      {
        ...buildIdQuery(txId, userId),
        reverted: { $ne: true },
        excluded: null,
        allocated_paise: allocated,
      },
      {
        $set: {
          variance: {
            paise: variancePaise,
            reason,
            by,
            at: new Date(),
          },
        },
      },
      { returnDocument: "after" }
    );
    const doc = ((res && typeof res === "object" && "value" in res ? (res as { value?: Document }).value : res) || {}) as Document;
    return doc ? toTransactionEntity(doc) : null;
  }

  async findSuggestionsForTransaction(
    txId: string,
    userId: string
  ): Promise<CandidatePayment[]> {
    const tx = await this.findTransactionById(txId, userId);
    if (!tx || tx.reverted || tx.excluded) return [];

    const rowAmountPaise = tx.credit_paise > 0 ? tx.credit_paise : tx.debit_paise;
    if (rowAmountPaise <= 0) return [];

    const isCredit = tx.credit_paise > 0;
    const matchLinksCol = await this.matchLinksCol();

    const entityType: MatchEntityType = isCredit ? "payment" : "vendor_bill_payment";
    const activeLinks = await matchLinksCol
      .find(
        { userId, entity_type: entityType, status: "Active" },
        { projection: { entity_id: 1 } }
      )
      .toArray();
    const linkedEntityIds = new Set(activeLinks.map((l) => String(l.entity_id)));

    const txDate = new Date(`${tx.value_date}T00:00:00.000Z`);
    const candidates: CandidatePayment[] = [];

    if (isCredit) {
      const paymentsCol = await this.paymentsCol();
      const clientsCol = await this.clientsCol();

      const targetRupees = rowAmountPaise / 100;
      const query: Record<string, unknown> = {
        userId,
        amount: targetRupees,
      };

      const docs = await paymentsCol.find(query).toArray();

      const clientIds = docs.map((d) => d.client_id).filter(Boolean);
      const clientDocs = await clientsCol
        .find({
          _id: {
            $in: clientIds.map((cid: unknown) =>
              ObjectId.isValid(String(cid)) ? new ObjectId(String(cid)) : String(cid)
            ),
          },
        })
        .toArray();
      const clientMap = new Map<string, string>();
      for (const c of clientDocs) {
        clientMap.set(String(c._id), c.name || c.client_name || "");
      }

      for (const doc of docs) {
        const docId = String(doc._id);
        if (linkedEntityIds.has(docId)) continue;

        const pMethod = String(
          doc.payment_method || doc.payment_mode || doc.mode || ""
        );
        if (pMethod.toLowerCase() === "cash") {
          continue;
        }

        const pDateRaw = doc.payment_date || doc.createdAt;
        const pDateObj = new Date(pDateRaw);
        if (isNaN(pDateObj.getTime())) continue;
        const pDateStr = pDateObj.toISOString().slice(0, 10);
        const diffMs = Math.abs(pDateObj.getTime() - txDate.getTime());
        const diffDays = Math.round(diffMs / (24 * 3600 * 1000));
        if (diffDays > 3) continue;

        const partyName = clientMap.get(String(doc.client_id)) || "Unknown Client";
        const reference = String(
          doc.reference_id || doc.reference || doc.transaction_id || ""
        );

        const normRef = reference.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        const normNarration = (tx.narration + " " + (tx.bank_ref || ""))
          .replace(/[^A-Za-z0-9]/g, "")
          .toUpperCase();
        const refInNarration =
          normRef.length >= 6 && normNarration.includes(normRef);

        candidates.push({
          entity_type: "payment",
          entity_id: docId,
          amount_paise: rowAmountPaise,
          amount: targetRupees,
          date: pDateStr,
          party_name: partyName,
          reference,
          payment_method: pMethod || "Bank",
          is_cash: false,
          reasons: {
            amount_exact: true,
            date_diff_n: diffDays,
            reference_in_narration: refInNarration,
          },
        });
      }
    } else {
      const vbpCol = await this.vendorBillPaymentsCol();
      const vendorsCol = await this.vendorsCol();

      const query: Record<string, unknown> = {
        userId,
        voided: { $ne: true },
        $or: [
          { amount_paise: rowAmountPaise },
          { amount: rowAmountPaise / 100 },
        ],
      };

      const docs = await vbpCol.find(query).toArray();

      const vendorIds = docs.map((d) => d.vendor_id).filter(Boolean);
      const vendorDocs = await vendorsCol
        .find({
          _id: {
            $in: vendorIds.map((vid: unknown) =>
              ObjectId.isValid(String(vid)) ? new ObjectId(String(vid)) : String(vid)
            ),
          },
        })
        .toArray();
      const vendorMap = new Map<string, string>();
      for (const v of vendorDocs) {
        vendorMap.set(String(v._id), v.name || "");
      }

      for (const doc of docs) {
        const docId = String(doc._id);
        if (linkedEntityIds.has(docId)) continue;

        const pMode = String(doc.payment_mode || doc.payment_method || "");
        if (pMode.toLowerCase() === "cash") {
          continue;
        }

        const pDateRaw = doc.payment_date || doc.created_at;
        const pDateObj = new Date(pDateRaw);
        if (isNaN(pDateObj.getTime())) continue;
        const pDateStr = pDateObj.toISOString().slice(0, 10);
        const diffMs = Math.abs(pDateObj.getTime() - txDate.getTime());
        const diffDays = Math.round(diffMs / (24 * 3600 * 1000));
        if (diffDays > 3) continue;

        const partyName = vendorMap.get(String(doc.vendor_id)) || "Unknown Vendor";
        const reference = String(doc.reference || "");

        const normRef = reference.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        const normNarration = (tx.narration + " " + (tx.bank_ref || ""))
          .replace(/[^A-Za-z0-9]/g, "")
          .toUpperCase();
        const refInNarration =
          normRef.length >= 6 && normNarration.includes(normRef);

        candidates.push({
          entity_type: "vendor_bill_payment",
          entity_id: docId,
          amount_paise: rowAmountPaise,
          amount: rowAmountPaise / 100,
          date: pDateStr,
          party_name: partyName,
          reference,
          payment_method: pMode || "Bank",
          is_cash: false,
          reasons: {
            amount_exact: true,
            date_diff_n: diffDays,
            reference_in_narration: refInNarration,
          },
        });
      }
    }

    candidates.sort((a, b) => {
      const aRef = a.reasons?.reference_in_narration ? 1 : 0;
      const bRef = b.reasons?.reference_in_narration ? 1 : 0;
      if (aRef !== bRef) return bRef - aRef;

      const aDiff = a.reasons?.date_diff_n ?? 99;
      const bDiff = b.reasons?.date_diff_n ?? 99;
      if (aDiff !== bDiff) return aDiff - bDiff;

      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.entity_id.localeCompare(b.entity_id);
    });

    return candidates.slice(0, 5);
  }

  async searchCandidatePayments(
    userId: string,
    filters: CandidateFilterInput
  ): Promise<CandidatePayment[]> {
    const direction = filters.direction || "credit";
    const matchLinksCol = await this.matchLinksCol();

    const entityType: MatchEntityType =
      direction === "credit" ? "payment" : "vendor_bill_payment";
    const activeLinks = await matchLinksCol
      .find(
        { userId, entity_type: entityType, status: "Active" },
        { projection: { entity_id: 1 } }
      )
      .toArray();
    const linkedEntityIds = new Set(activeLinks.map((l) => String(l.entity_id)));

    const candidates: CandidatePayment[] = [];

    if (direction === "credit") {
      const paymentsCol = await this.paymentsCol();
      const clientsCol = await this.clientsCol();

      const query: Record<string, unknown> = { userId };
      const docs = await paymentsCol
        .find(query)
        .sort({ payment_date: -1, createdAt: -1 })
        .limit(200)
        .toArray();

      const clientIds = docs.map((d) => d.client_id).filter(Boolean);
      const clientDocs = await clientsCol
        .find({
          _id: {
            $in: clientIds.map((cid: unknown) =>
              ObjectId.isValid(String(cid)) ? new ObjectId(String(cid)) : String(cid)
            ),
          },
        })
        .toArray();
      const clientMap = new Map<string, string>();
      for (const c of clientDocs) {
        clientMap.set(String(c._id), c.name || c.client_name || "");
      }

      for (const doc of docs) {
        const docId = String(doc._id);
        if (linkedEntityIds.has(docId)) continue;

        const pRupees = Number(doc.amount || 0);
        const pPaise = Math.round(pRupees * 100);
        if (pPaise <= 0) continue;

        if (filters.min != null && pRupees < filters.min) continue;
        if (filters.max != null && pRupees > filters.max) continue;

        const pDateRaw = doc.payment_date || doc.createdAt;
        const pDateObj = new Date(pDateRaw);
        const pDateStr = !isNaN(pDateObj.getTime())
          ? pDateObj.toISOString().slice(0, 10)
          : "";

        if (filters.from && pDateStr && pDateStr < filters.from) continue;
        if (filters.to && pDateStr && pDateStr > filters.to) continue;

        const partyName = clientMap.get(String(doc.client_id)) || "Unknown Client";
        const reference = String(
          doc.reference_id ||
            doc.reference ||
            doc.transaction_id ||
            doc.notes ||
            ""
        );
        const pMethod = String(
          doc.payment_method || doc.payment_mode || doc.mode || "Bank"
        );
        const isCash = pMethod.toLowerCase() === "cash";

        if (filters.q && filters.q.trim()) {
          const qLower = filters.q.trim().toLowerCase();
          const matchesQ =
            partyName.toLowerCase().includes(qLower) ||
            reference.toLowerCase().includes(qLower) ||
            String(doc.notes || "").toLowerCase().includes(qLower);
          if (!matchesQ) continue;
        }

        candidates.push({
          entity_type: "payment",
          entity_id: docId,
          amount_paise: pPaise,
          amount: pRupees,
          date: pDateStr,
          party_name: partyName,
          reference,
          payment_method: pMethod,
          is_cash: isCash,
        });

        if (candidates.length >= 50) break;
      }
    } else {
      const vbpCol = await this.vendorBillPaymentsCol();
      const vendorsCol = await this.vendorsCol();

      const query: Record<string, unknown> = { userId, voided: { $ne: true } };
      const docs = await vbpCol
        .find(query)
        .sort({ payment_date: -1, created_at: -1 })
        .limit(200)
        .toArray();

      const vendorIds = docs.map((d) => d.vendor_id).filter(Boolean);
      const vendorDocs = await vendorsCol
        .find({
          _id: {
            $in: vendorIds.map((vid: unknown) =>
              ObjectId.isValid(String(vid)) ? new ObjectId(String(vid)) : String(vid)
            ),
          },
        })
        .toArray();
      const vendorMap = new Map<string, string>();
      for (const v of vendorDocs) {
        vendorMap.set(String(v._id), v.name || "");
      }

      for (const doc of docs) {
        const docId = String(doc._id);
        if (linkedEntityIds.has(docId)) continue;

        const pPaise = Number(
          doc.amount_paise || Math.round(Number(doc.amount || 0) * 100)
        );
        const pRupees = pPaise / 100;
        if (pPaise <= 0) continue;

        if (filters.min != null && pRupees < filters.min) continue;
        if (filters.max != null && pRupees > filters.max) continue;

        const pDateRaw = doc.payment_date || doc.created_at;
        const pDateObj = new Date(pDateRaw);
        const pDateStr = !isNaN(pDateObj.getTime())
          ? pDateObj.toISOString().slice(0, 10)
          : "";

        if (filters.from && pDateStr && pDateStr < filters.from) continue;
        if (filters.to && pDateStr && pDateStr > filters.to) continue;

        const partyName = vendorMap.get(String(doc.vendor_id)) || "Unknown Vendor";
        const reference = String(doc.reference || doc.notes || "");
        const pMode = String(doc.payment_mode || doc.payment_method || "Bank");
        const isCash = pMode.toLowerCase() === "cash";

        if (filters.q && filters.q.trim()) {
          const qLower = filters.q.trim().toLowerCase();
          const matchesQ =
            partyName.toLowerCase().includes(qLower) ||
            reference.toLowerCase().includes(qLower) ||
            String(doc.notes || "").toLowerCase().includes(qLower);
          if (!matchesQ) continue;
        }

        candidates.push({
          entity_type: "vendor_bill_payment",
          entity_id: docId,
          amount_paise: pPaise,
          amount: pRupees,
          date: pDateStr,
          party_name: partyName,
          reference,
          payment_method: pMode,
          is_cash: isCash,
        });

        if (candidates.length >= 50) break;
      }
    }

    return candidates;
  }

  async getReconciliationSummary(
    userId: string,
    bankAccountId?: string,
    from?: string,
    to?: string
  ): Promise<ReconciliationSummary> {
    const txCol = await this.transactionsCol();
    const match: Record<string, unknown> = { userId, reverted: { $ne: true } };

    if (bankAccountId) match.bank_account_id = bankAccountId;
    if (from || to) {
      const dateFilter: Record<string, string> = {};
      if (from) dateFilter.$gte = from;
      if (to) dateFilter.$lte = to;
      match.value_date = dateFilter;
    }

    const txs = await txCol.find(match).toArray();

    const summary: ReconciliationSummary = {
      unmatched: { count: 0, total_paise: 0 },
      partial: { count: 0, total_paise: 0 },
      matched: { count: 0, total_paise: 0 },
      excluded: { count: 0, total_paise: 0 },
      needs_review_count: 0,
    };

    for (const doc of txs) {
      const debit = Number(doc.debit_paise || 0);
      const credit = Number(doc.credit_paise || 0);
      const rowAmount = debit > 0 ? debit : credit;
      const allocated = Number(doc.allocated_paise || 0);

      if (doc.excluded) {
        summary.excluded.count += 1;
        summary.excluded.total_paise += rowAmount;
      } else if ((rowAmount > 0 && allocated === rowAmount) || doc.variance) {
        summary.matched.count += 1;
        summary.matched.total_paise += rowAmount;
      } else if (allocated > 0 && allocated < rowAmount) {
        summary.partial.count += 1;
        summary.partial.total_paise += rowAmount;
      } else {
        summary.unmatched.count += 1;
        summary.unmatched.total_paise += rowAmount;
      }
    }

    const matchLinksCol = await this.matchLinksCol();
    const activeLinks = await matchLinksCol
      .find({ userId, status: "Active" })
      .toArray();
    const staleLinkIds = await this.checkStaleLinks(activeLinks);
    const staleTxIds = new Set<string>();
    for (const l of activeLinks) {
      if (staleLinkIds.has(String(l._id || l.id))) {
        staleTxIds.add(String(l.bank_transaction_id));
      }
    }

    const txIdSet = new Set(txs.map((t) => String(t._id)));
    let needsReviewCount = 0;
    for (const tid of staleTxIds) {
      if (txIdSet.has(tid)) {
        needsReviewCount += 1;
      }
    }
    summary.needs_review_count = needsReviewCount;

    return summary;
  }
}

let _repo: MongoBankingRepository | null = null;
export function getBankingRepository(): MongoBankingRepository {
  if (!_repo) {
    _repo = new MongoBankingRepository();
  }
  return _repo;
}
