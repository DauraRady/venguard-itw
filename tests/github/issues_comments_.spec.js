require('dotenv').config()

const { test, expect } = require('../../fixtures/fixtures.js')
const hlpGitHub = require('../../helpers/github/helpers.js')
const hlpPW = require('../../helpers/pw/helpers.js')

const REPO_URL = `https://github.com/${hlpGitHub.getRepoContext().owner}/${hlpGitHub.getRepoContext().repo}`

test('after creating a comment via UI, it should be visible via API', async ({ request, page, ids }) => {
  const payload = await hlpGitHub._getIssuePayload()
  const commentBody = `Comment ${payload.title}`

  const issue = await hlpGitHub._getIssueCreated(request)
  ids.set({ issue_number: issue.number })

  try {
    await page.goto(`${REPO_URL}/issues/${issue.number}`)

    await page.getByRole('textbox', { name: 'Add a comment' }).click()
    await page.getByRole('textbox', { name: 'Add a comment' }).fill(commentBody)

    await Promise.all([
      page.waitForResponse(r =>
        hlpPW.isGraphQLSuccess(r) &&
        r.request().postData()?.includes('addCommentMutation')
      ),
      page.getByRole('button', { name: 'Comment', exact: true }).click(),
    ])

    await expect.poll(async () => {
      const comments = await hlpGitHub._getIssueComments(request, issue.number)
      const found = comments.find(c => c.body.trim() === commentBody)
      return found?.body?.trim()
    }).toBe(commentBody)
  } finally {
    await hlpGitHub._closeIssue(request, issue.number).catch(() => {})
  }
})

test('after creating a comment via API, edit it and assert via API', async ({ request, page, ids }) => {
  const payload = await hlpGitHub._getIssuePayload()
  const initialBody = `Initial comment ${payload.title}`
  const updatedBody = `Edited comment ${payload.title}`

  const issue = await hlpGitHub._getIssueCreated(request)
  ids.set({ issue_number: issue.number })

  try {
    await hlpGitHub._addIssueComment(request, issue.number, initialBody)

    await page.goto(`${REPO_URL}/issues/${issue.number}`)

    await page.getByTestId('comment-header-hamburger').click()
    await page.getByTestId('comment-header-hamburger-open').getByText('Edit').click()
    await page.getByRole('textbox', { name: 'Markdown value' }).fill(updatedBody)

    await Promise.all([
      page.waitForResponse(r =>
        hlpPW.isGraphQLSuccess(r) &&
        r.request().postData()?.includes('updateIssueCommentBodyMutation')
      ),
      page.getByRole('button', { name: 'Update comment' }).click(),
    ])

    await expect.poll(async () => {
      const comments = await hlpGitHub._getIssueComments(request, issue.number)
      const found = comments.find(c => c.body.trim() === updatedBody)
      return found?.body?.trim()
    }).toBe(updatedBody)
  } finally {
    await hlpGitHub._closeIssue(request, issue.number).catch(() => {})
  }
})

test('after creating a comment via API, delete it and assert via API', async ({ request, page, ids }) => {
  const payload = await hlpGitHub._getIssuePayload()
  const commentBody = `Delete me ${payload.title}`

  const issue = await hlpGitHub._getIssueCreated(request)
  ids.set({ issue_number: issue.number })

  try {
    await hlpGitHub._addIssueComment(request, issue.number, commentBody)
    await page.goto(`${REPO_URL}/issues/${issue.number}`)

    await page.getByTestId('comment-header-hamburger').click()
    await page.getByTestId('comment-header-hamburger-open').getByText('Delete').click()

    await Promise.all([
      page.waitForResponse(r =>
        hlpPW.isGraphQLSuccess(r) &&
        r.request().postData()?.includes('deleteIssueCommentMutation')
      ),
      page.getByRole('button', { name: 'Delete', exact: true }).click(),
    ])

    await expect.poll(async () => {
      const comments = await hlpGitHub._getIssueComments(request, issue.number)
      const found = comments.find(c => c.body.trim() === commentBody)
      return found
    }).toBeUndefined()
  } finally {
    await hlpGitHub._closeIssue(request, issue.number).catch(() => {})
  }
})