import { spawn } from 'child_process';
import path from 'path';

console.log('Starting local cron job simulation for update_gac_scores.py');

const pythonScriptPath = path.join(process.cwd(), 'api', 'cron', 'update-gac-scores.py');

function runPythonScript() {
  console.log(`Running update_gac_scores.py at ${new Date().toISOString()}`);

  const pythonProcess = spawn('python', [pythonScriptPath]);

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Stdout: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Stderr: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python script exited with code ${code}`);
  });
}

// Run the script immediately
runPythonScript();

// Schedule the script to run every minute
setInterval(runPythonScript, 20000);

console.log('Cron job simulation is running. Press Ctrl+C to stop.');
