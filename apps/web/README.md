# Community Models (OSCCAI) Web App

## Database Migration Setup

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

This process ensures that Prisma knows about your existing schema and won't try to recreate tables when running future migrations.
