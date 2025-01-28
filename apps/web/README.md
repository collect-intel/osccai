# Community Models (OSCCAI) Web App

## Database Management

### Local Development

1. **Reset and test migrations locally:**

   ```bash
   # Reset local database to a clean state and reapply migrations
   pnpm run db:reset

   # If you encounter issues with missing columns or schema mismatches:
   cd apps/web
   npx prisma migrate reset --force  # Reset DB and reapply migrations
   npx prisma generate              # Regenerate Prisma client
   npx prisma db push --force-reset # Force sync DB with schema
   cd ../..

   # Restart the dev server
   pnpm web dev:local

   # Inspect database changes
   pnpm run prisma:studio:local
   ```

2. **Create new migrations:**
   ```bash
   # Generate a new migration after schema changes
   pnpm run db:migrate
   ```

### Production Database Management

1. **Before deploying migrations:**

   ```bash
   # Always test migrations locally first
   pnpm run db:reset

   # Backup production database (via Supabase dashboard)

   # Check current migration status
   pnpm run db:status:prod
   ```

2. **Deploy migrations to production:**

   ```bash
   # This will prompt for confirmation
   pnpm run db:migrate:prod
   ```

3. **Verify production changes:**

   ```bash
   # Check migration status
   pnpm run db:status:prod

   # Optionally inspect database
   pnpm run prisma:studio:prod
   ```

### Important Notes

- Always test migrations locally before applying to production
- Production migrations require confirmation to prevent accidental execution
- After production migrations, redeploy your Vercel application to ensure the Prisma client is updated
- The `db:migrate:prod` command includes safety prompts for production database changes
- Use `prisma:studio:prod` with caution as it provides direct access to production data
- Never use `--force-reset` or destructive commands on production
- Always ensure migrations are additive and preserve existing data
- Take a backup of the production database before applying migrations
- Test migrations locally with production-like data when possible

### Initial Production Database Setup

When setting up Prisma migrations on a new production database that already has tables:

1. Create the migrations tracking table in Supabase SQL Editor:

```sql
CREATE TABLE "_prisma_migrations" (
    id                      VARCHAR(36) PRIMARY KEY NOT NULL,
    checksum                VARCHAR(64) NOT NULL,
    finished_at             TIMESTAMP WITH TIME ZONE,
    migration_name          VARCHAR(255) NOT NULL,
    logs                    TEXT,
    rolled_back_at          TIMESTAMP WITH TIME ZONE,
    started_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    applied_steps_count     INTEGER NOT NULL DEFAULT 0
);
```

2. Mark the initial migration as applied:

```bash
pnpm run db:init:prod
```

3. Verify the migration status:

```bash
pnpm run db:status:prod
```
