import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { modelId: string } }
) {
  try {
    const { modelId } = params;

    // For now, we'll use the demo data regardless of the modelId
    // In the future, you might want to use this ID to fetch specific data
    const demoData = {
      id: modelId,
      userId: "DEMO",
      name: "TipTap Demo",
      initialMessage: "Hello!!!.",
      timeCreated: "2024-09-12T16:40:36.238Z",
      timeModified: "2024-09-12T16:47:38.220Z",
      refinedPrimers: {
        key: "05bbf3cdee0be98737aa5055b7602812",
        distilled_purpose: "n/a",
        distilled_instructions: "n/a",
        filtering_instructions: "n/a"
      }
    };

    return NextResponse.json(demoData);
  } catch (error) {
    console.error('Error fetching community model data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}