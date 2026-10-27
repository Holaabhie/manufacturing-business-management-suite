import React from "react";
import { Metadata } from "next";
import { privacyData } from "@/content/legal/privacy";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy | IND Manager",
  description:
    "Learn how IND Manager protects your credentials, company records, and client databases in compliance with the DPDP Act 2023.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return <LegalLayout doc={privacyData} />;
}
