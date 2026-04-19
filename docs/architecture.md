# Architecture

## Design Principles

### Flat test structure — no `describe`, no POM

Every test is a standalone top-level `test()` call. There is no `describe()`, `beforeEach()`, or Page Object Model. Each test creates its own state, runs its flow, and cleans up in a `finally` block. This makes tests fully independent and easy to run in isolation.

```js
test('after creating an issue via API, edit it and assert via API', async ({ request, page, ids }) => {
  // setup → action → assertion → cleanup
})
```

### UI actions + API assertions

Tests interact with GitHub through the browser (click buttons, fill forms), but **assertions always go through the REST API**. This avoids flaky checks on UI text that can change with GitHub redesigns, while still validating that user actions persist correctly.

```js
// UI action
await page.getByRole('button', { name: /close issue/i }).click()

// API assertion
const issue = await hlpGitHub._getIssueData(request, issueNumber)
expect(issue.state).toBe('closed')
```

### Semantic locators

Locators follow a strict priority order to maximize resilience against UI changes:

1. `getByRole(role, { name })` — buttons, links, inputs, headings
2. `getByLabel('...')` — form fields with a `<label>`
3. `getByPlaceholder('...')` — inputs with placeholder but no label
4. `getByTestId('...')` — elements with `data-testid`

CSS class selectors (`locator('.js-issue-row')`) are never used.

---

## Async Patterns

### `Promise.all` + `waitForResponse`

Every network-triggering UI action is paired with a `waitForResponse` to avoid race conditions. The response listener is registered **before** the click fires:

```js
await Promise.all([
  page.waitForResponse(r =>
    hlpPW.isGraphQLSuccess(r) &&
    r.request().postData()?.includes('createIssueMutation')
  ),
  page.getByTestId('create-issue-button').click(),
])
```

### GraphQL response filtering

GitHub's browser UI uses GraphQL (`/_graphql`), not the REST API. The shared filter `isGraphQLSuccess(response)` checks `url.includes('/_graphql') && status === 200`. Each test adds a mutation-specific `postData` check (e.g., `createIssueMutation`, `updateIssueTitleMutation`) to avoid matching unrelated GraphQL calls.

### `expect.poll` for eventual consistency

After a UI action, the backend may not be immediately consistent. `expect.poll` retries the API check until it passes, replacing any need for `waitForTimeout`:

```js
await expect.poll(async () => {
  const issue = await hlpGitHub._getIssueData(request, issueNumber)
  return issue.state
}).toBe('closed')
```

---

## Helper Layer

### `helpers/github/helpers.js`

All GitHub REST API logic lives here. Tests never inline API calls — they call helper functions instead.

| Function | Purpose |
|---|---|
| `_getIssueCreated(request, data)` | `POST /repos/{owner}/{repo}/issues` |
| `_getIssueData(request, issueNumber)` | `GET /repos/{owner}/{repo}/issues/{issue_number}` |
| `_updateIssue(request, issueNumber, data)` | `PATCH /repos/{owner}/{repo}/issues/{issue_number}` |
| `_getIssueComments(request, issueNumber)` | `GET /repos/{owner}/{repo}/issues/{issue_number}/comments` |
| `_addIssueComment(request, issueNumber, body)` | `POST /repos/{owner}/{repo}/issues/{issue_number}/comments` |
| `_closeIssue(request, issueNumber)` | `PATCH` with `state: closed` |

### Retry wrapper

`_addIssueComment` is wrapped with `withRetry` because GitHub occasionally returns `422` on freshly created issues due to propagation delay. The wrapper retries on transient statuses (422, 429, 5xx) with incremental backoff and fails immediately on client errors (400, 401, 403, 404).

### `helpers/pw/helpers.js`

Low-level Playwright utilities:

- `getRandomLetters(n)` / `getRandomNumber(min, max)` — generate unique test data
- `isGraphQLSuccess(response)` — shared `waitForResponse` filter for GitHub's GraphQL endpoint

---

## Fixtures

### `fixtures/fixtures.js`

Extends Playwright's base `test` with two additional fixtures:

**`page.scanDOM()`** — development-time helper that scans the current page and prints all discoverable locators (links, buttons, inputs, list items, test IDs) to stdout. Add the call, run the test, copy the locators, then remove the call.

**`ids`** — a proxy object that annotates resource IDs (issue numbers, titles) into `testInfo.annotations`. These appear in the test report on failure for easier debugging.

```js
ids.set({ issue_number: issue.number })
```

---

## Cleanup Strategy

### Per-test cleanup

Each test closes the issue it created in a `finally` block. The `.catch(() => {})` prevents masking the original error if the request context is already disposed:

```js
try {
  // test logic
} finally {
  await hlpGitHub._closeIssue(request, issueNumber).catch(() => {})
}
```

### Global teardown

`teardown.js` runs after the entire test suite via `globalTeardown` in `playwright.config.js`. It fetches all open issues prefixed with `"Playwright issue"` and closes them, catching any orphans left by crashed tests.

---

## Configuration

### Environment variables

All credentials and repository references come from environment variables (loaded via `dotenv`). Nothing is hardcoded — the suite runs against any GitHub repository by changing the `.env` file.

### `playwright.config.js`

- Single worker (`workers: 1`) to avoid GitHub API rate limiting
- 60-second timeout per test
- Screenshots and video captured only on failure
- `storageState` loaded from `GITHUB_STORAGE_STATE` env var when provided
- `globalTeardown` points to `teardown.js`

### `saveSession.js`

Standalone script that launches a browser, lets the user log in to GitHub manually, then saves the session to `.auth/github-storage-state.json`. This file is reused across tests via `storageState` config.
