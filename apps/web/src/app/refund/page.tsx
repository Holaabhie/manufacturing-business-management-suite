import React from "react";
import { Metadata } from "next";
import { refundData } from "@/content/legal/refund";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Refund & Cancellation | IND Manager",
  description:
    "Understand IND Manager's 7-day first purchase refund guarantee, transparent cancellation workflows, and billing policies.",
  alternates: {
    canonical: "/refund",
  },
};

export default function RefundPage() {
  return <LegalLayout doc={refundData} />;
}
