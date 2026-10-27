/**
 * Type definitions for legal documents and layout rendering.
 */

export interface AtAGlanceCard {
  title: string;
  description: string;
  badge?: string;
}

export interface LegalTable {
  caption?: string;
  headers: string[];
  rows: string[][];
}

export interface LegalCallout {
  type: "important" | "note";
  title?: string;
  text: string;
}

export interface LegalSection {
  id: string;
  number: number;
  title: string;
  paragraphs: string[];
  callout?: LegalCallout;
  table?: LegalTable;
  subsections?: {
    id: string;
    title: string;
    paragraphs: string[];
  }[];
}

export interface LegalFAQ {
  question: string;
  answer: string;
}

export type AccentColor = "blue" | "green" | "purple";

export interface LegalDocument {
  id: "terms" | "privacy" | "refund";
  title: string;
  badgeLabel: string;
  summary: string;
  lastUpdated: string;
  accentColor: AccentColor;
  atAGlance: AtAGlanceCard[];
  sections: LegalSection[];
  faqs: LegalFAQ[];
}
