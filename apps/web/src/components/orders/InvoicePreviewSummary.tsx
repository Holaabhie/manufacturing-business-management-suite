"use client";

import React from "react";
import { useTranslations } from "next-intl";
import type { InvoicePreviewData } from "./types";

interface InvoicePreviewSummaryProps {
  inv: InvoicePreviewData;
}

export function InvoicePreviewSummary({ inv }: InvoicePreviewSummaryProps) {
  const t = useTranslations("orders");

  return (
    <div
      style={{
        background: "var(--overlay-card-bg)",
        border: "1px solid var(--overlay-border)",
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--overlay-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              margin: 0,
            }}
          >
            {t("invoicePreview.billTo")}
          </p>
          <p style={{ fontSize: 16, fontWeight: 600, color: "var(--overlay-text-primary)", margin: "4px 0 0" }}>
            {inv.client?.name || "Client"}
          </p>
          {inv.client?.address && (
            <p style={{ fontSize: 12, color: "var(--overlay-text-secondary)", margin: "2px 0 0" }}>
              {inv.client.address}
            </p>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--overlay-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              margin: 0,
            }}
          >
            {t("invoicePreview.total")}
          </p>
          <p style={{ fontSize: 22, fontWeight: 600, color: "#16a34a", margin: "4px 0 0" }}>
            ₹{Number(inv.totalAmount).toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Items */}
      <div
        style={{
          background: "var(--overlay-card-bg)",
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid var(--overlay-border)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 60px 80px 90px",
            padding: "8px 12px",
            background: "var(--overlay-hover)",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--overlay-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          <span>{t("invoicePreview.item")}</span>
          <span style={{ textAlign: "right" }}>{t("invoicePreview.qty")}</span>
          <span style={{ textAlign: "right" }}>{t("invoicePreview.rate")}</span>
          <span style={{ textAlign: "right" }}>{t("invoicePreview.amount")}</span>
        </div>
        {(inv.items || []).map((item, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 60px 80px 90px",
              padding: "10px 12px",
              borderTop: "1px solid var(--overlay-border)",
              fontSize: 13,
              color: "var(--overlay-text-primary)",
            }}
          >
            <span style={{ fontWeight: 500 }}>{item.description}</span>
            <span style={{ textAlign: "right", color: "var(--overlay-text-muted)" }}>
              {item.quantity} {item.unit}
            </span>
            <span style={{ textAlign: "right", color: "var(--overlay-text-muted)" }}>
              ₹{Number(item.rate).toLocaleString("en-IN")}
            </span>
            <span style={{ textAlign: "right", fontWeight: 600 }}>
              ₹{Number(item.amount).toLocaleString("en-IN")}
            </span>
          </div>
        ))}
        {/* Totals */}
        <div style={{ borderTop: "1px solid var(--overlay-border)", padding: "8px 12px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "var(--overlay-text-muted)",
              marginBottom: 4,
            }}
          >
            <span>{t("invoicePreview.subtotal")}</span>
            <span>₹{Number(inv.subtotal).toLocaleString("en-IN")}</span>
          </div>
          {inv.cgstAmount > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "var(--overlay-text-muted)",
                marginBottom: 4,
              }}
            >
              <span>{t("invoicePreview.cgst")}</span>
              <span>₹{Number(inv.cgstAmount).toLocaleString("en-IN")}</span>
            </div>
          )}
          {inv.sgstAmount > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "var(--overlay-text-muted)",
                marginBottom: 4,
              }}
            >
              <span>{t("invoicePreview.sgst")}</span>
              <span>₹{Number(inv.sgstAmount).toLocaleString("en-IN")}</span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 14,
              fontWeight: 600,
              color: "#16a34a",
              paddingTop: 6,
              borderTop: "1px solid var(--overlay-border)",
            }}
          >
            <span>{t("invoicePreview.total")}</span>
            <span>₹{Number(inv.totalAmount).toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
