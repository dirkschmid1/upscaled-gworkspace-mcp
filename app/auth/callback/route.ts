import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/google-auth';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');

  if (error) {
    return new NextResponse(
      `<html><body style="font-family:Arial;padding:40px;text-align:center">
        <h1>❌ Autorisierung abgelehnt</h1>
        <p>${error}</p>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  if (!code) {
    return new NextResponse('Missing code', { status: 400 });
  }

  try {
    const { email } = await exchangeCodeForTokens(code);

    return new NextResponse(
      `<html><body style="font-family:Arial;padding:40px;text-align:center">
        <h1>✅ Verbindung erfolgreich!</h1>
        <p><strong>${email}</strong> ist jetzt mit dem Google Workspace MCP Server verbunden.</p>
        <p>Claude hat jetzt Zugriff auf:</p>
        <ul style="list-style:none;padding:0;font-size:18px">
          <li>📧 Gmail (lesen, Drafts erstellen, Labels)</li>
          <li>📅 Google Calendar (lesen, Termine erstellen/ändern)</li>
          <li>📁 Google Drive (suchen, lesen, Docs erstellen)</li>
        </ul>
        <p>Du kannst dieses Fenster schließen und Claude verwenden.</p>
        <p style="color:#888;margin-top:40px">Die Verbindung bleibt bestehen bis du sie widerrufst.</p>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (err: any) {
    return new NextResponse(
      `<html><body style="font-family:Arial;padding:40px;text-align:center">
        <h1>❌ Fehler</h1>
        <p>${err.message}</p>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}
