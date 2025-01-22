// apps/web/app/api/models/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      error: "This endpoint is not implemented. Please use the web interface to create Community Models.",
      docs_url: "/docs/api"
    },
    { status: 501 }
  );
}