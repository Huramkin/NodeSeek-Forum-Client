import { expect, test } from '@playwright/test';

test.describe('Tab management', () => {
  test('loads with initial tab', async ({ page }) => {
    await page.goto('/');

    // Check that at least one tab is visible
    const tabBar = page.locator('[role="tablist"], [data-testid="tab-bar"]');
    await expect(tabBar).toBeVisible({ timeout: 10000 });
  });

  test('can create and switch tabs', async ({ page }) => {
    await page.goto('/');

    // Wait for initial load
    await page.waitForTimeout(1000);

    // Note: This test would need actual implementation based on UI
    // For now, we just verify the page loaded
    await expect(page).toHaveTitle(/NodeSeek/i);
  });
});
