import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // something.... TODO!!!
    const constitutions = await prisma.constitution.findMany({
      include: {
        communityModel: {
          select: {
            name: true,
            initialIdea: true,
          },
        },
      },
    });

    return NextResponse.json(constitutions);
  } catch (error) {
    console.error('Error fetching constitutions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}