// app/api/download-comp/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Path to the Comp.tsx file
    const filePath = path.join(process.cwd(), 'app', 'Generated_Page', 'comp.tsx');
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Read the file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Create response with file content
    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/typescript',
        'Content-Disposition': 'attachment; filename="Comp.tsx"',
      },
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}