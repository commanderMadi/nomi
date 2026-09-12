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
### IMPORTANT!
The seed prints fixed demo user ids and development API keys. Seed users log in with the password it prints.

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
