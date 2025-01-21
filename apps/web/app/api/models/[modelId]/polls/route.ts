// apps/web/app/api/models/[modelId]/polls/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { modelId: string } }
) {
  return NextResponse.json(
    {
      error: "This endpoint is not implemented. Please use the web interface to create Polls.",
      docs_url: "/docs/api"
    },
    { status: 501 }
  );
}