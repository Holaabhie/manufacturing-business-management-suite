import { test, expect } from '@playwright/test';

/**
 * Mobile Horizontal Overflow Regression Spec
 * ──────────────────────────────────────────────────────────────────
 * Ensures that key dashboard routes do not expand beyond the viewport
 * width on mobile screens (320px, 375px, 414px, 500px).
 *
 * The app has a global `html, body { overflow-x: clip }` guard.
 * We disable it inside each test so we measure the real layout,
 * not the bandage.
 */

const ROUTES = [
  '/dashboard',
  '/dashboard/orders',
  '/dashboard/billing',
  '/dashboard/reports/previous-years',
];

const WIDTHS = [320, 375, 414, 500];

for (const route of ROUTES) {
  for (const width of WIDTHS) {
    test(`no horizontal overflow: ${route} @ ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      // Disable the global guard so genuine overflow is detectable
      await page.addStyleTag({
        content: 'html, body { overflow-x: visible !important; max-width: none !important; }',
      });

      const { scrollW, clientW, widest } = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const offenders = [...document.querySelectorAll('*')]
          .filter(el => el.getBoundingClientRect().width > vw + 1)
          .map(el => `${el.tagName}.${el.className?.toString().slice(0, 80)}`);
        return {
          scrollW: document.documentElement.scrollWidth,
          clientW: vw,
          widest: offenders.slice(-3),
        };
      });

      expect(scrollW, `offenders: ${widest.join(' | ')}`).toBeLessThanOrEqual(clientW + 1);
    });
  }
}
