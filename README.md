# Nomi

An identity and profile management API. Nomi stores a person's name as structured, multi-script components, assembles a context-appropriate identity from them, and discloses it only to requesters the person has authorized. Every resolution attempt is audited.

## Requirements

- Node.js 20+
- PostgreSQL 15+

## Setup

```bash
createdb nomi
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```
## Demo Credentials

Running `npx prisma db seed` populates the database with initial test users and requester API keys.

### Seed User Accounts
All seed users use the password: **`dev-password-only`**

| Name | Email | User ID |
| --- | --- | --- |
| Ahmed | `ahmed@example.com` | `00000000-0000-4000-8000-000000000001` |
| Yuki | `yuki@example.com` | `00000000-0000-4000-8000-000000000002` |
| Björk | `bjork@example.com` | `00000000-0000-4000-8000-000000000003` |
| Joko | `joko@example.com` | `00000000-0000-4000-8000-000000000004` |
| María | `maria@example.com` | `00000000-0000-4000-8000-000000000005` |

### Requester API Keys
Pass these keys in the `Authorization: Bearer <key>` header (e.g. in `/resolve` or the API):

| Requester | API Key |
| --- | --- |
| Hospital | `nomi_dev_hospital` |
| Employer | `nomi_dev_employer` |
| University | `nomi_dev_university` |
| Government | `nomi_dev_government` |
| Broker | `nomi_dev_broker` |


## Web interface

- `/` landing page
- `/register`, `/login` account access
- `/dashboard` name components, identity builder with ordering, access grants, audit log
- `/resolve` requester playground: present an API key and resolve a name

## Testing

The test suites run against a live server, so start one first (`npm run dev`, or `npm run build && npm start` for meaningful performance numbers) with a seeded database.

```bash
npm test
npm run test:timing
npm run test:load
```

`test` runs the end-to-end scenario suite and cleans up after itself. `test:timing` compares denial latencies for unknown-user versus no-permission paths. `test:load` reports throughput and latency percentiles; tune with `TOTAL` and `CONCURRENCY` env vars.

## API

| Method | Path | Auth |
| --- | --- | --- |
| POST | /api/v1/users | Public |
| POST | /api/v1/sessions | Public |
| POST | /api/v1/requesters | Admin key |
| GET, POST | /api/v1/users/{id}/name-components | Session (self) |
| GET, POST | /api/v1/users/{id}/identities | Session (self) |
| GET, POST | /api/v1/users/{id}/permissions | Session (self) |
| DELETE | /api/v1/users/{id}/permissions/{pid} | Session (self) |
| GET | /api/v1/users/{id}/audit | Session (self) |
| GET | /api/v1/users/{id}/name?context=... | Requester key |
