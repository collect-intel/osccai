import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET() {
  try {
    const { stdout, stderr } = await execAsync(
      "python scripts/update-gac-scores.py",
    );
    console.log("Update GAC Scores script output:", stdout);

    if (stderr) console.error("Update GAC Scores script error:", stderr);

    return NextResponse.json({ message: "GAC scores updated successfully" });
  } catch (error) {
    console.error("Error updating GAC scores:", error);

    return NextResponse.json(
      { error: "Failed to update GAC scores" },
      { status: 500 },
    );
  }
}
