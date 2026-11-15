import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    workers: 1,
    use: {
        browserName: 'chromium',
        launchOptions: process.env.E2C_CHROME_PATH
            ? { executablePath: process.env.E2C_CHROME_PATH }
            : {},
    },
});
