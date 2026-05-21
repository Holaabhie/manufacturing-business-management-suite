/**
 * Auto-Generate Invoice from Order — POST /api/invoices/auto-generate
 * ───────────────────────────────────────────────────────────────────
 * Called when a user chooses "Complete & Generate Invoice".
 * 
 * 1. Fetches order + client + company data
 * 2. Generates sequential invoice number (INV-YYYY-YY-NNNN)
 * 3. Creates an invoice record in MongoDB
 * 4. Returns invoice data for client-side PDF rendering
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { generateSequentialInvoiceNumber } from "@/lib/invoice/sequence";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { orderId } = body;

        if (!orderId || !ObjectId.isValid(orderId)) {
            return NextResponse.json(
                { error: "Valid orderId is required" },
                { status: 400 },
            );
        }

        const db = await getDb();
        const userId = getDataOwnerId(user);

        // ── 1. Fetch the order ──────────────────────────────────
        const order = await db.collection("orders").findOne({
            _id: new ObjectId(orderId),
            userId,
        });

        if (!order) {
            return NextResponse.json(
                { error: "Order not found" },
                { status: 404 },
            );
        }

        // ── 2. Fetch client info ────────────────────────────────
        let client: any = null;
        if (order.client_id) {
            try {
                client = await db.collection("clients").findOne({
                    _id: new ObjectId(order.client_id),
                });
            } catch { /* client lookup failed */ }
        }

        // ── 3. Fetch company/business info ──────────────────────
        let company: any = null;
        try {
            company = await db.collection("company_profiles").findOne({ userId });
            if (!company) {
                // Try user document as fallback
                const userDoc = await db.collection("users").findOne({
                    _id: new ObjectId(userId),
                });
                if (userDoc?.companyName || userDoc?.company_name) {
                    company = {
                        companyName: userDoc.companyName || userDoc.company_name,
                        address: userDoc.address || "",
                        phone: userDoc.phone || "",
                        email: userDoc.email || "",
                        gstin: userDoc.gstin || "",
                        bankName: userDoc.bankName || "",
                        accountNo: userDoc.accountNo || "",
                        ifsc: userDoc.ifsc || "",
                        upiId: userDoc.upiId || "",
                        logoUrl: userDoc.logoUrl || userDoc.logo_url || "",
                    };
                }
            }
        } catch { /* company lookup failed */ }

        // ── 4. Generate invoice number ──────────────────────────
        const invoiceNumber = await generateSequentialInvoiceNumber("INV");

        // ── 5. Build invoice data ───────────────────────────────
        const now = new Date();
        const dueDate = new Date(now);
        dueDate.setDate(dueDate.getDate() + 30); // Net 30

        const productName = order.product_name || order.productName || "Product";
        const quantity = Number(order.quantity) || 1;
        const rate = Number(order.rate) || 0;
        const subtotal = quantity * rate;

        // GST defaults: 18% split as 9% CGST + 9% SGST
        const gstRate = 18;
        const cgstRate = gstRate / 2;
        const sgstRate = gstRate / 2;
        const cgstAmount = Math.round((subtotal * cgstRate) / 100 * 100) / 100;
        const sgstAmount = Math.round((subtotal * sgstRate) / 100 * 100) / 100;
        const totalAmount = subtotal + cgstAmount + sgstAmount;

        const invoiceData = {
            invoiceNumber,
            issueDate: now.toISOString(),
            dueDate: dueDate.toISOString(),
            status: "draft" as const,

            company: {
                companyName: company?.companyName || company?.company_name || "Your Company",
                address: company?.address || "",
                phone: company?.phone || "",
                email: company?.email || "",
                gstin: company?.gstin || "",
                pan: company?.pan || "",
                logoUrl: company?.logoUrl || company?.logo_url || "",
                bankName: company?.bankName || company?.bank_name || "",
                accountNo: company?.accountNo || company?.account_no || "",
                ifsc: company?.ifsc || "",
                upiId: company?.upiId || company?.upi_id || "",
            },

            client: {
                name: client?.name || "Client",
                address: client?.address || "",
                phone: client?.phone || "",
                email: client?.email || "",
                gstin: client?.gstin || "",
            },

            items: [
                {
                    description: productName,
                    quantity,
                    unit: order.unit || "pcs",
                    rate,
                    amount: subtotal,
                    gstRate,
                    hsnCode: "",
                },
            ],

            subtotal,
            cgstAmount,
            sgstAmount,
            igstAmount: 0,
            totalAmount,

            orderRef: orderId,
            notes: "",
            terms: "Payment is due within 30 days of invoice date.",
        };

        // ── 6. Save invoice record in MongoDB ───────────────────
        const invoiceDoc = {
            userId,
            ...invoiceData,
            orderId: new ObjectId(orderId),
            createdAt: now,
            updatedAt: now,
        };

        const insertResult = await db.collection("invoices").insertOne(invoiceDoc);

        return NextResponse.json({
            success: true,
            invoiceId: insertResult.insertedId.toString(),
            invoiceNumber,
            invoiceData,
        });
    } catch (error: any) {
        console.error("[invoices/auto-generate] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate invoice" },
            { status: 500 },
        );
    }
}
