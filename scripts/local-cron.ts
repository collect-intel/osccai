import updateGACScores from "../functions/update-gac-scores.js";

const INTERVAL_MS = 60000; // 1 minute in milliseconds

async function runCron() {
  console.log("Running updateGACScores...");
  await updateGACScores();
  console.log("Finished running updateGACScores");
}

console.log("Starting local cron job for updateGACScores");
setInterval(runCron, INTERVAL_MS);
runCron(); // Run once immediately on startup
