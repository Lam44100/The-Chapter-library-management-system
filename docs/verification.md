# Verification record

Local verification date: **15 October 2026**. Hosted verification date: **16 October 2026**. Source code and CI are available in the [GitHub repository](https://github.com/Lam44100/The-Chapter-library-management-system).

## Executed checks

| Check | Result | What it covers |
| --- | --- | --- |
| Java 21 / Maven verification | 26 tests passed: 2 unit, 24 PostgreSQL integration | Calendar/fine boundaries, lending policy, persistence, authorization, validation, resets, concurrency |
| Frontend component tests | 4 passed | Copy availability, catalog links, currency/date formatting, accessible errors |
| TypeScript and Vite production build | Passed | Type checking and bundled browser assets |
| npm dependency audit | 0 reported vulnerabilities | Locked frontend dependency tree at verification time |
| Docker production image | Built; application/database healthy | React assets served by Spring Boot, PostgreSQL connection, health endpoint |
| Chromium browser suite | 7 passed | All three roles, validation, shared-copy conflicts, mobile layout, restart persistence, reset/session expiry |
| Portfolio capture | Desktop/mobile screenshots and WebM generated | Catalog, book details, demo roles, dashboard, and a walkthrough of lending/reservations |

The Java suite uses Testcontainers with PostgreSQL 17.6, not an in-memory database. Test failures are not skipped when Docker is missing. The browser suite uses the built Docker image and one worker because it intentionally shares a mutable demo database.

## Acceptance coverage

- **Borrowing:** fifth loan accepted, sixth rejected; inactive members blocked; unavailable/held copies protected; repeated returns rejected; completed loans retained.
- **Time:** Malaysia calendar boundaries, overdue days and finalized fines, one renewal from the existing due date, overdue/competing-reservation renewal restrictions.
- **Reservations:** duplicate and already-borrowed title rejection, FIFO allocation, cancellation promotion, pickup expiry and reassignment, ownership checks.
- **Concurrency and storage:** competing requests for the same copy and last borrowing slot; database active-loan uniqueness; duplicate identifiers; archive safeguards; Flyway initialization/checksum validation; data retained across transactions and a real application restart.
- **Security:** unauthenticated access, wrong roles, another member's loans, missing CSRF, real session/CSRF login, closed/blacklisted accounts, protected sample accounts, multibyte password size validation.
- **Demo recovery:** atomic generation change, old-session rejection, missed-reset catch-up exactly once, and a browser re-entry message after the operator reset.
- **Browser:** member reserve/cancel/history; librarian issue/return/history; admin create/edit/archive; required-field validation; stale copy availability conflicts; 390px catalog layout/navigation.

## Reproduce

From the repository root:

```sh
./mvnw verify
npm --prefix frontend ci
npm --prefix frontend test
npm --prefix frontend run build
docker compose up -d --build --wait
```

For browser checks, use a fresh **local demo**. The following reset intentionally removes local sample-data changes and invalidates sessions:

```sh
docker compose exec -T app java -jar /app/app.jar --server.port=0 --library.reset-on-start=true
cd frontend
npx playwright install chromium
npm run test:e2e
```

The last browser test restarts the Compose `app` service, verifies saved data, and resets it. Do not point this suite at a hosted service. Reports are generated in `target/surefire-reports`, `target/failsafe-reports`, and `frontend/playwright-report`; GitHub Actions is configured to upload them.

To recreate the portfolio media, run `npm run capture` from `frontend` against a fresh local demo. It creates screenshots and a silent walkthrough in `docs/media`, including member reservation/cancellation and librarian issue/return actions. The script changes sample data, so reset afterward if a pristine library is wanted.

## Hosted verification — 16 October 2026

The [public demo](https://the-chapter-library.onrender.com) deployed successfully on Render Free with Neon Free PostgreSQL in Singapore, from application commit `b083d7a`.

- [GitHub Actions](https://github.com/Lam44100/The-Chapter-library-management-system/actions/runs/38757397789) passed for that commit.
- Render reported the deployment as `live`; the HTTPS health endpoint returned `200` with `UP`.
- The homepage, bundled frontend assets, and direct navigation to login, book details, dashboard, and admin routes returned successfully.
- The catalog rendered in Chrome with all ten sample titles, and the hosted API returned the expected search result for Austen.
- All three demo roles authenticated with persistent sessions, CSRF tokens, and `Secure`/`HttpOnly` session cookies.
- Anonymous dashboard access returned `401`; member access returned `403`.
- A member created and cancelled a reservation. A librarian issued and returned a copy. Administrator account and author lists loaded successfully.
- The post-deployment error-log query returned no error entries during the verification window.

Ten grouped HTTP checks passed. These checks used fictional sample records; the test reservation was cancelled and the test loan returned. No database reset was performed. The existing local browser suite was not run against the hosted demo because it includes local Docker restart/reset operations.

The first health request timed out while Java was still starting; the checks passed after Render marked the deployment live. This is an initial-start observation, not a cold-start performance guarantee.

## Remaining checks

These are deliberately **not claimed as completed**:

- Sustained traffic, free-plan quota exhaustion, and measured Render wake-up latency after idle suspension. Free hosting can sleep and may be suspended when allowances are exhausted.
- Upgrade from an earlier persistent schema: V1 is the first database schema. Future migrations must be tested against the previous release; the original assignment has no database to migrate.
- Cross-browser and full accessibility certification. Chromium desktop/mobile behavior and visual screenshots were checked; this is not a claim of exhaustive assistive-technology coverage.

The deployment guide records the hosting setup and operating limits. Existing connected accounts were used; no paid upgrade was selected.
