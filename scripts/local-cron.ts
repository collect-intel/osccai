import { exec } from 'child_process';

const INTERVAL_MS = 60000; // 1 minute in milliseconds

function runCron() {
  console.log("Running update_gac_scores.py...");
  exec('python api/cron/update-gac-scores.py', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing Python script: ${error}`);
      return;
    }
    if (stdout) {
      console.log(`Stdout: ${stdout}`);
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
    }
    if (!stdout && !stderr) {
      console.log("No output from Python script");
    }
  });
}

console.log("Starting local cron job for update-gac-scores.py");
setInterval(runCron, INTERVAL_MS);
runCron(); // Run once immediately on startup
