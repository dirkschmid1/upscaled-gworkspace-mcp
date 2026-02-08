import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google-auth';

export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get('state') || '';
  const authUrl = getAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
