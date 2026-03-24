const { chromium } = require('@playwright/test')
const fs = require('fs')

async function saveGithubSession() {
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto('https://github.com/login')

  console.log('Log in to GitHub in the opened window.')
  console.log('Once logged in, the session will be saved automatically.')

  await page.waitForURL(
    url => url.hostname === 'github.com' && !url.pathname.startsWith('/login'),
    { timeout: 0 }
  )

  // ✅ important
  if (!fs.existsSync('.auth')) {
    fs.mkdirSync('.auth')
  }

  await context.storageState({ path: '.auth/github-storage-state.json' })

  await browser.close()

  console.log('Session saved successfully!')
}

saveGithubSession()