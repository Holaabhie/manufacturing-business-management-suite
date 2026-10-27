import { PLANS, formatPrice } from "@/lib/razorpay/plans";
import { COMPANY, isFilled } from "@/content/company";
import { LegalDocument } from "./types";

const companyEntityText = isFilled(COMPANY.legalName)
  ? COMPANY.legalName
  : "IND Manager";

export const refundData: LegalDocument = {
  id: "refund",
  title: "Refund & Cancellation Policy",
  badgeLabel: "Billing & Subscriptions",
  summary:
    "Clear, straightforward cancellation rules and refund eligibility for IND Manager subscriptions.",
  lastUpdated: COMPANY.effectiveDate,
  accentColor: "purple",
  atAGlance: [
    {
      title: "Free Starter Plan",
      description:
        "Test our core manufacturing tools with up to 5 items, orders, and clients completely free without entering a credit card.",
      badge: "Free Forever",
    },
    {
      title: "Cancel Anytime",
      description:
        "Cancel your paid Pro subscription directly in your settings. You retain full access until the current billing period concludes.",
      badge: "Self-Serve",
    },
    {
      title: "7-Day First Purchase Refund",
      description:
        "If you subscribe to Pro for the first time and find it is not a fit for your factory, request a full refund within 7 calendar days.",
      badge: "7-Day Guarantee",
    },
    {
      title: "Duplicate Charges Refunded",
      description:
        "Any duplicate, failed, or erroneous transaction amounts are refunded in full back to the original source payment method.",
      badge: "Full Protection",
    },
  ],
  sections: [
    {
      id: "overview-and-plans",
      number: 1,
      title: "Subscription Plans & Pricing Structure",
      paragraphs: [
        `${companyEntityText} provides cloud software subscriptions designed to give manufacturing businesses predictable, transparent pricing without hidden lock-ins or mandatory long-term commitments.`,
        `Our software plans are structured into two straightforward tiers: Starter (Free Forever) and Pro (available on Monthly or Annual billing cycles). The exact prices and quota limits are maintained as follows:`,
      ],
      table: {
        caption: "IND Manager Subscription Tiers & Pricing",
        headers: ["Tier Name", "Billing Period", "Price", "Quota Limits", "Key Features Included"],
        rows: [
          [
            "Starter",
            "Free Forever",
            "₹0",
            "5 items, 5 orders, 5 clients",
            "Core production tracking, single-user admin, basic ledgers",
          ],
          [
            "Pro Monthly",
            "Monthly recurring",
            formatPrice(PLANS.pro_monthly.price),
            "Unlimited items, orders & clients",
            "All 21 modules, AI Assistant, CSV/PDF exports, multi-user staff",
          ],
          [
            "Pro Yearly",
            "Annual recurring",
            formatPrice(PLANS.pro_yearly.price),
            "Unlimited items, orders & clients",
            "All Pro features with approx. 17% savings (2 months free)",
          ],
        ],
      },
    },
    {
      id: "how-cancellation-works",
      number: 2,
      title: "How Cancellation Works",
      paragraphs: [
        "You can cancel your paid Pro subscription at any time directly through your account dashboard at Settings > Upgrade > Cancel Subscription, or by contacting our support team.",
        "When cancelling an active subscription, you are presented with two cancellation options:",
        "1. Cancel at Period End (Standard): Your subscription will remain fully active with all Pro features unlocked until the end of your current paid billing period (month or year). When the period concludes, no further renewal charges will be debited, and your account will automatically transition to the Starter tier.",
        "2. Cancel Immediately: Your account immediately reverts to the Starter tier. While your existing data remains intact, access to Pro features will discontinue right away.",
        "Cancelling your subscription ensures that you will not be charged for subsequent billing cycles.",
      ],
      callout: {
        type: "note",
        title: "Retain Your Data",
        text: "Cancelling a subscription never deletes your historical invoices, order ledgers, or customer profiles. Your records remain safe and accessible under the Starter tier.",
      },
    },
    {
      id: "refund-eligibility",
      number: 3,
      title: "Refund Eligibility (7-Day First Purchase Guarantee)",
      paragraphs: [
        "We want you to feel completely confident trying IND Manager for your manufacturing shop floor. Therefore, we offer a 7-day money-back guarantee for first-time Pro subscription purchases.",
        "You are eligible for a full refund of your subscription fee if all of the following conditions are met:",
        "1. The request pertains to your very first initial purchase of a paid Pro tier (Monthly or Yearly).",
        "2. Your written refund request is submitted within seven (7) calendar days of the initial transaction timestamp.",
        "3. You have not violated our Terms and Conditions or Acceptable Use Policy.",
        "Upon approval of an eligible first-purchase refund, your Pro access will terminate immediately, and a 100% refund of the subscription fee will be processed to your original payment method.",
      ],
    },
    {
      id: "non-refundable-cases",
      number: 4,
      title: "Non-Refundable Circumstances",
      paragraphs: [
        "Except as expressly stated in our 7-day first purchase guarantee or required by applicable statutory consumer protection law, subscription fees are non-refundable. The following cases are strictly ineligible for refunds:",
        "1. Renewal Billing Cycles: Automatic or manual subscription renewals (whether monthly or annual) are non-refundable once debited. You are expected to cancel before your next scheduled renewal date if you do not wish to renew.",
        "2. Beyond the 7-Day Window: Any refund request for an initial purchase submitted on or after the 8th calendar day following payment.",
        "3. Partial-Month or Unused Period Credits: We do not offer prorated refunds for mid-cycle cancellations or periods during which the software was active but unused.",
        "4. Accounts Terminated for Policy Violations: Accounts suspended or terminated due to breaches of our Acceptable Use Policy, fraudulent activity, or illegal conduct are not entitled to refunds.",
      ],
      callout: {
        type: "important",
        title: "Renewal Reminders",
        text: "To avoid unwanted renewal charges, please cancel your subscription prior to your billing renewal date via the Upgrade page.",
      },
    },
    {
      id: "how-to-request-refund",
      number: 5,
      title: "How to Request a Refund",
      paragraphs: [
        "To submit a refund request, send an email to our support desk with the subject line 'Refund Request — [Your Company / Account Email]'.",
        "Please include the following information in your request to expedite processing:",
        "• Your registered account email address and mobile number.",
        "• Transaction ID, payment reference, or invoice number.",
        "• Date of purchase and amount paid.",
        "• A brief reason for your cancellation (your feedback helps us improve IND Manager for all manufacturers).",
      ],
    },
    {
      id: "processing-timeline",
      number: 6,
      title: "Refund Processing & Payout Timeline",
      paragraphs: [
        "Once we receive your refund inquiry, our billing department verifies the transaction against our payment gateway logs in accordance with our transparent 4-stage process:",
        "1. Request Submitted: You receive an automated or manual acknowledgment within 24 hours.",
        "2. Eligibility Review: Our team verifies the transaction date and account status within 1 to 2 business days.",
        "3. Approval & Gateway Initiation: Once approved, the refund instruction is immediately triggered with our payment processing partner (such as Razorpay or our acquiring bank).",
        "4. Credit to Bank / Card: Banking rails in India typically require 5 to 7 business days for the funds to reflect back on your credit card, debit card, UPI VPA, or bank statement, depending on your issuing financial institution.",
      ],
    },
    {
      id: "duplicate-failed-payments",
      number: 7,
      title: "Duplicate & Failed Transactions",
      paragraphs: [
        "In the event that an automated checkout or network glitch causes multiple charges for a single subscription period, or if an amount is debited from your account but your plan is not activated due to a technical timeout, please notify us immediately.",
        "All verified duplicate or orphan charges are refunded in full immediately upon confirmation with our acquiring payment partner. Such technical refunds are not subject to the 7-day limitation.",
      ],
    },
    {
      id: "plan-changes-and-downgrades",
      number: 8,
      title: "Plan Changes, Upgrades & Downgrades",
      paragraphs: [
        "Upgrading from Pro Monthly to Pro Yearly: When you switch from monthly to annual billing, the transition applies at the conclusion of your current monthly cycle or can be activated immediately with prorated credit toward the annual plan.",
        "Downgrading from Pro to Starter: You can schedule a downgrade to the free Starter tier at any time. The downgrade takes effect at the end of your current paid billing period so you retain full access to Pro capabilities for the duration you have paid for.",
      ],
    },
    {
      id: "chargebacks-and-disputes",
      number: 9,
      title: "Chargebacks & Payment Disputes",
      paragraphs: [
        "We encourage you to contact our support team directly regarding any billing discrepancy or refund request before initiating a chargeback or dispute with your bank or credit card issuer.",
        "Initiating an unwarranted payment dispute or chargeback without prior communication may result in immediate temporary suspension of your account pending resolution of the inquiry.",
      ],
    },
    {
      id: "contact-for-billing",
      number: 10,
      title: "Billing Inquiries & Contact",
      paragraphs: [
        "If you have questions regarding an invoice, payment status, or this Refund and Cancellation Policy, please contact our billing support team through the official communication options listed on our Contact page.",
        `Our standard response time for billing and cancellation inquiries is ${COMPANY.responseTime}.`,
      ],
    },
  ],
  faqs: [
    {
      question: "Can I try IND Manager before paying?",
      answer:
        "Yes! Our Starter plan is 100% free forever and requires no credit card. You can explore all core features with up to 5 inventory items, 5 orders, and 5 clients.",
    },
    {
      question: "What is your refund policy for annual Pro plans?",
      answer:
        "First-time purchasers of the Pro Yearly plan are fully protected by our 7-day money-back guarantee. If you request a refund within 7 days of purchase, you receive a 100% refund.",
    },
    {
      question: "How long does it take for the refund money to reach my bank?",
      answer:
        "Once our team approves the refund, it is initiated immediately. Due to standard Indian banking clearing protocols (UPI / NEFT / card networks), it typically appears in your bank account within 5 to 7 business days.",
    },
    {
      question: "What happens to my factory data if I cancel Pro?",
      answer:
        "Your data remains completely safe! When your paid period ends, your account transitions to the Starter plan. You can still view and export your existing records, and create additional items within the Starter quota.",
    },
    {
      question: "How do I cancel my subscription so I don't get charged again?",
      answer:
        "Simply navigate to Dashboard > Upgrade, click 'Manage / Cancel', and choose 'Cancel at Period End'. You will retain Pro access for the remainder of the paid period, and no further renewals will be charged.",
    },
  ],
};
