# CONSITEC Commercial and Operational Management Panel

Professional internal web application for monthly control of training services and certificate-only sales.

## Stack
- Next.js 15 + React 18
- API Routes (Node runtime)
- Prisma ORM
- PostgreSQL
- Recharts

## Modules
1. **Monthly Services Board** (calendar + bonus alerts 45/70)
2. **Certificate Sales Board** (Natural Person vs Company)
3. **Sales Performance 6x4** (weekly matrix, bonus flag, ranking)
4. **Support Database** (CRUD for instructors, courses, salespeople, locations)

## Auth Roles
- `ADMIN`
- `SALES`

Basic credential login with protected `/dashboard` route.

## Local Setup
```bash
npm ci
cp .env.example .env
# Set AUTH_SECRET and ADMIN_PASSWORD in .env; keep local PostgreSQL URLs.
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run dev
```

Open: `http://localhost:3000`

## Administrator and authentication

There is no default password. Set `ADMIN_USERNAME` (defaults to `admin`) and a unique `ADMIN_PASSWORD` of at least 12 characters and no more than 72 bytes in your ignored `.env` before running `npm run prisma:seed`. Passwords are stored as bcrypt hashes. Set a random `AUTH_SECRET` of at least 32 bytes. The dashboard and all data APIs require a signed session.

## Environment

See `.env.example`. `DATABASE_URL` serves application queries; `DIRECT_URL` serves migration commands. For development both can point to the same local PostgreSQL database. Never commit credentials or define `NODE_ENV` in `.env`.

## Deployment on Vercel

Follow [the Vercel guide](docs/VERCEL.md) to configure PostgreSQL, secrets, initialize the administrator, and deploy. The repository configures Node 24, `npm ci`, Prisma generation, and migration deployment before the Next.js build. Use separate Preview and Production databases. Administrator provisioning is a separate initial step; builds do not run the seed.

## Validation

```bash
npm run lint
npm run build
npm start
# Another terminal, with credentials for an isolated test database:
node --env-file=.env scripts/smoke.mjs
```

The smoke checks rejected credentials, protected pages/APIs, signed cookies, database reads/writes, dashboard totals, and logout. It creates and removes test records; use a test database.

## Business Notes
- Monthly view automatically changes using selected month/year and preserves historical records by date.
- Designed for desktop internal office operation with fast inline workflows.
