# Deployment and operator guide

Public hosting is intentionally deferred. The repository targets one free Render Docker service plus free Neon PostgreSQL. Recheck provider terms when publishing; never enable a paid upgrade automatically.

## Publish later

1. Push the reviewed commits and `assignment-original` tag to the intended GitHub repository. This implementation does not push automatically.
2. Create a free Neon project/database; keep credentials in the provider dashboards.
3. Create a Render Blueprint from `render.yaml` and retain the **free** plan.
4. Set `DATABASE_URL` to `jdbc:postgresql://HOST/DATABASE?sslmode=require`, with separate `DATABASE_USERNAME` and `DATABASE_PASSWORD`. A plain `postgresql://user:password@host/...` string is not a JDBC URL.
5. Retain `DEMO_ENABLED=true`, `COOKIE_SECURE=true`, and the generated demo password. Quick-entry buttons do not expose or require the password.
6. Verify `/actuator/health`, all roles, catalog search, issue/return, reservations, and refresh on a nested browser route.
7. Add the verified live URL to README/portfolio. Only claim hosted CI is passing after its actual remote run completes.

Free Render hosting sleeps after inactivity and has an ephemeral filesystem; all records belong in PostgreSQL. Do not add artificial keep-alive traffic. References: [Render free limits](https://render.com/docs/free), [Docker deployment](https://render.com/docs/docker), [Neon connections](https://neon.com/docs/connect/connect-from-any-app).

## Local operation

`docker compose up --build -d --wait` starts the app and persistent database on loopback ports. Default credentials are strictly local sample-data defaults. `docker compose stop/start` preserves data; do not use `down -v` unless intentionally discarding the sample database.

Operator-only reset:

```sh
docker compose exec app java -jar /app/app.jar --server.port=0 --library.reset-on-start=true
```

This short-lived process resets under the database lock and exits. Existing sessions fail their next protected request. For hosted operation, run the JAR from a trusted operator environment with the same database configuration; free Render may not offer a shell. The command refuses when demo mode is off.

**Reset deliberately discards demo changes.** Never point it at real records. Ordinary restart retains data unless the daily reset is overdue.

## Schema and releases

Flyway migrates an empty database and validates checksums on later starts. This is the first persistent schema; the console assignment has no saved database to import. Never edit a deployed migration. Add numbered migrations, favor additive changes, and test future upgrades from the previous schema.

An application rollback does not reverse a database migration. Keep the prior application compatible with additive migrations and back up data before any destructive future change. Reset preserves the Flyway history and library-state row; identity sequences continue increasing.

## Monitoring and limits

- Inspect the health endpoint and Render error logs; monitor Neon storage/compute quotas.
- Sessions are in memory and expire on restart. Visitors can choose a role again.
- Use one app instance. Library operations are serialized for correctness in this small demo.
- Entity cap: 1,000 each; recent activity cap: 500; active reservations: five per member.
- Limits per minute/client IP: 20 authentication writes and 120 other writes. Shared networks can share that allowance.
- PostgreSQL pool: four maximum connections, zero minimum idle.
- External fonts have local fallbacks. No email, payments, or external book service is required.
- Disabling demo mode disables shortcuts/resets; real organization provisioning is outside this release.
