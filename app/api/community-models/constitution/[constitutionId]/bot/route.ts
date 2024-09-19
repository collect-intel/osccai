import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { constitutionId: string } }
) {
  try {
    const { constitutionId } = params;

    const constitution = await prisma.constitution.findUnique({
      where: { uid: constitutionId },
    });

    if (!constitution) {
      return NextResponse.json({ error: 'Constitution not found' }, { status: 404 });
    }

    const botData = {
      id: constitutionId,
      userId: "DEMO",
      name: "Constitution Demo",
      initialMessage: "Hello! I'm here to help with questions about this constitution.",
      timeCreated: constitution.createdAt.toISOString(),
      timeModified: constitution.updatedAt.toISOString(),
      constitution: constitution.content,
      refinedPrimers: {
        key: "05bbf3cdee0be98737aa5055b7602812",
        distilled_purpose: "n/a",
        distilled_instructions: "n/a",
        filtering_instructions: "n/a"
      }
    };

    return NextResponse.json(botData);
  } catch (error) {
    console.error('Error fetching constitution bot data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}