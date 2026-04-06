const path = require('path')
const { defineConfig } = require('@playwright/test')

const storageState = process.env.GITHUB_STORAGE_STATE
  ? path.resolve(process.env.GITHUB_STORAGE_STATE)
  : undefined

module.exports = defineConfig({
  testDir: './tests',
  globalTeardown: './teardown.js',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'https://github.com',
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    storageState,
  },
  reporter: [['list']],
})
