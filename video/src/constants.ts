// ================= IND MANAGER VIDEO CONSTANTS =================
// All timing in frames @ 30fps (1s = 30f)

export const FPS = 30;
export const s = (seconds: number) => Math.round(seconds * FPS);

// ────────────────── MASTER CUT (16:9) SCENE TIMING ─────────────
export const MASTER_DURATION = s(72);
export const MASTER_WIDTH = 3840;
export const MASTER_HEIGHT = 2160;

export const SCENES_MASTER = {
  HOOK:        { start: s(0),  dur: s(5)  },
  REVEAL:      { start: s(5),  dur: s(6)  },
  ORDERS:      { start: s(11), dur: s(7)  },
  INVENTORY:   { start: s(18), dur: s(7)  },
  PAYMENTS:    { start: s(25), dur: s(7)  },
  INVOICES:    { start: s(32), dur: s(7)  },
  TALLY:       { start: s(39), dur: s(7)  },
  AI:          { start: s(46), dur: s(7)  },
  MULTILANG:   { start: s(53), dur: s(8)  },
  CLOSING:     { start: s(61), dur: s(11) },
} as const;

// ────────────────── REELS CUT (9:16) SCENE TIMING ──────────────
export const REELS_DURATION = s(30);
export const REELS_WIDTH = 1080;
export const REELS_HEIGHT = 1920;

export const SCENES_REELS = {
  HOOK:        { start: s(0),  dur: s(2)  },
  LOGO_FLASH:  { start: s(2),  dur: s(1.5)},
  ORDERS:      { start: s(3.5),dur: s(3.5)},
  INVENTORY:   { start: s(7),  dur: s(3.5)},
  INVOICES:    { start: s(10.5),dur: s(3.5)},
  AI:          { start: s(14), dur: s(4)  },
  LANGS:       { start: s(18), dur: s(3)  },
  TALLY_PAY:   { start: s(21), dur: s(3)  },
  CTA:         { start: s(24), dur: s(6)  },
} as const;

// ────────────────── DESIGN TOKENS ──────────────────────────────
export const COLORS = {
  BG:          "#0F1117",
  BG_DARK:     "#070911",
  PRIMARY:     "#2563EB",
  PRIMARY_50:  "rgba(37, 99, 235, 0.50)",
  PRIMARY_20:  "rgba(37, 99, 235, 0.20)",
  PRIMARY_12:  "rgba(37, 99, 235, 0.12)",
  PRIMARY_8:   "rgba(37, 99, 235, 0.08)",
  AI_ACCENT:   "#7C3AED",
  AI_15:       "rgba(124, 58, 237, 0.15)",
  SUCCESS:     "#16A34A",
  WARNING:     "#F59E0B",
  DANGER:      "#DC2626",
  TEXT_WHITE:  "#F1F5F9",
  TEXT_MUTED:  "#94A3B8",
  TEXT_SOFT:   "rgba(241, 245, 249, 0.70)",
  BORDER:      "rgba(241, 245, 249, 0.08)",
  CARD:        "rgba(255, 255, 255, 0.04)",
} as const;

// ────────────────── EASING (per brief: 0.22,1,0.36,1) ───────────
export const CUBIC = [0.22, 1, 0.36, 1] as const;
export const EASE = { type: "cubic-bezier", x1: 0.22, y1: 1, x2: 0.36, y2: 1 } as const;

// ────────────────── TYPOGRAPHY ─────────────────────────────────
export const FONT_FAMILY =
  "'Inter', 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// ────────────────── SCREENSHOT FILE REFERENCES ─────────────────
// All paths relative to video/public/screenshots (copy project PNGs into here)
export const SHOTS = {
  // ── Desktop ──
  DASHBOARD_LIGHT:      "dashboard_desktop_light.png",
  ORDERS_LIST_LIGHT:    "orders_list_desktop_light.png",
  QUOTES_LIST_LIGHT:    "quotes_list_desktop_light.png",
  BILLING_LIGHT:        "billing_desktop_light.png",
  PAYMENTS_LIGHT:       "regression_payments_desktop_light.png",
  ORDERS_REG:           "regression_orders_desktop_light.png",
  CLIENTS_REG:          "regression_clients_desktop_light.png",
  AGING_LIGHT:          "aging_desktop_light.png",
  STATEMENT_LIGHT:      "statement_tab_desktop_light.png",
  CHALLANS_LIGHT:       "challans_list_desktop_light.png",
  QUOTE_B_REVIEW:       "quote_b_review_desktop_light.png",
  LINE_PICKER:          "line_picker_desktop.png",
  CHALLANS_CREATE:      "challans_create_modal_desktop.png",
  CHALLANS_DETAIL:      "challans_detail_modal.png",
  SIDEBAR_MANAGER:      "sidebar_manager_view.png",
  QUOTE_DETAIL:         "quote_detail_with_convert_btn.png",
  WIZARD_CREATE_ORDER:  "regression_create_order_wizard.png",
  // ── Mobile (375) ──
  DASHBOARD_MOBILE:     "dashboard_mobile_375_light.png",
  ORDERS_MOBILE:        "orders_list_mobile_375_light.png",
  QUOTES_MOBILE:        "quotes_list_mobile_375_light.png",
  BILLING_MOBILE:       "billing_mobile_375_light.png",
  PAYMENTS_MOBILE:      "regression_payments_mobile_375.png",
  CHALLANS_MOBILE_L:    "challans_list_mobile_375_light.png",
  CHALLANS_MOBILE_D:    "challans_list_mobile_375_dark.png",
  CHALLANS_CREATE_M:    "challans_create_modal_mobile_dark.png",
  AGING_MOBILE:         "aging_mobile_375.png",
  STATEMENT_MOBILE:     "statement_tab_mobile_375_dark.png",
  QUOTE_B_MOBILE:       "quote_b_review_mobile_375_dark.png",
  LINE_PICKER_MOBILE:   "line_picker_mobile_375_dark.png",
  CREATE_MODAL_MOBILE:  "create_modal_mobile_dark.png",
  // ── Dark desktop ──
  CHALLANS_DARK:        "challans_list_desktop_dark.png",
  AGING_DARK:           "aging_desktop_dark.png",
  STATEMENT_DARK:       "statement_tab_desktop_dark.png",
  QUOTES_DARK:          "quotes_list_dark_desktop.png",
  // ── Hi locale ──
  AGING_HI:             "aging_hi_locale.png",
  CHALLANS_HI:          "challans_list_hi_locale.png",
  LINE_PICKER_HI:       "line_picker_hi_locale.png",
  // ── PDFs ──
  CHALLANS_PDF:         "challans_pdf_rendered.png",
  STATEMENT_PDF:        "statement_pdf_rendered.png",
  QUOTE_PDF:            "quote_pdf_rendered.png",
  // ── Empty states ──
  EMPTY_CHALLANS:       "challans_empty_state.png",
  EMPTY_AGING:          "empty_state_aging.png",
  EMPTY_STATEMENT:      "empty_state_statement.png",
  EMPTY_QUOTES:         "quotes_empty_state.png",
  EMPTY_FRESH:          "empty_state_fresh_tenant.png",
  // ── Sidebar / misc ──
  SIDEBAR_QUOTES:       "sidebar_quotes_after_orders.png",
  SIDEBAR_CHALLANS:     "sidebar_delivery_challans.png",
  SIDEBAR_RECEIVABLES:  "sidebar_receivables.png",
  SIDEBAR_STAFF:        "sidebar_staff_view.png",
  MORE_QUOTES:          "more_sheet_quotes.png",
  MORE_CHALLANS:        "more_sheet_delivery_challans.png",
  MORE_RECEIVABLES:     "more_sheet_receivables.png",
  MANAGER_VIEW:         "manager_view_no_statement_tab.png",
  CONVERTED_QUOTE:      "converted_quote_badge_and_link.png",
  WIZARD_PREFILL:       "wizard_prefill_banner_desktop_light.png",
  WIZARD_PREFILL_M:     "wizard_prefill_banner_mobile_dark.png",
  WIZARD_NOCLIENT:      "wizard_no_client_id_inline_prefill.png",
  QUOTE_A_REVIEW:       "quote_a_wizard_review.png",
  QUOTE_B_WIZARD:       "quote_b_wizard_review.png",
  REG_DASHBOARD:        "regression_dashboard.png",
  REG_BILLING:          "regression_billing.png",
  REG_ORDERS:           "regression_orders.png",
  // ── Output ──
  CHALLANS_ORDER_LINK:  "challans_order_link_prefill.png",
  CHALLANS_PDF_LATIN:   "challans_pdf_latin.png",
  CHALLANS_PDF_INDIC:   "challans_pdf_indic.png",
  STATEMENT_AGING_OPEN: "statement_dialog_opened_from_aging.png",
  STATEMENT_PDF_INDIC:  "statement_indic_script_pdf.png",
  // ── Staff ──
  STAFF_A_ORDERS:       "staff_a_orders.png",
  STAFF_A_WORK:         "staff_a_work_panel.png",
  STAFF_B_ORDERS:       "staff_b_orders.png",
  STAFF_B_WORK:         "staff_b_work_panel.png",
  STAFF_C_ORDERS:       "staff_c_zero_orders.png",
  STAFF_C_WORK:         "staff_c_zero_work_panel.png",
  ADMIN_DASHBOARD:      "admin_dashboard.png",
  ADMIN_ORDERS:         "admin_orders.png",
  // ── Onboarding / Login ──
  LOGIN_INTRO_D:        "01_stage2_intro_desktop_dark.png",
  LOGIN_INTRO_M:        "06_stage2_intro_mobile_dark.png",
  LOGIN_SKIP_D:         "03_returning_visitor_skips_intro_desktop_dark.png",
  LOGIN_LOAD_D:         "04_stage1_loading_desktop_dark.png",
  CMD_PALETTE_D:        "1-command-palette-dark.png",
  CMD_PALETTE_L:        "1-command-palette-light.png",
  VENDOR_DIALOG_L:      "2-dialog-vendor-input-light.png",
  VENDOR_DIALOG_D:      "3-dialog-vendor-input-dark.png",
  ORDERS_SEARCH_L:      "4-orders-search-light.png",
  ORDERS_SEARCH_D:      "4-orders-search-dark.png",
  CHECK_CURRENT:        "check_current.png",
  // ── Mobile verification ──
  VERIFY_360:           "verification_360px.png",
  VERIFY_390:           "verification_390px.png",
  VERIFY_414:           "verification_414px.png",
  CLIENTS_SAMPLE_375:   "clients_starter_sample_unblocked_375px.png",
} as const;
