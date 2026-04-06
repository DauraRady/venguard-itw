
require('dotenv').config()
const hlpPW = require('../pw/helpers.js')

const RETRYABLE_STATUSES = [422, 429, 500, 502, 503, 504]

const withRetry = async (fn, { retries = 3, delay = 1000 } = {}) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err) {
      const status = err.status ?? err.statusCode
      const isRetryable = !status || RETRYABLE_STATUSES.includes(status)

      if (i === retries - 1 || !isRetryable) throw err
      await new Promise(r => setTimeout(r, delay * (i + 1)))
    }
  }
}

// These helpers intentionally target the candidate's own temporary GitHub repository.
const getRequiredEnv = (name) => {
  const value = process.env[name]

  if (!value) throw new Error(`Missing required env var: ${name}`)

  return value
}

const getRepoContext = () => ({
  owner: getRequiredEnv('GITHUB_OWNER'),
  repo: getRequiredEnv('GITHUB_REPO'),
})

const getAuthHeaders = () => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${getRequiredEnv('GITHUB_TOKEN')}`,
  'X-GitHub-Api-Version': '2022-11-28',
})

const _getIssuePayload = async (data = {}) => {
  const suffix = await hlpPW.getRandomLetters(8)

  return {
    title: data.title || `Playwright issue ${suffix}`,
    body: data.body || `Playwright body ${suffix}`,
  }
}

const _getIssueCreated = async (request, data = {}) => {
  const { owner, repo } = getRepoContext()
  const payload = await _getIssuePayload(data)

  const response = await request.post(
    `https://api.github.com/repos/${owner}/${repo}/issues`,
    {
      headers: getAuthHeaders(),
      data: payload,
    }
  )

  if (!response.ok()) {
    throw new Error(`Failed to create issue: ${response.status()} ${await response.text()}`)
  }

  return await response.json()
}

const _getIssueData = async (request, issueNumber) => {
  const { owner, repo } = getRepoContext()

  const response = await request.get(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
    {
      headers: getAuthHeaders(),
    }
  )

  if (!response.ok()) {
    throw new Error(`Failed to get issue ${issueNumber}: ${response.status()} ${await response.text()}`)
  }

  return await response.json()
}

const _updateIssue = async (request, issueNumber, data = {}) => {
  const { owner, repo } = getRepoContext()

  const response = await request.patch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
    {
      headers: getAuthHeaders(),
      data,
    }
  )

  if (!response.ok()) {
    throw new Error(`Failed to update issue ${issueNumber}: ${response.status()} ${await response.text()}`)
  }

  return await response.json()
}

const _getIssueComments = async (request, issueNumber) => {
  const { owner, repo } = getRepoContext()

  const response = await request.get(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    {
      headers: getAuthHeaders(),
    }
  )

  if (!response.ok()) {
    throw new Error(`Failed to get comments for issue ${issueNumber}: ${response.status()} ${await response.text()}`)
  }

  return await response.json()
}

const _addIssueComment = async (request, issueNumber, body) => {
  return withRetry(async () => {
    const { owner, repo } = getRepoContext()

    const response = await request.post(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        headers: getAuthHeaders(),
        data: { body },
      }
    )

    if (!response.ok()) {
      const err = new Error(`Failed to add comment to issue ${issueNumber}: ${response.status()} ${await response.text()}`)
      err.status = response.status()
      throw err
    }

    return await response.json()
  })
}

const _closeIssue = async (request, issueNumber) => {
  const { owner, repo } = getRepoContext()

  const response = await request.patch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
    {
      headers: getAuthHeaders(),
      data: { state: 'closed' },
    }
  )

  if (!response.ok()) {
    throw new Error(`Failed to close issue ${issueNumber}: ${response.status()} ${await response.text()}`)
  }

  return await response.json()
}

module.exports = {
  getRequiredEnv,
  getRepoContext,
  getAuthHeaders,
  _getIssuePayload,
  _getIssueCreated,
  _getIssueData,
  _updateIssue,
  _getIssueComments,
  _addIssueComment,
  _closeIssue,
}