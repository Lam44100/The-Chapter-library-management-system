# Verification record

Local verification date: **15 October 2026**. Publishing remains deferred at the owner's request.

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

## Remaining publication checks

These are deliberately **not claimed as completed**:

- A public Render URL, Neon connectivity, hosting eligibility/quotas, HTTPS cookies, and hosted role workflows.
- A remote GitHub Actions run; its workflow is prepared, but nothing has been pushed.
- Render cold-start latency. Local startup/restart and missed-reset recovery passed, but they do not measure the hosting provider.
- Upgrade from an earlier persistent schema: V1 is the first database schema. Future migrations must be tested against the previous release; the original assignment has no database to migrate.
- Cross-browser and full accessibility certification. Chromium desktop/mobile behavior and visual screenshots were checked; this is not a claim of exhaustive assistive-technology coverage.

The deployment guide contains the remaining publication steps. No hosting account or paid upgrade was created.
