import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { upload } from '@/lib/utils/uploader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save file to temporary location
    const tempPath = join('/tmp', file.name);
    await writeFile(tempPath, buffer);

    // Use the upload function from uploader.ts
    const result = await upload({ 
      filepath: tempPath, 
      originalFilename: file.name, 
      mimetype: file.type,
      size: file.size
    }, 'logo');

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Error uploading file' }, { status: 500 });
  }
}