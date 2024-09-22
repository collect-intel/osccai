const { execSync } = require('child_process');
const readline = require('readline');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`Database URL: ${process.env.DATABASE_URL}`);

rl.question('Are you sure you want to reset the database? This will delete all data. (y/N) ', (answer) => {
  if (answer.toLowerCase() === 'y') {
    console.log('Resetting database...');
    try {

      // Push the schema from schema.prisma
      console.log('Pushing schema to database...');
      execSync('npx prisma db push --force-reset', { stdio: 'inherit' });

      console.log('Database schema applied.');
      console.log('Running seed script...');

      // Run the seed script
      execSync('node -r ts-node/register prisma/seed.ts', { stdio: 'inherit' });

      console.log('Seed complete.');
    } catch (error) {
      console.error('An error occurred:', error.stack || error.message);
      process.exit(1);
    }
  } else {
    console.log('Database reset cancelled.');
  }
  rl.close();
});
