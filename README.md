# Venguard ITW — Playwright E2E Test Suite for GitHub Issues

End-to-end test suite built with [Playwright](https://playwright.dev/) that validates the full lifecycle of GitHub Issues (create, edit, close) and their comments (create, edit, delete) against a real GitHub repository.

The tests combine **UI interactions** (browser automation) with **API assertions** (GitHub REST API) to ensure that what the user does in the browser is correctly persisted on the backend.

---

## Getting Started

### Prerequisites

- Node.js 18+
- A GitHub account
- A temporary GitHub repository with Issues enabled
- A [fine-grained personal access token](https://github.com/settings/tokens?type=beta) scoped to that repository with Issues read/write permissions

### Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your values:

   | Variable | Description |
   |---|---|
   | `GITHUB_OWNER` | Repository owner (your GitHub username or org) |
   | `GITHUB_REPO` | Repository name |
   | `GITHUB_TOKEN` | Fine-grained token with Issues read/write |
   | `GITHUB_STORAGE_STATE` | *(optional)* Path to a Playwright storage state file |

3. Install dependencies and browsers:

   ```bash
   npm install && npm run install:browsers
   ```

4. *(Optional)* Generate a browser session for UI authentication:

   ```bash
   node saveSession.js
   ```

   A browser window opens — log in to GitHub, and the session is saved to `.auth/github-storage-state.json`.

5. Validate your setup:

   ```bash
   npm run github:discover
   npm run github:preflight
   ```

### Running Tests

```bash
npm run run                                         # all tests
npx playwright test tests/github/issues_.spec.js    # issues only
npx playwright test tests/github/issues_comments_.spec.js  # comments only
npx playwright test --headed                        # with browser visible
```

---

## Project Structure

```
venguard-itw/
├── fixtures/
│   └── fixtures.js           # Extended Playwright test with scanDOM() and ids fixtures
├── helpers/
│   ├── github/
│   │   └── helpers.js        # GitHub REST API helpers (create, read, update, close issues/comments)
│   └── pw/
│       └── helpers.js        # Playwright utilities (random data, GraphQL response filter)
├── tests/
│   └── github/
│       ├── issues_.spec.js           # Issue lifecycle tests (create, edit, close)
│       └── issues_comments_.spec.js  # Comment lifecycle tests (create, edit, delete)
├── tools/
│   └── github/               # Discovery and preflight validation scripts
├── plugins/
│   └── index.js              # Pre-configured dayjs instance
├── teardown.js               # Global teardown — closes orphaned test issues
├── saveSession.js            # Browser session capture for GitHub authentication
├── playwright.config.js      # Playwright configuration
└── docs/
    └── architecture.md       # Architecture decisions and patterns
```

---

## Test Coverage

### Issues (`issues_.spec.js`)

| Test | Flow |
|---|---|
| Create via UI, verify via API | Fill the new-issue form in the browser, assert the created issue exists via REST API |
| Create via API, edit via UI, verify via API | Create issue with REST API, edit title and body in the browser, assert changes via REST API |
| Create via API, close via UI, verify via API | Create issue with REST API, close it in the browser, assert state is `closed` via REST API |

### Comments (`issues_comments_.spec.js`)

| Test | Flow |
|---|---|
| Create comment via UI, verify via API | Post a comment through the browser, assert it appears via REST API |
| Create comment via API, edit via UI, verify via API | Create comment with REST API, edit it in the browser, assert updated body via REST API |
| Create comment via API, delete via UI, verify via API | Create comment with REST API, delete it in the browser, assert it no longer exists via REST API |

---

## Documentation

- [Architecture](docs/architecture.md) — design decisions, patterns, and conventions used in this project
