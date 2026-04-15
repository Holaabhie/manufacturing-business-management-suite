/**
 * Invoice Routes — Express (with Idempotency Protection)
 * ────────────────────────────────────────────────────────
 * Example Express API routes demonstrating all 3 backend protection layers.
 *
 *   POST /api/invoices       — Create invoice (idempotency protected)
 *   GET  /api/invoices       — List invoices
 *   GET  /api/invoices/:id   — Get single invoice
 */

const express = require('express');
const mongoose = require('mongoose');
const idempotency = require('../middleware/idempotency');
const { verifyToken } = require('../controllers/authController');

const router = express.Router();

// ══════════════════════════════════════════════════════════
// Invoice Schema (inline for this example — move to models/)
// ══════════════════════════════════════════════════════════

const invoiceSchema = new mongoose.Schema(
    {
        invoiceNumber: {
            type: String,
            required: true,
        },
        userId: {
            type: String,
            required: true,
        },
        clientName: {
            type: String,
            required: true,
        },
        items: [
            {
                description: String,
                quantity: { type: Number, default: 1 },
                rate: { type: Number, default: 0 },
                amount: { type: Number, default: 0 },
            },
        ],
        subtotal: { type: Number, default: 0 },
        cgstAmount: { type: Number, default: 0 },
        sgstAmount: { type: Number, default: 0 },
        totalAmount: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
            default: 'draft',
        },
    },
    {
        timestamps: true,
        collection: 'invoices',
    }
);

// ── LAYER A: Unique Database Constraint ───────────────────
// Compound unique index prevents same invoice number per user
invoiceSchema.index({ invoiceNumber: 1, userId: 1 }, { unique: true });

const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

// ══════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════

/**
 * POST /api/invoices — Create a new invoice
 *
 * Protected by:
 *   Layer A: Unique index on (invoiceNumber + userId) — MongoDB enforced
 *   Layer B: Idempotency middleware — blocks reprocessing of same UUID
 *   Layer C: Pre-save existence check — catches duplicates before insert
 */
router.post(
    '/api/invoices',
    verifyToken,                        // Auth: JWT required
    idempotency({ required: false }),   // Layer B: Idempotency key (optional but recommended)
    async (req, res) => {
        try {
            const { invoiceNumber, clientName, items, subtotal, cgstAmount, sgstAmount, totalAmount } = req.body;

            // ── Validation ────────────────────────────────
            if (!invoiceNumber || !clientName) {
                return res.status(400).json({
                    error: 'Validation failed',
                    message: 'invoiceNumber and clientName are required.',
                    code: 'VALIDATION_ERROR',
                });
            }

            // ── LAYER C: Safe-save pre-check ──────────────
            const existingInvoice = await Invoice.findOne({
                invoiceNumber,
                userId: req.user.id,
            });

            if (existingInvoice) {
                console.warn(
                    `[invoices] Duplicate invoice blocked (pre-check): ` +
                    `number=${invoiceNumber} user=${req.user.id}`
                );
                return res.status(409).json({
                    error: 'Duplicate invoice',
                    message: `Invoice ${invoiceNumber} already exists.`,
                    code: 'DUPLICATE_INVOICE',
                    existingId: existingInvoice._id.toString(),
                });
            }

            // ── Create the invoice ────────────────────────
            const invoice = await Invoice.create({
                invoiceNumber,
                userId: req.user.id,
                clientName,
                items: items || [],
                subtotal: subtotal || 0,
                cgstAmount: cgstAmount || 0,
                sgstAmount: sgstAmount || 0,
                totalAmount: totalAmount || 0,
            });

            console.log(`[invoices] Created: ${invoiceNumber} for user=${req.user.id}`);

            return res.status(201).json({
                id: invoice._id.toString(),
                invoiceNumber: invoice.invoiceNumber,
                clientName: invoice.clientName,
                totalAmount: invoice.totalAmount,
                status: invoice.status,
                createdAt: invoice.createdAt,
            });
        } catch (err) {
            // ── LAYER A: Unique index violation ───────────
            if (err.code === 11000) {
                console.warn(
                    `[invoices] Duplicate invoice blocked (index): ` +
                    `body=${JSON.stringify(req.body).slice(0, 100)}`
                );
                return res.status(409).json({
                    error: 'Duplicate invoice',
                    message: 'An invoice with this number already exists.',
                    code: 'DUPLICATE_KEY',
                });
            }

            // ── Validation errors ─────────────────────────
            if (err.name === 'ValidationError') {
                return res.status(400).json({
                    error: 'Validation failed',
                    message: err.message,
                    code: 'VALIDATION_ERROR',
                });
            }

            console.error('[invoices] Create error:', err);
            return res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to create invoice. Please try again.',
            });
        }
    }
);

/**
 * GET /api/invoices — List all invoices for the authenticated user
 */
router.get('/api/invoices', verifyToken, async (req, res) => {
    try {
        const invoices = await Invoice.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .lean();

        return res.json(
            invoices.map((inv) => ({
                id: inv._id.toString(),
                invoiceNumber: inv.invoiceNumber,
                clientName: inv.clientName,
                totalAmount: inv.totalAmount,
                status: inv.status,
                createdAt: inv.createdAt,
            }))
        );
    } catch (err) {
        console.error('[invoices] List error:', err);
        return res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});

/**
 * GET /api/invoices/:id — Get a single invoice
 */
router.get('/api/invoices/:id', verifyToken, async (req, res) => {
    try {
        const invoice = await Invoice.findOne({
            _id: req.params.id,
            userId: req.user.id,
        }).lean();

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        return res.json({
            id: invoice._id.toString(),
            ...invoice,
        });
    } catch (err) {
        console.error('[invoices] Get error:', err);
        return res.status(500).json({ error: 'Failed to fetch invoice' });
    }
});

module.exports = router;
