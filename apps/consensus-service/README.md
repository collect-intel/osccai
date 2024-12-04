# Consensus Service

This service handles the Group-Aware Consensus (GAC) score calculations for Community Models statements. It runs both as a Vercel serverless function (for production) and as local scripts for development and debugging.

## GAC Score Updates

The `update_gac_scores.py` script calculates GAC scores for statements based on participant votes. In production, it runs as a Vercel cron job that automatically processes polls with new or updated votes.

### How It Works

1. The script identifies polls that need GAC score updates by:

   - Finding polls with statements that have never been calculated
   - Finding polls with new or updated votes since last calculation

2. For each identified poll, it:
   - Fetches all statements, votes, and participants
   - Generates a vote matrix (participants × statements)
   - Imputes missing votes using Jaccard similarity
   - Performs clustering to identify voting groups
   - Calculates GAC scores considering group consensus
   - Updates statement records with new scores

### Available Commands

Run these commands from the project root:

```bash
# Run GAC updates on all polls in local DB (modifies data)
pnpm consensus-service gac:local

# Run GAC updates on a specific poll in local DB (modifies data)
pnpm consensus-service gac:local:poll "your-poll-id"

# Show GAC calculations for local DB without modifying data
pnpm consensus-service gac:local:dry

# Show GAC calculations for specific poll in local DB (no data changes)
pnpm consensus-service gac:local:poll:dry "your-poll-id"

# Show GAC calculations for specific poll in prod DB (no data changes)
pnpm consensus-service gac:prod:poll:dry "your-poll-id"
```

### Production Deployment

In production, `update_gac_scores.py` runs as a Vercel serverless function, triggered by:

1. A cron job defined in `vercel.json` that runs periodically
2. Manual triggers via the Vercel function URL

The script uses environment variables for database configuration:

- Local development uses `.env.local`
- Production uses `.env` (managed by Vercel)

### Development Setup

1. Install dependencies:

```bash
pnpm install
```

2. Build Python packages:

```bash
pnpm consensus-service build
```

3. Set up your `.env.local` with the required database URL:

```
DATABASE_URL=your_local_database_url
```
