/**
 * Company Profile & Public Contact Information
 * 
 * Centralized data source for marketing and legal pages.
 * Any empty value MUST render NOTHING (hidden from UI).
 * Never invent values; never display "TBD" or placeholder strings.
 */

export interface GrievanceOfficer {
  name?: string;
  email?: string;
}

export interface CompanyDetails {
  legalName?: string;
  supportEmail?: string;
  phone?: string;
  address?: string;
  jurisdictionCity?: string;
  grievanceOfficer?: GrievanceOfficer;
  founderName?: string;
  instagramUrl: string;
  handle: string;
  effectiveDate: string;
  responseTime: string;
}

export const COMPANY: CompanyDetails = {
  legalName: "",
  supportEmail: "",
  phone: "",
  address: "",
  jurisdictionCity: "",
  grievanceOfficer: {
    name: "",
    email: "",
  },
  founderName: "",
  instagramUrl: "https://instagram.com/ind.manager",
  handle: "@ind.manager",
  effectiveDate: "13 October 2026",
  responseTime: "within 1–2 business days",
};

/**
 * Returns true if a string is non-empty and not a placeholder.
 */
export function isFilled(val?: string | null): val is string {
  if (!val) return false;
  const trimmed = val.trim();
  if (trimmed === "" || trimmed === "[FILL]" || trimmed === "TBD" || trimmed === "FILL") {
    return false;
  }
  return true;
}
