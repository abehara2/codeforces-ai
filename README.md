# Codeforces AI

An AI-powered assistant for solving Codeforces competitive programming problems.

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- [Browserbase](https://browserbase.com) account (for problem sync)
- [Stripe](https://stripe.com) account (for billing)
- [Clerk](https://clerk.dev) account (for authentication)

### Environment Variables

Create a `.env.development` file with the following variables:

```bash
# Database
DATABASE_URL="postgresql://..."

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

# Stripe
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_..."

# Browserbase (for problem sync)
BROWSERBASE_API_KEY="bb_..."
BROWSERBASE_PROJECT_ID="..."

# OpenAI
OPENAI_API_KEY="sk_..."
```

### Installation

```bash
npm install
npx prisma generate
npx prisma db push
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Problem Sync

Problems are pre-fetched and stored in the database using Browserbase. This allows instant problem lookups without scraping.

### Running the Sync

```bash
# Sync all problems (full sync)
npm run sync:problems

# Stop when hitting existing problems (incremental sync - good for cron jobs)
npm run sync:problems -- --stop-on-dup

# Limit to N problems (useful for testing)
npm run sync:problems -- --limit=100

# Combine flags
npm run sync:problems -- --stop-on-dup --limit=50
```

### Cron Job Setup

For weekly syncs, set up a cron job to run:

```bash
npm run sync:problems -- --stop-on-dup
```

The `--stop-on-dup` flag makes incremental syncs efficient - it stops when it encounters a problem that's already in the database, assuming newer problems come first.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run sync:problems` | Sync Codeforces problems to database |
| `npm run clean:all` | Clean all data (chats, users, etc.) |
| `npm run stripe:webhook` | Forward Stripe webhooks locally |

## Architecture

- **Next.js 16** - React framework with App Router
- **Prisma** - Database ORM
- **Clerk** - Authentication
- **Stripe** - Subscription billing
- **Browserbase** - Problem scraping (via Selenium)
- **OpenAI** - AI chat completions

## License

MIT
