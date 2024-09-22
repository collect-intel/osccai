# Open-Source Collective Constitutional AI (OSCCAI)

## Overview

Open-Source Collective Constitutional AI (OSCCAI) is a platform that enables communities to collaboratively create and refine AI models based on collectively defined constitutions. This project aims to democratize AI alignment by allowing diverse groups to shape AI behavior according to their shared values and preferences.

## Application Structure and Flow

### 1. Community Models

- Users can create Community Models, which serve as the overarching container for the constitution-creation process.
- Each Community Model starts with an initial idea or concept.

### 2. Polls and Collective Input

- Within a Community Model, users can create Polls to gather collective input.
- Polls consist of Statements that participants can vote on (Agree, Disagree, or Pass).
- Users can also contribute their own statements to the poll.
- Statements can be flagged for review if deemed inappropriate or off-topic.

### 3. Constitutions

- Based on the collective input from polls, Constitutions are derived.
- A Community Model can have multiple Constitutions, but only one "active" Constitution at a time.
- Constitutions contain a set of principles or guidelines that define the AI's behavior and values.

### 4. Chat Interface

- Each Constitution can be expressed through a Chat Interface, allowing users to interact with an AI model guided by the constitution's principles.
- The Chat Interface is embedded within the application, providing a seamless experience for users to test and interact with the constitutionally-aligned AI.

### 5. Core AI Service

- The application interfaces with a separate core AI service (running locally on port 3088) to power the chat functionality.
- This service takes the constitution data and uses it to seed or guide the AI's responses in the chat interface.

## Key Components

1. **Community Model Creator**: Allows users to initiate new community models with an initial idea.
2. **Poll System**: Facilitates the creation of polls, statement submission, and voting mechanism.
3. **Constitution Generator (internal)**: Derives constitutions from poll results and collective input.
4. **Constitution Manager**: Shows and allows config of different versions of derived constitutions.
5. **Chat Interface**: Embeds a chat UI that interacts with the core AI service, using the active constitution as a guide.

## User Flow

1. User creates a new Community Model with an initial idea.
2. The system automatically generates an initial poll based on the idea.
3. Participants vote on statements and contribute new ones.
4. Based on poll results, a Constitution is generated.
5. The Constitution becomes "active" for the Community Model.
6. Users can interact with the AI through the Chat Interface, which is guided by the active Constitution.
7. The process can be repeated to refine the Constitution over time.

## Technical Stack

- **Frontend**: Next.js with React
- **Backend**: Next.js API routes + Server Actions
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk (for both community model owners and participants)
- **AI Integration**: Custom core AI service (separate from this application)

## Current Status and TODOs

- TODO: Finalize proper authentication flow using Clerk.
- TODO: Enhance documentation for the core AI service integration.
- TODO: Implement Constitution generation. (poll/consensus-derived)
- TODO: Develop a public library interface for Community Models and Constitutions.

## Getting Started / Local Setup

This presumes you have the following installed:

* Node (+ npm or pnpm)
* Postgres (`brew install postgresql`, `brew services start postgresql`)

1. Clone the repo

```bash
git clone git@github.com:collect-intel/osccai.git
```

2. Ensure local dependencies are installed:

```bash
npm install # / pnpm install
```

3. Set up local env vars in `.env`:

```
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
DATABASE_URL=postgresql://[your username]@localhost:5432/postgres
DIRECT_URL=postgresql://[your username]@localhost:5432/postgres
```

4. Run the prisma migration to get database set-up:

```bash
# First: Ensure postgres is running!
npx prisma migrate dev --name init
npx prisma studio # useful for verifying data is there
```

5. Seed the database:

```bash
npm run db:seed
```

6. Run the development server:

```bash
npm run dev:local # usually runs at localhost:3000 unless port is taken
```

7. (Optional) To reset the database:

```bash
npm run db:reset
```

8. Done! 🥳 Your local development environment should now be running at http://localhost:3000 (unless the port is already in use).

## Available Scripts

- `npm run dev:local`: Start the development server using local environment variables
- `npm run dev:prod`: Start the development server using production environment variables
- `npm run build`: Generate Prisma client and build the Next.js application
- `npm run build:local`: Generate Prisma client and build using local environment variables
- `npm run start`: Start the production server
- `npm run lint`: Run ESLint
- `npm run prisma:local`: Run Prisma commands with local environment variables
- `npm run prisma:prod`: Run Prisma commands with production environment variables
- `npm run db:seed`: Seed the database using local environment variables
- `npm run db:seed:prod`: Seed the database using production environment variables
- `npm run db:reset`: Reset the local database (with confirmation prompt)
- `npm run db:reset:prod`: Reset the production database (with confirmation prompt)

Note: Always use caution when running database reset or seeding scripts, especially in a production environment.

## Contributing

We welcome contributions from the community! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines on how to get involved.

## License

[Insert chosen license here]