const fs = require('fs')
const path = require('path')

const ROOT_DIR = path.resolve(__dirname, '..', '..')

const loadEnvFiles = () => {
  for (const fileName of ['.env.local', '.env']) {
    const filePath = path.join(ROOT_DIR, fileName)

    if (!fs.existsSync(filePath)) continue

    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)

    for (const line of lines) {
      const trimmed = line.trim()

      if (!trimmed || trimmed.startsWith('#')) continue

      const separatorIndex = trimmed.indexOf('=')
      if (separatorIndex === -1) continue

      const key = trimmed.slice(0, separatorIndex).trim()
      const rawValue = trimmed.slice(separatorIndex + 1).trim()
      const value = rawValue.replace(/^['"]|['"]$/g, '')

      if (!process.env[key]) process.env[key] = value
    }
  }
}

const getEnv = (name, { required = true, defaultValue } = {}) => {
  const value = process.env[name] || defaultValue

  if (required && !value) throw new Error(`Missing required env var: ${name}`)

  return value
}

const getRepoContext = () => ({
  owner: getEnv('GITHUB_OWNER'),
  repo: getEnv('GITHUB_REPO'),
})

const githubRequest = async (pathname, { method = 'GET', body } = {}) => {
  if (typeof fetch !== 'function') throw new Error('Global fetch is not available in this Node runtime')

  const url = new URL(`https://api.github.com${pathname}`)
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${getEnv('GITHUB_TOKEN')}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }

  const options = { method, headers }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }

  const response = await fetch(url, options)
  const text = await response.text()
  const data = text ? safeJsonParse(text) : null

  if (!response.ok) {
    const errorMessage = data?.message || text || `${method} ${pathname} failed with ${response.status}`
    throw new Error(errorMessage)
  }

  return data
}

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const printHeading = (label) => {
  console.log(`\n=== ${label} ===`)
}

module.exports = {
  ROOT_DIR,
  loadEnvFiles,
  getEnv,
  getRepoContext,
  githubRequest,
  printHeading,
}