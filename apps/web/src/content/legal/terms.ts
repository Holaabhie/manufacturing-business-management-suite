import { PLANS, formatPrice } from "@/lib/razorpay/plans";
import { COMPANY, isFilled } from "@/content/company";
import { LegalDocument } from "./types";

const jurisdictionText = isFilled(COMPANY.jurisdictionCity)
  ? `the competent courts located in ${COMPANY.jurisdictionCity}, India`
  : "the competent courts having jurisdiction in India";

const companyEntityText = isFilled(COMPANY.legalName)
  ? COMPANY.legalName
  : "IND Manager";

export const termsData: LegalDocument = {
  id: "terms",
  title: "Terms and Conditions",
  badgeLabel: "Legal Agreement",
  summary:
    "Plain-language operating terms governing your access to and use of IND Manager's manufacturing management suite.",
  lastUpdated: COMPANY.effectiveDate,
  accentColor: "blue",
  atAGlance: [
    {
      title: "You Own Your Data",
      description:
        "All business data, customer records, inventory, and order logs uploaded to IND Manager remain your exclusive property.",
      badge: "Data Ownership",
    },
    {
      title: "Transparent SaaS Plans",
      description:
        "Free Starter plan with 5 items/orders/clients. Pro subscription with unlimited quotas at transparent monthly or annual pricing.",
      badge: "No Hidden Fees",
    },
    {
      title: "Not Financial Advice",
      description:
        "IND Manager automates operational records and tax calculations; always verify your GST filings and books with a qualified CA.",
      badge: "Operational Scope",
    },
    {
      title: "Cancel At Any Time",
      description:
        "Cancel your paid subscription whenever you wish from your account settings without punitive fees or locked exit gates.",
      badge: "No Lock-in",
    },
  ],
  sections: [
    {
      id: "acceptance-and-eligibility",
      number: 1,
      title: "Acceptance & Eligibility",
      paragraphs: [
        `These Terms and Conditions ("Terms") constitute a legally binding agreement between you (whether individually or on behalf of a registered business entity, partnership, proprietorship, or enterprise) and ${companyEntityText} ("IND Manager", "we", "us", or "our"), governing your access to and use of our web application, local bridges, documentation, and associated services (collectively, the "Service").`,
        "By accessing, registering for, or using the Service, you confirm that you have read, understood, and agreed to be bound by these Terms and our Privacy Policy. If you do not agree with all terms contained herein, you are strictly prohibited from using the Service and must cease usage immediately.",
        "To register an account or use IND Manager, you must be an individual of at least 18 years of age or an authorized representative of a business entity duly registered under the laws of India or your local jurisdiction. By creating an account on behalf of a business, you represent and warrant that you possess full corporate authority to bind that entity to these Terms.",
      ],
      callout: {
        type: "note",
        title: "Commercial Use",
        text: "IND Manager is designed specifically for manufacturing business management, job shops, factories, and commercial enterprises. Standard consumer consumer-protection rights are supplemented by commercial contract norms.",
      },
    },
    {
      id: "the-service",
      number: 2,
      title: "The Service",
      paragraphs: [
        "IND Manager provides cloud-hosted operational software tailored for Indian manufacturing enterprises and small-to-medium businesses (SMBs). Features include sales order administration, shop-floor production tracking, inventory and raw material ledgers, delivery challans, GST billing calculations, petty expense recording, role-based staff permissions, client statements, offline data exports, and AI-assisted queries.",
        "The Service is provided over the Internet via supported web browsers and cross-platform web wrappers. You are solely responsible for obtaining and maintaining all internet connectivity, computer equipment, local networks, and mobile hardware required to access the Service.",
        "We continually evolve and update IND Manager to introduce optimizations, security hardening, and feature enhancements. While we strive to maintain uninterrupted operation, the Service is delivered on an ongoing SaaS basis and is subject to routine maintenance windows and continuous deployment cycles.",
      ],
    },
    {
      id: "accounts-and-security",
      number: 3,
      title: "Accounts & Security",
      paragraphs: [
        "To access primary operational modules, you must register an account using a valid email address, mobile phone number, and a secure password. You agree to provide accurate, current, and complete information during registration and to maintain the prompt accuracy of such data in your account profile.",
        "You are strictly responsible for safeguarding the credentials associated with your account, including passwords, verification OTPs, and active session tokens. You must not share administrative credentials outside authorized managerial personnel within your enterprise. Any activity occurring under your account or staff credentials assigned by you shall be deemed authorized by you.",
        "If you suspect or discover any unauthorized access, session compromise, or security incident involving your account, you must immediately notify IND Manager support and revoke active sessions through Settings > Security.",
      ],
      callout: {
        type: "important",
        title: "Session Control",
        text: "IND Manager provides an active session manager in your security settings. You can review active device logins, IP addresses, and revoke any or all active sessions instantly.",
      },
    },
    {
      id: "plans-subscriptions-fees",
      number: 4,
      title: "Plans, Subscriptions & Fees",
      paragraphs: [
        `IND Manager provides both free and paid subscription plans as presented on our Upgrade page. Current standard pricing is as follows: Starter plan is available at ₹0 (Free forever); Pro Monthly is priced at ${formatPrice(PLANS.pro_monthly.price)} per month; Pro Yearly is priced at ${formatPrice(PLANS.pro_yearly.price)} per year (providing approximately 17% savings over monthly billing).`,
        "The Starter plan allows you to test and manage basic factory workflows with quota limits of 5 inventory items, 5 customer orders, and 5 clients. Upgrading to the Pro tier removes these limits and activates unlimited projects, advanced reporting, AI Assistant capabilities, and complete export modules.",
        "Subscription fees are billed in Indian Rupees (INR) on a recurring basis (monthly or annually) according to your selected billing interval. When automated payment gateways (such as Razorpay or UPI) are activated, recurring fees are debited at the commencement of each billing cycle until cancelled. Where direct bank transfer or manual invoicing is arranged, payments must be settled before plan activation.",
        "All stated subscription prices represent the software access fee as configured in our platform. Applicable statutory taxes (such as Indian Goods and Services Tax, GST) are assessed and displayed at checkout in accordance with prevailing Indian tax legislation.",
      ],
      table: {
        caption: "Current Subscription Tiers & Enforced Quotas",
        headers: ["Plan Tier", "Billing Cycle", "Price", "Item & Order Caps", "Key Capabilities"],
        rows: [
          [
            "Starter",
            "Free Forever",
            "₹0",
            "5 items, 5 orders, 5 clients",
            "Core modules, single-user admin, basic tracking",
          ],
          [
            "Pro Monthly",
            "Monthly recurring",
            formatPrice(PLANS.pro_monthly.price),
            "Unlimited",
            "All 21 modules, AI Assistant, PDF/CSV exports, multi-user staff",
          ],
          [
            "Pro Yearly",
            "Annual recurring",
            formatPrice(PLANS.pro_yearly.price),
            "Unlimited",
            "All Pro features + 2 months free equivalent savings",
          ],
        ],
      },
    },
    {
      id: "your-data-and-content",
      number: 5,
      title: "Your Data & Content Ownership",
      paragraphs: [
        "You retain 100% intellectual property ownership and full commercial title to all business data, customer ledgers, supplier information, material specifications, order line items, pricing lists, images, and notes that you enter, upload, or process through the Service ('Customer Data').",
        "IND Manager does not claim any proprietary interest or copyright in your Customer Data. You grant us only a limited, non-exclusive, worldwide license to host, copy, process, transmit, and display Customer Data solely to the extent necessary to provide, secure, and maintain the Service for your account.",
        "You are solely responsible for ensuring that the collection and processing of your Customer Data complies with applicable privacy laws, including the Indian Digital Personal Data Protection Act, 2023 (DPDP Act). You can export your data at any time via Settings > Data in standardized spreadsheet formats.",
      ],
    },
    {
      id: "acceptable-use",
      number: 6,
      title: "Acceptable Use Policy",
      paragraphs: [
        "You agree to use IND Manager solely for lawful business and manufacturing management purposes. You agree not to engage in any activity that interferes with, disrupts, or compromises the integrity or performance of the Service.",
        "Prohibited actions include: (a) attempting to reverse engineer, decompile, or disassemble any part of the Service; (b) attempting to circumvent security mechanisms, tenant isolation guards, rate limiters, or permission boundaries; (c) uploading malicious code, automated scraping agents, or harmful payloads; (d) storing data that infringes third-party intellectual property or privacy rights; and (e) misrepresenting your identity or unauthorizedly accessing another business's tenant records.",
        "Violation of our Acceptable Use Policy may result in immediate suspension or termination of your account without prior notice or refund.",
      ],
    },
    {
      id: "ai-assistant-integrations",
      number: 7,
      title: "AI Assistant & Third-Party Integrations",
      paragraphs: [
        "IND Manager includes optional productivity integrations and assistive tools, including an intelligent read-only AI Assistant powered by Google Gemini, local desktop XML export bridges for Tally Prime, and multi-channel message dispatchers.",
        "The AI Assistant operates in a strictly read-only mode to answer operational queries regarding orders, delivery status, and production stages. When you interact with the AI Assistant, only tenant-scoped operational query parameters and database summaries needed to fulfill your question are transmitted to Google Gemini. You understand that artificial intelligence models are probabilistic and may occasionally produce imprecise or incomplete responses. Critical manufacturing decisions should always be verified against source ledger entries.",
        "External integrations (such as Twilio for WhatsApp/SMS notifications, SMTP relays for email delivery, or Tally desktop bridges) depend on external telecommunication carriers, desktop client connectivity, and third-party APIs. We do not guarantee uninterrupted third-party service availability or carrier message delivery times.",
      ],
    },
    {
      id: "not-tax-or-accounting-advice",
      number: 8,
      title: "Not Tax, Legal, or Accounting Advice",
      paragraphs: [
        "IND Manager provides software utilities to record sales transactions, generate invoices, format delivery challans, and estimate GST breakdowns (CGST, SGST, IGST) based on tax rates and HSN codes input by the user.",
        "The Service does not provide, and must not be construed as providing, legal, tax, audit, financial, or accounting advice. IND Manager is not a chartered accountant, tax practitioner, or government filing portal.",
        "You are solely responsible for confirming the accuracy of all tax rates, HSN codes, GSTIN verifications, Reverse Charge Mechanism (RCM) applicability, and e-way bill obligations with your qualified Chartered Accountant (CA) or tax advisor before filing statutory returns with the GST Network (GSTN) or tax authorities.",
      ],
      callout: {
        type: "important",
        title: "Statutory Filing Notice",
        text: "Always reconcile invoices, delivery challans, and tax calculations generated by IND Manager with your registered tax consultant prior to GSTR-1, GSTR-3B, or annual return submissions.",
      },
    },
    {
      id: "availability-and-modifications",
      number: 9,
      title: "Availability & Service Modifications",
      paragraphs: [
        "We strive to maintain high availability and reliability for IND Manager. However, we do not warrant that the Service will operate completely error-free, uninterrupted, or without occasional latency caused by internet backbone maintenance, hosting provider outages, or system upgrades.",
        "We reserve the right to modify, enhance, or adjust specific features, user interfaces, or operational limits of the Service over time to improve performance, comply with regulatory requirements, or reflect architectural updates. Where significant modifications materially reduce existing core functionality on an active paid plan, we will provide reasonable advance notice via email or in-app announcement.",
      ],
    },
    {
      id: "intellectual-property",
      number: 10,
      title: "Intellectual Property Rights",
      paragraphs: [
        "The Service, including its software code, system architectures, database designs, user interfaces, graphics, brand trademarks, logos, documentation, and algorithms, is and remains the exclusive intellectual property of IND Manager and its licensors.",
        "Subject to your compliance with these Terms and payment of applicable fees, IND Manager grants you a limited, non-exclusive, non-transferable, revocable license to access and use the Service for your internal manufacturing business operations during the term of your subscription.",
        "No right, title, or interest in or to any trademark, logo, trade secret, or copyright of IND Manager is transferred to you.",
      ],
    },
    {
      id: "suspension-and-termination",
      number: 11,
      title: "Suspension & Termination",
      paragraphs: [
        "You may terminate your account at any time by cancelling your subscription and submitting a written account closure request to our support team.",
        "We may suspend or terminate your access to the Service immediately and without prior liability if: (a) you breach any material provision of these Terms; (b) your account payment is overdue following notice; (c) your conduct threatens the security, availability, or integrity of our infrastructure or other tenants; or (d) required to do so by applicable law or judicial decree.",
        "Upon termination, your right to access the Service shall immediately cease. You may request a complete export of your Customer Data within 30 days of termination, after which your operational records will be queued for permanent cryptographic deletion from our production databases.",
      ],
    },
    {
      id: "disclaimers-and-liability",
      number: 12,
      title: "Disclaimers & Limitation of Liability",
      paragraphs: [
        "TO THE MAXIMUM EXTENT PERMITTED UNDER APPLICABLE LAW, THE SERVICE IS PROVIDED ON AN 'AS IS' AND 'AS AVAILABLE' BASIS, WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING WITHOUT LIMITATION WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.",
        "IN NO EVENT SHALL IND MANAGER, ITS DIRECTORS, EMPLOYEES, AGENTS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, LOSS OF REVENUE, BUSINESS INTERRUPTION, LOSS OF DATA, OR PRODUCTION DELAYS, ARISING OUT OF OR IN CONNECTION WITH YOUR ACCESS TO OR USE OF (OR INABILITY TO USE) THE SERVICE.",
        "OUR AGGREGATE CUMULATIVE LIABILITY FOR ALL CLAIMS ARISING UNDER OR RELATING TO THESE TERMS OR THE SERVICE SHALL BE STRICTLY LIMITED TO THE TOTAL AMOUNT ACTUALLY PAID BY YOU TO IND MANAGER FOR THE SERVICE IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM.",
      ],
    },
    {
      id: "governing-law-and-disputes",
      number: 13,
      title: "Governing Law & Dispute Resolution",
      paragraphs: [
        `These Terms and any dispute, controversy, or claim arising out of or in connection with them shall be governed by, construed, and enforced in accordance with the laws of the Republic of India, without regard to conflict of law principles.`,
        `Subject to prior informal good-faith negotiation between the parties, you agree that any legal suit, action, or proceeding arising out of or relating to these Terms or the Service shall be instituted exclusively in ${jurisdictionText}.`,
        "Both parties agree to attempt in good faith to resolve any commercial dispute through informal written discussions before commencing formal litigation.",
      ],
    },
    {
      id: "changes-to-terms",
      number: 14,
      title: "Changes to These Terms",
      paragraphs: [
        "We may update or revise these Terms from time to time to accommodate new platform capabilities, regulatory mandates, or operational adjustments. The 'Last updated' date at the top of this document will always reflect the most recent effective revision.",
        "If a revision constitutes a material change to your rights or obligations, we will provide at least 15 days' notice prior to the change taking effect by posting an announcement in the application or dispatching an email to your registered account address.",
        "Your continued access to or use of IND Manager after the revised Terms become effective constitutes your acceptance of and agreement to the updated Terms.",
      ],
    },
    {
      id: "contact-and-grievance",
      number: 15,
      title: "Contact & Grievance Redressal",
      paragraphs: [
        "If you have any questions, clarifications, or feedback regarding these Terms, you may contact our team through the communication channels listed on our Contact page.",
        "In accordance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023, you may also reach our designated Grievance Officer for formal legal notices or regulatory communications via our designated contact channels.",
      ],
    },
  ],
  faqs: [
    {
      question: "Do I retain ownership of my factory records and customer database?",
      answer:
        "Yes, absolutely. You retain 100% proprietary ownership of all manufacturing, client, and accounting data you input into IND Manager. We never sell, monetize, or claim ownership over your records.",
    },
    {
      question: "Can I export all my data if I decide to discontinue?",
      answer:
        "Yes. You can export complete spreadsheets of your inventory, clients, staff, and order histories directly from Settings > Data at any time.",
    },
    {
      question: "Are prices inclusive of Indian GST?",
      answer:
        "The software access subscription prices are displayed transparently on our Upgrade page. Statutory taxes such as GST are computed and summarized at checkout based on Indian tax norms.",
    },
    {
      question: "What happens when my Starter plan quota is reached?",
      answer:
        "When you reach the Starter plan limit (5 items, 5 orders, or 5 clients), the application prompts you to upgrade to Pro to create additional records. Your existing records remain safe and accessible.",
    },
    {
      question: "Does IND Manager submit my GST returns directly to the government?",
      answer:
        "No. IND Manager generates GST-compliant invoices and provides export formats for Tally Prime. Final return submissions (such as GSTR-1 and GSTR-3B) must be reviewed and filed with your CA via official GST portals.",
    },
  ],
};
