require('dotenv').config()

const { test, expect } = require('../../fixtures/fixtures.js')
const hlpGitHub = require('../../helpers/github/helpers.js')

const REPO_URL = `https://github.com/${hlpGitHub.getRepoContext().owner}/${hlpGitHub.getRepoContext().repo}`

test('after creating an issue via UI, it should be visible in the UI', async ({ request, page, ids }) => {
  const payload = await hlpGitHub._getIssuePayload()
  let issueNumber

  try {
    await page.goto(`${REPO_URL}/issues/new`)

    await page.getByRole('textbox', { name: /add a title|title/i }).fill(payload.title)
    await page.getByPlaceholder(/type your description here/i).fill(payload.body)

    await Promise.all([
      page.waitForResponse(r =>
        r.url().includes('/_graphql') &&
        r.status() === 200 &&
        r.request().postData()?.includes('createIssueMutation')
      ),
      page.waitForURL(/\/issues\/\d+$/),
      page.getByTestId('create-issue-button').click(),
    ])

    const match = page.url().match(/\/issues\/(\d+)$/)
    expect(match).not.toBeNull()

    issueNumber = Number(match[1])
    ids.set({ issue_title: payload.title, issue_number: issueNumber })

    await expect.poll(async () => {
      const issue = await hlpGitHub._getIssueData(request, issueNumber)
      return {
        title: issue.title,
        body: issue.body,
        state: issue.state,
      }
    }).toEqual({
      title: payload.title,
      body: payload.body,
      state: 'open',
    })
  } finally {
    if (issueNumber) {
      await hlpGitHub._closeIssue(request, issueNumber).catch(() => {})
    }
  }
})

test('after creating an issue via API, edit it and assert via API', async ({ request, page, ids }) => {
  const created = await hlpGitHub._getIssueCreated(request)
  const newTitle = `Edited ${created.title}`
  const newBody = `Edited ${created.body}`

  ids.set({ original_title: created.title, issue_number: created.number })

  try {
    await page.goto(`${REPO_URL}/issues/${created.number}`)

    await page.getByRole('button', { name: /edit issue title/i }).click()
    await page.getByRole('textbox', { name: /title/i }).fill(newTitle)

    await Promise.all([
      page.waitForResponse(r =>
        r.url().includes('/_graphql') &&
        r.status() === 200 &&
        r.request().postData()?.includes('updateIssueTitleMutation')
      ),
      page.getByRole('button', { name: 'Save ( enter )' }).click(),
    ])

    await page.getByLabel(/issue body actions/i).click()
    await page.getByRole('menuitem', { name: /^edit$/i }).click()
    await page.getByRole('textbox', { name: /markdown value/i }).fill(newBody)

    await Promise.all([
      page.waitForResponse(r =>
        r.url().includes('/_graphql') &&
        r.status() === 200 &&
        r.request().postData()?.includes('updateIssueBodyMutation')
      ),
      page.getByRole('button', { name: /^save$/i }).click(),
    ])

    await expect.poll(async () => {
      const updated = await hlpGitHub._getIssueData(request, created.number)
      return {
        title: updated.title,
        body: updated.body,
        state: updated.state,
      }
    }).toEqual({
      title: newTitle,
      body: newBody,
      state: 'open',
    })
  } finally {
    await hlpGitHub._closeIssue(request, created.number).catch(() => {})
  }
})

test('after creating an issue via API, close it and assert via API', async ({ request, page, ids }) => {
  const created = await hlpGitHub._getIssueCreated(request)
  ids.set({ issue_title: created.title, issue_number: created.number })

  try {
    await page.goto(`${REPO_URL}/issues/${created.number}`)

    await Promise.all([
      page.waitForResponse(r =>
        r.url().includes('/_graphql') &&
        r.status() === 200 &&
        r.request().postData()?.includes('updateIssueStateMutationCloseMutation')
      ),
      page.getByRole('button', { name: /close issue/i }).click(),
    ])

    await expect.poll(async () => {
      const closed = await hlpGitHub._getIssueData(request, created.number)
      return closed.state
    }).toBe('closed')
  } finally {
    await hlpGitHub._closeIssue(request, created.number).catch(() => {})
  }
})