# Open-Source Collective Constitutional AI (OSCCAI)

## Overview

Open-Source Collective Constitutional AI (OSCCAI) is a platform that enables communities to collaboratively create and refine AI models based on collectively defined constitutions. This project aims to democratize AI alignment by allowing diverse groups to shape AI behavior according to their shared values and preferences.

## Application Structure and Flow

[The existing structure and flow section can remain unchanged]

## Key Components

[The existing key components section can remain unchanged]

## User Flow

[The existing user flow section can remain unchanged]

## Technical Stack

- **Frontend**: Next.js 14.2.5 with React 18
- **Backend**: Next.js API routes + Server Actions
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk
- **AI Integration**: Custom core AI service (separate from this application)
- **Additional Libraries**: Tailwind CSS, Headless UI, Heroicons, Framer Motion, and more

## Current Status and TODOs

- TODO: Finalize proper authentication flow using Clerk.
- TODO: Enhance documentation for the core AI service integration.
- TODO: Implement Constitution generation (poll/consensus-derived).
- TODO: Develop a public library interface for Community Models and Constitutions.

## Getting Started / Local Setup

This setup presumes you have the following installed:

* Node.js (+ npm)
* PostgreSQL (`brew install postgresql`, `brew services start postgresql`)

1. Clone the repo:

```bash
git clone git@github.com:collect-intel/osccai.git
```

2. Install dependencies:

```bash
npm install
```

3. Set up local environment variables in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
DATABASE_URL=postgresql://[your username]@localhost:5432/postgres
DIRECT_URL=postgresql://[your username]@localhost:5432/postgres
```

4. Run the Prisma migration:

```bash
npm run prisma:local -- migrate dev --name init
npm run prisma:local -- studio  # useful for verifying data
```

5. Seed the database:

```bash
npm run db:seed
```

6. Run the development server:

```bash
npm run dev:local
```

7. (Optional) To reset the database:

```bash
npm run db:reset
```

Your local development environment should now be running at http://localhost:3000 (unless the port is already in use).

## Available Scripts

- `npm run dev:local`: Start the development server using local environment variables
- `npm run dev:prod`: Start the development server using production environment variables
- `npm run build`: Generate Prisma client and build the Next.js application
- `npm run build:local`: Generate Prisma client and build using local environment variables
- `npm run start`: Start the production server
- `npm run lint`: Run ESLint
- `npm run prisma:local`: Run Prisma commands with local environment variables
- `npm run db:seed`: Seed the database using local environment variables
- `npm run db:seed:prod`: Seed the production database (with confirmation prompt)
- `npm run db:reset`: Reset the local database (with confirmation prompt)
- `npm run db:reset:prod`: Reset the production database (with confirmation prompt)
- `npm run db:migrate`: Run Prisma migrations for local development
- `npm run db:migrate:prod`: Run Prisma migrations for production (with confirmation prompt)
- `npm run prisma:studio:prod`: Run Prisma Studio with production environment variables

Note: Always use caution when running database reset, seeding, or migration scripts, especially in a production environment.

## Contributing

We welcome contributions from the community! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines on how to get involved.

## License

[Insert chosen license here]