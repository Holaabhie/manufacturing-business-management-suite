import React from "react";
import { Metadata } from "next";
import { termsData } from "@/content/legal/terms";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Terms and Conditions | IND Manager",
  description:
    "Review the terms and conditions governing access to and usage of IND Manager's manufacturing management platform.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return <LegalLayout doc={termsData} />;
}
