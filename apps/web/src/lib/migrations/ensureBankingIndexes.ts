/**
 * Migration: Ensure bank_accounts, bank_statement_imports, and bank_transactions indexes exist.
 *
 * Safe to run multiple times (idempotent).
 */
import { getDb } from "@/lib/mongodb";

let _indexesEnsured = false;

export async function ensureBankingIndexes(force: boolean = false): Promise<void> {
  if (_indexesEnsured && !force) return;

  try {
    const db = await getDb();
    const accountsCol = db.collection("bank_accounts");
    const importsCol = db.collection("bank_statement_imports");
    const txCol = db.collection("bank_transactions");

    // 1. bank_accounts: unique { userId, bank_name, account_last4 }
    await accountsCol.createIndex(
      { userId: 1, bank_name: 1, account_last4: 1 },
      {
        name: "userId_1_bank_name_1_account_last4_1",
        unique: true,
        background: true,
      }
    );

    await accountsCol.createIndex(
      { userId: 1, status: 1 },
      { name: "userId_1_status_1", background: true }
    );

    // 2. bank_statement_imports:
    // Unique { userId, bank_account_id, file_hash } partial where status = 'Committed'
    // NOTE: Uses partialFilterExpression with $type string, NOT compound sparse
    const importIndexes = await importsCol.indexes();
    const oldImportHashIdx = importIndexes.find(
      (idx) => idx.name === "userId_1_bank_account_id_1_file_hash_1"
    );
    if (oldImportHashIdx && !oldImportHashIdx.partialFilterExpression) {
      await importsCol.dropIndex("userId_1_bank_account_id_1_file_hash_1");
    }

    await importsCol.createIndex(
      { userId: 1, bank_account_id: 1, file_hash: 1 },
      {
        name: "userId_1_bank_account_id_1_file_hash_1",
        unique: true,
        partialFilterExpression: {
          status: "Committed",
          file_hash: { $type: "string" },
        },
        background: true,
      }
    );

    await importsCol.createIndex(
      { userId: 1, bank_account_id: 1, created_at: -1 },
      { name: "userId_1_bank_account_id_1_created_at_-1", background: true }
    );

    // 3. bank_transactions:
    // Unique { userId, bank_account_id, row_hash } partial on row_hash type string
    const txIndexes = await txCol.indexes();
    const oldRowHashIdx = txIndexes.find(
      (idx) => idx.name === "userId_1_bank_account_id_1_row_hash_1"
    );
    if (oldRowHashIdx && !oldRowHashIdx.partialFilterExpression) {
      await txCol.dropIndex("userId_1_bank_account_id_1_row_hash_1");
    }

    await txCol.createIndex(
      { userId: 1, bank_account_id: 1, row_hash: 1 },
      {
        name: "userId_1_bank_account_id_1_row_hash_1",
        unique: true,
        partialFilterExpression: {
          row_hash: { $type: "string" },
        },
        background: true,
      }
    );

    // Query indexes: { userId, bank_account_id, value_date } and { userId, import_id }
    await txCol.createIndex(
      { userId: 1, bank_account_id: 1, value_date: -1 },
      { name: "userId_1_bank_account_id_1_value_date_-1", background: true }
    );

    await txCol.createIndex(
      { userId: 1, import_id: 1 },
      { name: "userId_1_import_id_1", background: true }
    );

    // 4. bank_match_links:
    const matchLinksCol = db.collection("bank_match_links");
    // Unique partial index: { userId, entity_type, entity_id } where status = 'Active'
    await matchLinksCol.createIndex(
      { userId: 1, entity_type: 1, entity_id: 1 },
      {
        name: "userId_1_entity_type_1_entity_id_1",
        unique: true,
        partialFilterExpression: { status: "Active" },
        background: true,
      }
    );

    // Query indexes on bank_match_links
    await matchLinksCol.createIndex(
      { userId: 1, bank_transaction_id: 1 },
      { name: "userId_1_bank_transaction_id_1", background: true }
    );

    await matchLinksCol.createIndex(
      { userId: 1, bank_account_id: 1, status: 1 },
      { name: "userId_1_bank_account_id_1_status_1", background: true }
    );

    // 5. Backfill bank_transactions with allocated_paise: 0 (own collection only)
    await txCol.updateMany(
      { allocated_paise: { $exists: false } },
      { $set: { allocated_paise: 0 } }
    );

    _indexesEnsured = true;
    console.log("[Index] banking indexes ensured successfully.");
  } catch (err) {
    console.error("[Index] Failed to ensure banking indexes:", err);
  }
}
