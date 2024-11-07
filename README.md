# Open-Source Collective Constitutional AI (OSCCAI)

** This readme is 30% AI generated and 70% human generated. It's not Canonical. **

## Overview

Open-Source Collective Constitutional AI (OSCCAI) is a platform that enables communities to collaboratively create and refine AI models based on collectively defined constitutions. This project aims to democratize AI alignment by allowing diverse groups to shape AI behavior according to their shared values and preferences.

## Key Components

- **Community Model Creation and Management**: Users can create and manage community AI models, defining their goals, bio, and principles.
- **Collaborative Constitution Development**: Generate constitutions derived from community input and poll results.
- **Polling and Voting System**: Create polls for community members to vote on principles and statements.
- **Constitutional AI Chat Interface**: Interact with an AI chatbot that adheres to the defined constitution.
- **File Upload and Management**: Upload and manage community logos and other assets using Supabase storage.

## User Flow

1. **Create a Community Model**: Define the name, bio, goal, and upload a logo.
2. **Define Initial Principles**: Add core principles that will guide the community AI model.
3. **Create and Manage Polls**: Collect community input on principles through polls.
4. **Generate and Refine Constitutions**: Generate a constitution based on poll results and refine it as needed.
5. **Interact with the AI Chatbot**: Use the Constitutional AI Chat interface to interact with the AI model governed by the community's constitution.

## Technical Stack

- **Frontend**: Next.js 14.2.5 with React 18
- **Backend**: Next.js API routes and Server Actions
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk
- **AI Integration**: Custom AI service using `xmllm`
- **File Storage**: Supabase (for storing uploaded files like community logos)
- **Additional Libraries**: Tailwind CSS, Headless UI, Heroicons, Framer Motion, React Markdown, Lodash, and more

## Environment Variables

To run the project locally, you'll need to set up the following environment variables in your `.env.local` file:

- **DATABASE_URL**: Connection string for your PostgreSQL database.
- **DIRECT_URL**: Direct connection URL for Prisma migrations.
- **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY**: Publishable key for Clerk authentication.
- **CLERK_SECRET_KEY**: Secret key for Clerk authentication.
- **NEXT_PUBLIC_APP_URL**: The URL where your app is running (e.g., `http://localhost:3000`).
- **ANTHROPIC_API_KEY**: API key for Anthropic's AI services.
- **NEXT_PUBLIC_SUPABASE_URL**: URL of your Supabase project.
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Supabase anonymous key.
- **SUPABASE_SERVICE_ROLE_KEY**: Supabase service role key for server-side operations.
- **SUPABASE_S3_ACCESS_KEY_ID**: Access key ID for Supabase S3 storage.
- **SUPABASE_S3_SECRET_ACCESS_KEY**: Secret access key for Supabase S3 storage.
- **SUPABASE_REGION**: Region where your Supabase project is hosted.

## Getting Started / Local Setup

This setup presumes you have the following installed:

- **Node.js** (with npm)
- **PostgreSQL** (you can install it using `brew install postgresql` and start it with `brew services start postgresql` on macOS)
- **pnpm** - We use pnpm as our package manager because it's significantly faster and more efficient than npm, using a content-addressable store to save disk space and speed up installations. [Install pnpm](https://pnpm.io/installation) by running `npm install -g pnpm` or using other available methods.

### Steps:

1. **Clone the repository:**

   ```bash
   git clone git@github.com:collect-intel/osccai.git
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Set up environment variables:**

   Create a `.env.local` file in `/apps/web` and fill in the environment variables as shown above.

4. **Within `/apps/web`, set up your database:**

   ```bash
   pnpm run db:reset
   ```

6. **Start the development server:**

   ```bash
   pnpm run dev:local
   ```

7. **Start the local cron job (in a separate terminal):**
   This ensures that your local environment mimics the production environment, where the cron job runs alongside the main application to update GAC scores periodically.

   ```bash
   pnpm run cron:local
   ```

8. **Access the application:**

   Open your browser and navigate to `http://localhost:3000`

### Optional:

- **Reset the database:**

  ```bash
  pnpm run db:reset
  ```

- **Run Prisma Studio:**

  ```bash
  pnpm run prisma:studio:local
  ```

  This opens a web interface to explore and manipulate your database records.

## Available Scripts

- `pnpm run dev:local`: Start the development server using local environment variables.
- `pnpm run dev:prod`: Start the development server using production environment variables.
- `pnpm run build`: Generate Prisma client and build the Next.js application.
- `pnpm run build:local`: Generate Prisma client and build using local environment variables.
- `pnpm run start`: Start the production server.
- `pnpm run lint`: Run ESLint to analyze code for potential errors.
- `pnpm run prisma:local`: Run Prisma commands with local environment variables (e.g., migrations).
- `pnpm run db:seed`: Seed the local database.
- `pnpm run db:migrate`: Run Prisma migrations for local development.
- `pnpm run db:reset`: Reset the local database (with confirmation prompt).
- `pnpm run prisma:studio:local`: Open Prisma Studio to interact with your local database.
- `pnpm run cron:local`: Run the local cron job for updating GAC scores.

**Note:** Always use caution when running database reset, seeding, or migration scripts, especially in a production environment.

## Project Structure

- **`app/`**: Next.js App Router pages and layouts.
- **`lib/`**: Core application logic, components, and utilities.
  - **`lib/components/`**: React components used throughout the app.
    - **`chat/`**: Components related to the AI chat interface (e.g., `AIChat.tsx`, `ConstitutionalAIChat.tsx`).
    - **`flow/`**: Components for the community model creation flow (e.g., `CommunityModelFlow.tsx`, `PrinciplesZone.tsx`).
  - **`lib/actions.ts`**: Server actions for data operations, including database interactions and API calls.
  - **`lib/utils/`**: Utility functions (e.g., `uploader.ts` for handling file uploads).
  - **`lib/types.ts`**: TypeScript type definitions used across the app.
- **`prisma/`**: Database schema and migrations.
- **`public/`**: Static assets (images, icons, etc.).
- **`styles/`**: Global CSS styles and Tailwind CSS configuration.
- **`functions/`**: Contains serverless functions, including `update-gac-scores.ts` for the cron job.
- **`scripts/`**: Utility scripts, including `local-cron.ts` for running the cron job locally.
