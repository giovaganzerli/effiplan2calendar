import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

test.use({
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'block',
});

test('mobile Sync reaches the summary (Google writes are mocked)', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.addInitScript(() => {
        window.google = {
            accounts: {
                oauth2: {
                    initTokenClient: ({ callback }) => ({
                        requestAccessToken: () => callback({ access_token: 'fake-test-token' }),
                    }),
                },
            },
        };
    });
    let writes = 0;
    let finishSync;
    const syncResponse = new Promise((resolve) => { finishSync = resolve; });
    // Intercept every Google API request so this test cannot write real events.
    await page.route('https://www.googleapis.com/**', async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.includes('/userinfo')) {
            return route.fulfill({ json: { name: 'Test', email: 'test@example.com' } });
        }
        if (url.pathname.endsWith('/calendarList')) {
            return route.fulfill({ json: { items: [{ id: 'fake-calendar', summary: 'EFFIPLAN' }] } });
        }
        if (url.pathname.endsWith('/events') && route.request().method() === 'POST') {
            writes++;
            await syncResponse;
            return route.fulfill({ json: { id: 'fake-event' } });
        }
        return route.abort();
    });
    await page.route('**/api/ia', (route) => route.fulfill({ json: { events: [{
        id: 'fake-event', title: 'Turno test', date: '2026-11-15',
        startTime: '09:00', endTime: '13:00', enabled: true,
    }] } }));

    await page.goto(process.env.E2C_TEST_URL || 'https://share.girovaganzo.bike/decathlon/e2c/');
    await page.getByRole('button', { name: 'Accedi con Google' }).click();
    await page.locator('input[type=file]').setInputFiles(
        fileURLToPath(new URL('../src/assets/images/example_image.jpeg', import.meta.url))
    );
    await page.getByRole('button', { name: 'Analizza immagine!' }).click();
    const syncButton = page.getByRole('button', { name: 'Sync!', exact: true });
    await expect(syncButton).toBeEnabled();
    await syncButton.click();
    await expect(page.getByText('SINCRONIZO EVENTI...', { exact: true })).toBeVisible();
    finishSync();
    await expect(page.getByText('Eventi importati: 1', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Carica Nuovo Screenshot!' })).toBeVisible();
    await expect(syncButton).toHaveCount(0);
    expect(writes).toBe(1);
    expect(pageErrors).toEqual([]);
});
