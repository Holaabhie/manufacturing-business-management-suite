import { COMPANY, isFilled } from "@/content/company";
import { LegalDocument } from "./types";

const companyEntityText = isFilled(COMPANY.legalName)
  ? COMPANY.legalName
  : "IND Manager";

export const privacyData: LegalDocument = {
  id: "privacy",
  title: "Privacy Policy",
  badgeLabel: "Privacy & Data Protection",
  summary:
    "How IND Manager collects, stores, processes, and protects your personal credentials and manufacturing records under Indian data protection laws.",
  lastUpdated: COMPANY.effectiveDate,
  accentColor: "green",
  atAGlance: [
    {
      title: "Data Fiduciary & Processor",
      description:
        "We act as data fiduciary for your account credentials, and as a data processor for the factory & customer data you record.",
      badge: "DPDP Act 2023",
    },
    {
      title: "No Ad Tracking or Sale",
      description:
        "We never sell, rent, monetize, or broker your personal or business records. No third-party ad pixels or tracking cookies are used.",
      badge: "Zero Tracking",
    },
    {
      title: "Scoped AI Queries",
      description:
        "When using our AI Assistant, only the specific order records required to fulfill your inquiry are sent to Google Gemini in read-only mode.",
      badge: "Tenant Scoped AI",
    },
    {
      title: "Full Export & Deletion",
      description:
        "Download your complete inventory, orders, and clients via Settings > Data at any time. Account erasure available on verified request.",
      badge: "Data Rights",
    },
  ],
  sections: [
    {
      id: "who-we-are",
      number: 1,
      title: "Who We Are",
      paragraphs: [
        `${companyEntityText} ("IND Manager", "we", "us", or "our") operates the cloud-based manufacturing and business management software platform accessible at indmanager.in and associated applications.`,
        "This Privacy Policy outlines how we collect, handle, store, and safeguard your personal details and manufacturing records when you visit our website, register for an account, or utilize our business application.",
        "For the purposes of the Digital Personal Data Protection Act, 2023 (DPDP Act) and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, IND Manager serves as a Data Fiduciary regarding the personal registration details of our users, and as a Data Processor regarding the business and customer records you upload and manage on behalf of your manufacturing operations.",
      ],
    },
    {
      id: "what-we-collect",
      number: 2,
      title: "What We Collect",
      paragraphs: [
        "We collect only the information necessary to provide, secure, and operate your manufacturing management workspace. We categorize data into Account Identity Data, Operational Business Data, and Technical Session Data.",
      ],
      table: {
        caption: "Data Collected, Purpose, and Storage Location",
        headers: ["Category & Field", "Purpose of Collection", "Storage & Security"],
        rows: [
          [
            "Email Address & Password",
            "Account authentication, login verification, system alerts, password recovery",
            "Stored in MongoDB; passwords hashed with bcrypt (cost factor 12)",
          ],
          [
            "Full Name & Profile Avatar",
            "Account personalization, team attribution on production notes and invoices",
            "Stored in MongoDB; avatar images stored as base64 Data URLs",
          ],
          [
            "Mobile Phone Number",
            "Account identification, SMS/WhatsApp OTP password resets, login alerts",
            "Normalized to E.164 (+91XXXXXXXXXX) format; stored in MongoDB",
          ],
          [
            "Google Account Profile (OAuth)",
            "Optional Single Sign-On (SSO) and Google One Tap authentication",
            "Google user ID (sub), verified email, name, and profile picture URL stored in MongoDB",
          ],
          [
            "Client & Vendor Master Records",
            "Order management, delivery challans, GST invoice issuance, statement generation",
            "Stored in MongoDB collections (clients, parties, vendors) with tenant scoping",
          ],
          [
            "GSTIN, PAN & Billing Addresses",
            "Generating GST-compliant invoices and statutory tax break-ups (CGST/SGST/IGST)",
            "Encrypted in transit (TLS); stored in tenant-scoped database documents",
          ],
          [
            "Orders, Production & Inventory",
            "Tracking shop floor operations, material allocations, stock levels, delivery logs",
            "Stored in MongoDB (orders, items, production) scoped strictly to your account",
          ],
          [
            "Bank Accounts & Statements",
            "Payment reconciliation and bank ledger tracking",
            "Account numbers and IFSC stored in MongoDB; uploaded CSVs parsed in-memory",
          ],
          [
            "IP Address & User-Agent",
            "Rate limiting, active session tracking, and audit logging under Settings > Security",
            "Stored in MongoDB session collections; IP rate limits hashed with SHA-256",
          ],
        ],
      },
    },
    {
      id: "how-we-use-it",
      number: 3,
      title: "How We Use Your Data",
      paragraphs: [
        "We utilize collected data strictly for operational, security, and contractual purposes, including:",
        "1. Providing, hosting, and maintaining all 21 manufacturing software modules across production, billing, inventory, and procurement.",
        "2. Authenticating your identity and maintaining secure sessions across multiple devices.",
        "3. Generating operational documents, including delivery challans, tax invoices, purchase orders, and Tally Prime XML export streams.",
        "4. Dispatching essential notifications, including order stage completions, stock threshold alerts, and password reset OTPs via your configured channels (SMS, WhatsApp, Email, or Telegram).",
        "5. Preventing fraud, unauthorized multi-tenant data access, brute-force intrusions, and API abuse through automated rate-limiting and audit logging.",
        "6. Answering in-app queries through the read-only AI Assistant when you explicitly ask business questions.",
      ],
      callout: {
        type: "note",
        title: "No Data Monetization",
        text: "We do not sell, rent, or trade your personal information or your manufacturing database to third-party data brokers, marketing networks, or advertising agencies.",
      },
    },
    {
      id: "consent-and-lawful-basis",
      number: 4,
      title: "Consent & Lawful Basis (DPDP Act, 2023 & IT Act)",
      paragraphs: [
        "We process personal data in compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act) and the Information Technology Act, 2000 (along with applicable amendments and rules).",
        "Our lawful grounds for processing include: (a) your clear, affirmative consent provided upon registering for an account or connecting integrations; (b) contractual necessity to fulfill our SaaS agreement and render the manufacturing software modules requested by you; and (c) legitimate statutory compliance obligations under applicable Indian laws, including fiscal and accounting standards.",
        "You have the right to withdraw your consent at any time by contacting our support team or closing your account. Withdrawal of consent does not affect the lawfulness of processing undertaken prior to withdrawal.",
      ],
    },
    {
      id: "your-clients-data",
      number: 5,
      title: "Your Clients' Data (Processor Obligations)",
      paragraphs: [
        "When you record your customers' and suppliers' contact details, GSTINs, delivery addresses, and payment histories in IND Manager, you act as the Data Fiduciary (or Data Controller) for those records. IND Manager acts exclusively as a Data Processor on your behalf.",
        "You represent and warrant that you have established appropriate lawful grounds and obtained necessary permissions under applicable laws to enter your clients' personal data into the Service.",
        "We process such data solely in accordance with your instructions (as embodied in your platform usage) and will never contact your clients or vendors directly for marketing purposes.",
      ],
    },
    {
      id: "third-party-processors",
      number: 6,
      title: "Who We Share Data With (Sub-Processors)",
      paragraphs: [
        "To provide our services reliably, we utilize carefully selected third-party cloud infrastructure providers and communication gateways. Each sub-processor is bound by strict confidentiality and security commitments.",
      ],
      table: {
        caption: "Third-Party Service Providers and Data Involved",
        headers: ["Sub-Processor", "Primary Purpose", "Data Involved & Location"],
        rows: [
          [
            "MongoDB Atlas",
            "Managed primary database hosting",
            "All encrypted operational and account database records (hosted in secured cloud regions)",
          ],
          [
            "Vercel Inc.",
            "Next.js web application hosting and serverless compute",
            "Transient web requests, API invocations, and session handshakes",
          ],
          [
            "Google LLC (Identity & Gemini AI)",
            "OAuth authentication & AI Assistant natural language queries",
            "OAuth profile details for login; tenant-scoped order summaries sent only when using AI Assistant",
          ],
          [
            "Twilio Inc.",
            "SMS & WhatsApp OTP verification (Twilio Verify) & operational alerts",
            "Recipient phone number and verification OTP / notification message payload",
          ],
          [
            "Nodemailer / SMTP Providers",
            "Transactional system email delivery (password resets, invitation links)",
            "Recipient email address, user display name, and transactional email text",
          ],
          [
            "Telegram Messenger",
            "Optional team alert dispatch via Telegram Bot webhook",
            "Operational notification message summaries sent to your configured chat ID",
          ],
          [
            "Razorpay Software Pvt. Ltd.",
            "Payment gateway integration (infrastructure prepared for Phase 2/5 rollout)",
            "Subscription tier metadata, payment IDs, and transaction verification signatures",
          ],
        ],
      },
    },
    {
      id: "ai-features-and-gemini",
      number: 7,
      title: "AI Features & Google Gemini Processing",
      paragraphs: [
        "IND Manager incorporates an optional AI Assistant built using Google Gemini (@google/genai SDK). We believe in complete transparency regarding how artificial intelligence interacts with your factory data:",
        "1. Read-Only Scope: The AI Assistant is architected with strictly read-only tools. It cannot modify, create, or delete any orders, materials, or financial entries.",
        "2. Request-Driven Execution: Your data is never continuously ingested or trained upon by AI models in the background. Data is queried only in real time when you deliberately submit a question to the assistant.",
        "3. Exact Data Transmitted: When you ask a query (for example, 'Which orders have pending payments?'), the application executes a tenant-scoped database lookup via executeTool(). The resulting order summary (order number, client name, total amount, balance due, payment status, and stage) is passed to Google Gemini to formulate the answer.",
        "4. No Model Training: We utilize Google's enterprise API tier where Customer Data submitted via API requests is not used to train or improve foundational Google models.",
      ],
      callout: {
        type: "important",
        title: "AI Privacy Transparency",
        text: "The AI Assistant only accesses data belonging to your authenticated tenant (via getDataOwnerId). It cannot inspect records from any other business or account.",
      },
    },
    {
      id: "cookies-and-local-storage",
      number: 8,
      title: "Cookies & Local Storage",
      paragraphs: [
        "IND Manager uses essential cookies and local browser storage to keep you securely signed in, preserve your interface settings, and protect against security threats. We do not use third-party advertising cookies or cross-site tracking pixels.",
      ],
      table: {
        caption: "Cookies and Browser Storage Used by IND Manager",
        headers: ["Identifier", "Type", "Purpose", "Duration & Lifecycle"],
        rows: [
          [
            "session_id",
            "HttpOnly Cookie",
            "Primary user authentication session token; validates access to dashboard routes",
            "Browser session duration, or 24 hours if 'Remember Me' is selected",
          ],
          [
            "refresh_token",
            "HttpOnly Cookie",
            "Secures session renewal and token rotation without re-prompting credentials",
            "1 day (session) or 30 days if 'Remember Me' is enabled",
          ],
          [
            "csrf_token",
            "First-Party Cookie",
            "Double-submit token preventing Cross-Site Request Forgery on API mutations",
            "7 days (validated on state-changing requests)",
          ],
          [
            "authjs.session-token",
            "HttpOnly Cookie",
            "OAuth JWT token generated during Google Single Sign-On",
            "Session lifetime as configured in NextAuth",
          ],
          [
            "ind-manager-locale",
            "localStorage",
            "Stores your preferred language interface selection (English, Hindi, Gujarati, Marathi)",
            "Persistent in local browser until cleared",
          ],
          [
            "theme",
            "localStorage",
            "Stores your chosen display theme (light, dark, or system mode)",
            "Persistent in local browser until cleared",
          ],
          [
            "ind_manager_chat_history_v2",
            "localStorage",
            "Caches recent conversation messages with the in-app AI Assistant for your convenience",
            "Persistent in local browser until cleared via chat UI",
          ],
          [
            "ind_notification_history_v2",
            "localStorage",
            "Caches in-app notification alerts for rapid offline rendering",
            "30 days auto-expiry",
          ],
          [
            "draft:* / ind:auth:scope",
            "localStorage",
            "Auto-saves active form progress so you never lose entered order details on accidental close",
            "24 hours auto-expiry",
          ],
        ],
      },
    },
    {
      id: "retention-and-deletion",
      number: 9,
      title: "Data Retention & Erasure",
      paragraphs: [
        "We retain your personal details and business records for as long as your account remains active and in good standing, or as necessary to fulfill the operational purposes described in this policy.",
        "Operational records (orders, challans, invoices) are maintained throughout the life of your subscription to provide continuous accounting ledgers, historical analytics, and fiscal continuity.",
        "When an account is formally closed or deleted upon request, all associated operational documents, client databases, and personal records in our production database are permanently purged within 30 days, except where retention is strictly required to comply with statutory tax, audit, or legal dispute obligations under Indian law.",
      ],
    },
    {
      id: "security-measures",
      number: 10,
      title: "Security Measures (Provable Controls)",
      paragraphs: [
        "We take data security seriously and implement provable technical and organizational safeguards across our codebase and infrastructure:",
        "1. Password Security: All user passwords are cryptographically hashed using bcrypt with 12 salt rounds before being stored. Passwords are never stored in plaintext.",
        "2. Multi-Tenant Scoping: Every database query is strictly isolated at the application layer using our getDataOwnerId() security guard, preventing cross-tenant data leakage.",
        "3. Role-Based Route Protection: Middleware route interceptors restrict non-administrative staff members from accessing administrative, financial, billing, or client management routes.",
        "4. Transport Encryption: All communications between your browser and our servers are encrypted using modern Transport Layer Security (TLS 1.2 / TLS 1.3).",
        "5. Brute-Force & Rate Limiting: API routes, authentication forms, and OTP endpoints are protected by MongoDB-backed sliding window rate limiters with SHA-256 hashed keys.",
        "6. Account Lockout: Repeated failed authentication attempts trigger automated account lockouts via lockedUntil timestamps to prevent credential stuffing.",
        "7. CSRF Defense: All state-modifying requests (POST, PUT, DELETE) enforce double-submit CSRF cookie token verification.",
      ],
      callout: {
        type: "note",
        title: "Transparent Standards",
        text: "We list only security measures that are provably implemented in our active codebase and hosting architecture, rather than claiming unverified marketing certifications.",
      },
    },
    {
      id: "your-rights",
      number: 11,
      title: "Your Rights & How to Exercise Them",
      paragraphs: [
        "Under the DPDP Act, 2023 and applicable privacy frameworks, you have significant rights regarding your personal and business records:",
        "1. Right to Access & Summary: You can review all personal data and business records stored in your account directly within your dashboard profile and settings.",
        "2. Right to Correction & Updating: You can modify and correct inaccurate company profiles, employee records, client details, and contact numbers at any time.",
        "3. Right to Data Portability: You can export complete, unencumbered Excel spreadsheets containing your inventory, orders, clients, and staff records at any time via Settings > Data.",
        "4. Right to Erasure: You may request the permanent deletion of your account and associated database records by contacting our support team or Grievance Officer.",
        "5. Right to Grievance Redressal: You have the right to register concerns or complaints regarding data handling with our designated Grievance Officer, and to escalate unresolved matters to the Data Protection Board of India.",
      ],
    },
    {
      id: "childrens-privacy",
      number: 12,
      title: "Children's Privacy",
      paragraphs: [
        "IND Manager is an enterprise software platform designed exclusively for commercial manufacturing business operations. The Service is not intended for, marketed to, or designed to attract individuals under the age of 18.",
        "We do not knowingly collect or solicit personal data from children. If we become aware that an account has been registered by a minor, we will promptly terminate the account and purge all associated personal records.",
      ],
    },
    {
      id: "cross-border-transfers",
      number: 13,
      title: "Data Processing & International Transfers",
      paragraphs: [
        "Our primary platform services are hosted on secure global cloud infrastructure provided by MongoDB Atlas and Vercel. While we primarily serve businesses operating within India, certain technical services (such as serverless application compute or Google AI API processing) may involve encrypted data processing in secure cloud regions outside India.",
        "Where cross-border processing occurs, we ensure that transfers comply with applicable provisions of the DPDP Act, 2023, and that destination infrastructure adheres to comparable encryption and security safeguards.",
      ],
    },
    {
      id: "policy-changes",
      number: 14,
      title: "Changes to This Privacy Policy",
      paragraphs: [
        "We may update this Privacy Policy periodically to reflect enhancements to our manufacturing suite, changes in our sub-processors, or statutory updates under Indian law.",
        "Any modifications will be posted directly on this page with an updated 'Last updated' date. Where revisions are material, we will provide conspicuous notice via an in-app banner or an email notification to registered account holders prior to the changes taking effect.",
      ],
    },
    {
      id: "grievance-officer-contact",
      number: 15,
      title: "Grievance Officer & Contact Details",
      paragraphs: [
        "In accordance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023, you may contact our designated Grievance Officer for questions, data rights requests, or privacy grievances.",
        "All data rights inquiries, access requests, or deletion notices are processed and acknowledged in accordance with the timelines published on our Contact page.",
      ],
    },
  ],
  faqs: [
    {
      question: "Does IND Manager sell my factory or customer data?",
      answer:
        "No. We never sell, rent, monetize, or disclose your business records or customer information to any third parties for marketing or advertising purposes.",
    },
    {
      question: "What exact information does the AI Assistant send to Google?",
      answer:
        "Only the specific order summaries (order number, client name, amounts, and stage) needed to answer your live question are sent to Google Gemini in a read-only query. General business data is not sent or used to train public models.",
    },
    {
      question: "How do I download a backup of all my data?",
      answer:
        "Navigate to Settings > Data inside your dashboard. Click 'Export All Data' to immediately download an Excel workbook containing all your inventory, orders, clients, and staff ledgers.",
    },
    {
      question: "How can I request permanent deletion of my account?",
      answer:
        "Because automated deletion could accidentally destroy statutory tax and accounting records, account closure is handled by contacting our support team or Grievance Officer. Your account and operational records will be purged within 30 days of verified confirmation.",
    },
    {
      question: "Are my passwords safe?",
      answer:
        "Yes. Passwords are never stored in plain text. They are hashed using bcrypt with 12 salt rounds before saving to the database, ensuring industry-standard cryptographic protection.",
    },
  ],
};
