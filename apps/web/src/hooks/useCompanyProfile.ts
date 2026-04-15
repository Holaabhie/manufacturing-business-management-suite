"use client";

import { useState, useEffect, useCallback } from "react";

export interface CompanyProfile {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  gstin?: string;
  pan?: string;
  bankName?: string;
  accountNo?: string;
  ifsc?: string;
  upiId?: string;
  businessType?: string;
}

/**
 * Single source of truth hook for company profile data.
 * Used by BOTH the OnboardingModal AND the Settings page.
 *
 * - Fetches from GET /api/profile/company on mount
 * - Updates via PUT /api/profile/company
 * - Returns { company, loading, error, updateCompanyProfile, refetchCompany }
 */
export function useCompanyProfile() {
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanyProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/company");
      if (!res.ok) {
        throw new Error("Failed to fetch company profile");
      }
      const data = await res.json();
      setCompany(data.company || null);
    } catch (err: any) {
      console.error("Error fetching company profile:", err);
      setError(err.message || "Failed to load company profile");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchCompanyProfile();
  }, [fetchCompanyProfile]);

  /**
   * Update company profile via PUT /api/profile/company.
   * On success, updates local state immediately and returns the updated data.
   * On failure, throws an error (caller should handle).
   */
  const updateCompanyProfile = useCallback(
    async (details: Partial<CompanyProfile>): Promise<CompanyProfile> => {
      const res = await fetch("/api/profile/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(details),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save company details");
      }

      // Update local state immediately with server response
      const updated = data.company as CompanyProfile;
      setCompany(updated);
      return updated;
    },
    []
  );

  return {
    company,
    loading,
    error,
    updateCompanyProfile,
    refetchCompany: fetchCompanyProfile,
  };
}
