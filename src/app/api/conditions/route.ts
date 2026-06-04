import { NextResponse } from 'next/server';
import { retrieveGuidelines } from '@/lib/medicalGuidelines';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    const guidelines = await retrieveGuidelines(query);
    return NextResponse.json({ guidelines });
  } catch (error: any) {
    console.error('Conditions API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
