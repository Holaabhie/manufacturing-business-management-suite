import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { enqueueTallyJob, ackJob } from "@/services/tally/bridge/tallyBridgeService";
import { buildClientLedgerXml } from "@/services/tally";

async function run() {
    console.log("▶ Testing Tally Client Sync Flow against local MongoDB...");
    const db = await getDb();
    const testOrgId = "test_org_" + Date.now();
    const testClientId = new ObjectId().toString();

    // 1. Create dummy client in clients collection
    const clientDoc = {
        _id: new ObjectId(testClientId),
        userId: testOrgId,
        name: "Test Wire Client",
        gstin: "27AABCT1234A1Z5",
        state: "Maharashtra",
        address: "Industrial Phase 1",
        tallySync: { status: "pending" },
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    await db.collection("clients").insertOne(clientDoc);
    console.log("  1. Created test client doc");

    // 2. Build XML using our new adapter
    const xml = buildClientLedgerXml({
        id: testClientId,
        name: clientDoc.name,
        gstin: clientDoc.gstin,
        state: clientDoc.state,
        address: clientDoc.address,
    }, "Test Company");
    console.log("  2. Generated XML with <ALIAS> tag:");
    if (!xml.includes(`<ALIAS>${testClientId}</ALIAS>`)) {
        throw new Error("XML does not contain expected ALIAS tag!");
    }
    console.log("     Found <ALIAS>" + testClientId + "</ALIAS> in XML ✅");

    // 3. Enqueue job
    const enqueueRes1 = await enqueueTallyJob(testOrgId, {
        type: "master.ledger",
        dedupeKey: `client:${testClientId}`,
        requestXml: xml,
        sourceRef: { entityType: "client", entityId: testClientId },
        priority: 10,
    });
    console.log("  3. Enqueued job:", enqueueRes1.jobId, "isExisting:", enqueueRes1.isExisting);
    if (enqueueRes1.isExisting) throw new Error("First enqueue should not be existing");

    // 4. Test duplicate enqueue while pending -> updates requestXml
    const updatedXml = buildClientLedgerXml({
        id: testClientId,
        name: "Updated Wire Client Name",
        gstin: clientDoc.gstin,
        state: clientDoc.state,
    }, "Test Company");
    const enqueueRes2 = await enqueueTallyJob(testOrgId, {
        type: "master.ledger",
        dedupeKey: `client:${testClientId}`,
        requestXml: updatedXml,
        sourceRef: { entityType: "client", entityId: testClientId },
        priority: 10,
    });
    console.log("  4. Duplicate enqueue while pending returned same job:", enqueueRes2.jobId === enqueueRes1.jobId);
    if (!enqueueRes2.isExisting) throw new Error("Second enqueue should be existing");

    const pendingJob = await db.collection("tallysyncjobs").findOne({ _id: new ObjectId(enqueueRes1.jobId) });
    if (!pendingJob?.requestXml.includes("Updated Wire Client Name")) {
        throw new Error("Pending job was not updated with latest XML!");
    }
    console.log("     Pending job payload updated with latest XML ✅");

    // 5. Simulate claim
    const deviceId = new ObjectId().toString();
    await db.collection("tallysyncjobs").updateOne(
        { _id: new ObjectId(enqueueRes1.jobId) },
        { $set: { status: "processing", claimedByDeviceId: deviceId, leaseExpiresAt: new Date(Date.now() + 60000) } }
    );

    // 6. Ack success -> updates client.tallySync to 'synced'
    const ackRes = await ackJob(enqueueRes1.jobId, testOrgId, deviceId, {
        outcome: "success",
        created: 1,
        altered: 0,
        errors: 0,
    });
    console.log("  5. Acked success:", ackRes.updated);
    if (!ackRes.updated) throw new Error("ackJob failed to update");

    const syncedClient = await db.collection("clients").findOne({ _id: new ObjectId(testClientId) });
    console.log("  6. Client tallySync after success ack:", syncedClient?.tallySync);
    if (syncedClient?.tallySync?.status !== "synced" || !syncedClient?.tallySync?.lastSyncedAt) {
        throw new Error("Client tallySync status was not updated to synced!");
    }
    console.log("     Client tallySync is synced ✅");

    // 7. Cleanup
    await db.collection("clients").deleteOne({ _id: new ObjectId(testClientId) });
    await db.collection("tallysyncjobs").deleteOne({ _id: new ObjectId(enqueueRes1.jobId) });
    console.log("  7. Cleaned up test records ✅");

    console.log("\n🎉 ALL CHECKS PASSED SUCCESSFULLY!");
    process.exit(0);
}

run().catch((e) => {
    console.error("❌ FAILED:", e);
    process.exit(1);
});
