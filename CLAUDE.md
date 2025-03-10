# OSCCAI Development Guide

## Commands

- Web dev: `pnpm web dev:local`
- Web build: `pnpm web build`
- Web lint: `pnpm web lint`
- Web DB: `pnpm web db:migrate`, `pnpm web prisma:studio:local`
- CS build: `pnpm consensus-service build`
- CS test: `pnpm consensus-service test`
- CS run GAC: `pnpm consensus-service gac:local`

## Project Structure

- `apps/web`: Next.js frontend (App Router)
- `apps/consensus-service`: Python consensus service

## Code Style

- TypeScript: Strict mode with proper types for all variables/functions
- React: Functional components with hooks
- CSS: Tailwind for styling
- Python: Standard conventions with pytest for testing
- Naming: camelCase for JS/TS variables/functions, PascalCase for components
- Error handling: Use try/catch blocks with appropriate error messages
- Imports: Group by external/internal, alphabetize within groups

This project is a monorepo using pnpm workspaces with Next.js for frontend and Python for backend services. The web app uses Prisma ORM for database management.
