/**
 * pw helpers — low-level Playwright utilities.
 * Import: const hlpPW = require('../../helpers/pw/helpers.js')
 */

const getRandomLetters = async (length) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  let result = ''
  while (result.length < length) result += chars[Math.floor(Math.random() * chars.length)]
  return result
}

const getRandomNumber = async (min, max, decimal = 0) => {
  const raw = Math.random() * (max - min) + min
  const factor = 10 ** decimal
  return Math.round(raw * factor) / factor
}

const isGraphQLSuccess = (response) =>
  response.url().includes('/_graphql') && response.status() === 200

module.exports = {
  getRandomLetters,
  getRandomNumber,
  isGraphQLSuccess,
}
