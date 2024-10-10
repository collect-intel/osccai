import { NextResponse } from "next/server";
import updateGACScores from "@/functions/update-gac-scores";

export async function GET(request: Request) {
  try {
    await updateGACScores();
    return NextResponse.json({
      success: true,
      message: "GAC scores updated successfully",
    });
  } catch (error) {
    console.error("Error updating GAC scores:", error);
    return NextResponse.json(
      { success: false, message: "Error updating GAC scores" },
      { status: 500 }
    );
  }
}
