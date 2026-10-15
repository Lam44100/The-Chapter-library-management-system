# API reference

Base: `/api/v1`. JSON requests/responses, integer IDs, `YYYY-MM-DD` calendar dates, ISO-8601 event timestamps, MYR decimal fines. Authentication uses a same-origin server-session cookie.

## Session flow

1. `GET /auth/csrf` returns `{headerName,token}` and a session cookie.
2. Send that header/cookie on every non-GET request, including login.
3. `POST /auth/login` accepts `{email,password}`. In demo mode, `POST /auth/demo` accepts `{role:"MEMBER"}` (`LIBRARIAN` and `ADMIN` also supported).
4. Fetch a new token after login because login rotates it.
5. `GET /auth/me` returns `{id,name,email,role,status,protectedAccount}`. `POST /auth/logout` ends the session.

## Routes

| Route | Access | Input / result |
| --- | --- | --- |
| `GET /catalog?q=&genre=&available=false&page=0&size=12` | Public | `{items,total,page,size}`; size 1–50 |
| `GET /catalog/{id}` | Public | Book detail, unarchived copies |
| `GET /authors` | Public | Author IDs/names |
| `GET /demo` | Public | Enabled, last/next reset, generation |
| `GET /users` | Staff | Unarchived accounts |
| `POST /admin/authors`, `PUT /admin/authors/{id}` | Admin | `{name}` |
| `POST /admin/titles`, `PUT /admin/titles/{id}` | Admin | `{isbn,title,genre,publisher,description,authorIds}` |
| `POST /admin/copies`, `PUT /admin/copies/{id}` | Admin | `{titleId,barcode,status}` |
| `POST /admin/users`, `PUT /admin/users/{id}` | Admin | `{name,email,password,role,status}` |
| `DELETE /admin/{type}/{id}` | Admin | Archive; type is titles, copies, authors, or users |
| `GET /loans?borrowerId=` | Signed in | Members see only their own; staff can filter |
| `POST /loans` | Staff | `{borrowerId,copyId}` |
| `POST /loans/{id}/return` | Staff | Completed loan and final fine |
| `POST /loans/{id}/renew` | Owner or staff | Updated loan |
| `GET /reservations` | Signed in | Own for members; all for staff |
| `POST /reservations` | Active member | `{titleId}` |
| `POST /reservations/{id}/cancel` | Owner or staff | Empty success body |
| `GET /dashboard` | Staff | Counts, overdue loans, pickups, activity |

Staff means librarian/admin. Successful mutations return 200 with the resulting object or an empty body. Public registration and public reset are absent.

## Inputs and types

- Roles: `ADMIN`, `LIBRARIAN`, `MEMBER`. Account statuses: `ACTIVE`, `BLACKLISTED`, `CLOSED`.
- Editable copy statuses: `AVAILABLE`, `LOST`, `REFERENCE_ONLY`. Circulation controls `LOANED` and `HELD`. Copies cannot change title.
- Reservation statuses: `WAITING`, `READY`, `FULFILLED`, `CANCELLED`, `EXPIRED`.
- ISBN/barcode: trimmed uppercase identifiers, unique including archived records. ISBN checksum validation is not imposed.
- Maximum lengths: title 200, ISBN 32, barcode 40, genre 80, name/publisher 120, description 2,000, email 180. Titles require 1–10 active authors.
- Account creation requires an 8–72 character password that also fits within BCrypt's 72 UTF-8 byte limit. On update, null retains the password. Emails are lowercase. Seeded demo accounts reject edits/archiving.

## Response records

- Book: `id,isbn,title,genre,publisher,description,authors[{id,name}],copies[{id,barcode,status}],available`.
- Loan: `id,borrowerId,borrower,titleId,title,copyId,barcode,issueDate,dueDate,returnDate,renewals,fine,overdue`.
- Reservation: `id,borrowerId,borrower,titleId,title,status,createdAt,expiresAt,barcode,queuePosition` (position 0 outside WAITING).
- Dashboard: `titles,available,activeLoans,members,overdue[],pickups[],activity[{id,actor,message,createdAt}]`.

## Errors

Errors have `message` and optionally `fields`, e.g. `{ "message":"Please check the highlighted fields.", "fields":{"name":"must not be blank"} }`.

400 invalid input; 401 missing/expired/closed session; 403 role/ownership/CSRF failure; 404 missing record; 409 policy or uniqueness conflict; 429 throttled (`Retry-After: 60`). Refresh after 409 because another visitor may have changed a record. Repeated returns report a conflict rather than a second success; duplicate issue attempts cannot create a second active loan.
