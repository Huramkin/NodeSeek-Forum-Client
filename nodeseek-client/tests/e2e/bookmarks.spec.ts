import { expect, test } from '@playwright/test';

test.describe('Bookmark manager', () => {
  test('opens panel and creates bookmark entry', async ({ page }) => {
    await page.goto('/');

    await page.getByTitle('管理書籤').click();
    await expect(page.getByRole('heading', { name: '書籤管理' })).toBeVisible();

    await page.getByPlaceholder('標題').fill('Playwright 測試書籤');
    await page.getByPlaceholder('分類（選填）').fill('測試');
    await page.getByPlaceholder('網址').fill('https://example.com/e2e');
    await page.getByPlaceholder('標籤（以逗號分隔）').fill('e2e,playwright');
    await page.getByRole('button', { name: '新增書籤' }).click();

    await expect(page.getByText('Playwright 測試書籤')).toBeVisible();
  });
});
