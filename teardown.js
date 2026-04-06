require('dotenv').config()

const { getRepoContext, getAuthHeaders } = require('./helpers/github/helpers.js')

module.exports = async () => {
  const { owner, repo } = getRepoContext()
  const headers = getAuthHeaders()

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100`,
    { headers }
  )

  if (!response.ok) return

  const issues = await response.json()
  const orphaned = issues.filter(i => i.title.startsWith('Playwright issue'))

  for (const issue of orphaned) {
    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issue.number}`,
      {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'closed' }),
      }
    ).catch(() => {})
  }

  if (orphaned.length) {
    console.log(`Global teardown: closed ${orphaned.length} orphaned issue(s)`)
  }
}
