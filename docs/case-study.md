# From console assignment to Chapter

The original assignment demonstrated Java inheritance and a simple library workflow. A single class handled menus, login, lending, CRUD, and fixtures. Data disappeared at exit; borrowing limits were unenforced, random IDs could collide, and deletion could leave inconsistent references. Its source is retained at `assignment-original`.

The rewrite preserves the useful distinction between a book title and a borrowable physical copy, while replacing console coupling with a browser, explicit JSON contracts, business services, and PostgreSQL persistence.

## Decisions worth discussing

**Test behavior, not just screens.** Calendar/fine calculations use a controllable clock. Integration tests exercise real PostgreSQL constraints, competing checkouts, the last borrowing slot, reservation expiry, and session invalidation.

**Keep authorization behind the interface.** Service methods verify current role, account status, and ownership. A hidden button is not an access-control mechanism. Responses never contain password hashes or persistence entities.

**Choose understandable concurrency.** The small shared demo uses a database lock to serialize operations. This makes resets and loan limits easy to reason about. It is a deliberate tradeoff against throughput, documented rather than presented as a large-scale solution.

**Design for a sleeping host.** Reset state is persisted, so waking after the scheduled time causes exactly one catch-up reset. Expired reservations are reconciled when the app is used. Session generations invalidate old access after a reset.

**Complete the user journey.** Search returns multiple results, availability refers to physical copies, readers can reserve and renew, staff can issue and return, and administrators archive without destroying history. The visual design supports desktop/mobile use, keyboard access, loading states, and understandable errors.

## Boundaries and future evolution

This release is a bounded portfolio demo, not a deployed production organization. Public hosting is prepared but deferred. No real personal data, registration, payments, or notifications are included. No benchmark or adoption claims are made.

A production successor would need database-side search/pagination, narrower lock boundaries, persistent/distributed sessions, organization-specific identity, monitoring, and a non-destructive retention policy. See the verification record for checks actually executed.
