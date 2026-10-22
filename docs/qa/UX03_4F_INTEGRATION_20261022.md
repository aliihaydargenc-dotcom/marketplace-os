# UX03-4F — full application integration and regression — 2026-10-22

## Scope / exact environment
- Git branch feature/ux03-order-360; clean checkout initial SHA 9f3fdae5dfd5eca2eba4ac88fe1200f9363fc908.
- Isolated Vercel Sandbox, Node 24.22.1, Next.js 16.4.2 and PostgreSQL 18.6 on a local socket.
- Isolated database ux03_qa_test, with migrations 0001 through 0009 applied; no production or live database.
- All DB flags enabled: ORDER_VIEWS_DB_TEST, CATALOG_DB_TEST, INVENTORY_DB_TEST, OPERATIONS_DB_TEST, CONCURRENCY_DB_TEST and MIGRATION_DB_TEST.

## Implemented
- Grouped FBS preparation queues with a single indexed calculation, 80-record incremental rendering, whole-dataset search and deep-linked selection.
- User-and-terminal lease ownership for CLAIM, RENEW, RELEASE, RESERVE, SCAN and SHIP checks. Terminal-scoped writes without any active lease (including after expiry or RELEASE) now return 409, while legacy order-detail commands without a terminal still work when no active lease exists.
- Render-time blocked stock uses the computed blocked-order set.
- Browser detected root horizontal overflow at width 390px (scrollWidth 398px). Corrected mobile heading/action layout in workspace-design.css without removing existing scanner and claim styles.

## Executed and passed
| Gate | Outcome |
| --- | --- |
| npm ci | PASS |
| PostgreSQL migrations 0001-0009 | PASS |
| TypeScript typecheck | PASS |
| ESLint | PASS |
| Prettier format check | PASS |
| Vitest full DB/domain: 23 files, 110 tests, zero skips | PASS |
| Next production build | PASS |
| Chromium Playwright E2E: 13 tests, zero retries | PASS |

An initial Chromium test failed for mobile root overflow; after the CSS fix the production app was rebuilt and all original 12 E2E tests passed. Added a browser-level 1,205 synthetic-order snapshot interception test: the UI renders 80 rows at a time, reveals the next 80, finds order 1204 through search and has no root overflow at 390px. This is a browser/render test, not a 1,205-row PostgreSQL benchmark.

## Unverified and protected
Physical barcode scanner/IME, two physical operators, visual and interaction sign-off by the user, remote GitHub Actions and production Vercel READY are NOT verified. No real Ozon integration, production authentication or e-invoicing is claimed.

No Git commit, Git push, merge, production/preview deployment or live database modification occurred. All code changes remain uncommitted in the isolated QA workspace.

The integrated patch supersedes all earlier isolated 4a-4e ZIP files. Apply only this new cumulative patch to the exact base SHA, and do not stack old patches. A clean reapply check is required before any later push.

## Final addendum — PostgreSQL-backed scale, 22 October

Follow-up integration now includes tests/ux03-real-scale.db.test.ts: 1,205 actual PostgreSQL orders and order lines in a disposable UUID workspace, 1,087 pending FBS orders, three blocked on unavailable SKUs, a first 30-order mixed subset, role redaction, stock-block tasks, whole-dataset search and 80-row batching. One observed server-side snapshot call completed in 59ms in the sandbox; this is a single observation, not a latency guarantee or load benchmark. Three new DB tests passed. The GitHub Quality manual workflow has a new explicit DB flag for the scale tests; it was NOT remotely dispatched.

**Final close full run:** 24 Vitest files / 113 PASS / 0 skipped, 13/13 Chromium E2E, typecheck/lint/format/build PASS. See UX03_FINAL_20261022.md. No remote workflow run or deployment.
