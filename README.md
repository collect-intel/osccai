# Open-Source Collective Constitutional AI (CCAI)

## Overview

Open-Source CCAI is a tool that enables anyone to train an AI model based on a constitution created from collective input. This project aims to democratize the process of aligning AI systems with human values and preferences.

## Process

1. Constitution Creation: Gather collective input from a diverse group of participants.
2. Input Transformation: Convert collective feedback into a set of principles (constitution).
3. Model Training: Fine-tune an AI model using the created constitution.
4. Sharing: Store Constitutions and trained models in a publicly navigable digital library.

## Goals

- Empower communities to create AI models aligned with their values
- Increase transparency in AI alignment processes
- Explore scalable methods for incorporating public input into AI development

## Components

- 📄Constitution Creator
- 💪Model Trainer (from a Constitution)
- 📚Constitution Library

## Overview

Project / Tool: **Open-Source CCAI** **[OS CCAI]** consists of

- **Collective Constitution Creator**
- **(Model Training) **
- **Collective Constitution Library**

**Creators** use the **Collective Constitution Creator** platform to generate **Constitutions** from collective input gathered in a **Poll**.

Using this tool creates a new **Poll** that collects **Statements**.

**Participants** interact with the Poll to **Vote** on others’ Statements.

Votes take the form of **Agree, Disagree, **or **Pass**. Participants can also **Flag** a Statement for removal (inappropriate/off-topic).

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

5. Run the development server:

```bash
npm run dev:local # usually runs at localhost:3000 unless port is taken
```

6. Login / Sign up

```
Go to http://localhost:3000/login
```

If you are signing up you'll need to click on a link sent to your email.

7. Done! 🥳

## Contributing

We welcome contributions from the community! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines on how to get involved.

## License

[Insert chosen license here]
