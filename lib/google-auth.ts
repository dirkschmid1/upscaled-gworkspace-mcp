import { google } from 'googleapis';
import { getTokenByEmail, upsertToken } from './supabase';

const SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
];

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`
  );
}

export function getAuthUrl(state?: string): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: state || '',
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);

  // Get user email
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const userInfo = await oauth2.userinfo.get();
  const email = userInfo.data.email!;

  // Store in Supabase
  await upsertToken({
    user_email: email,
    access_token: tokens.access_token || null,
    refresh_token: tokens.refresh_token!,
    token_expiry: tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : null,
    scopes: tokens.scope || null,
  });

  return { email, tokens };
}

export async function getAuthenticatedClient(userEmail: string) {
  const tokenRecord = await getTokenByEmail(userEmail);
  if (!tokenRecord) {
    throw new Error(
      `No tokens found for ${userEmail}. User must authorize first at ${process.env.NEXT_PUBLIC_BASE_URL}/auth/login`
    );
  }

  const client = getOAuth2Client();
  client.setCredentials({
    refresh_token: tokenRecord.refresh_token,
    access_token: tokenRecord.access_token || undefined,
  });

  // Auto-refresh: listen for new tokens
  client.on('tokens', async (newTokens) => {
    await upsertToken({
      user_email: userEmail,
      access_token: newTokens.access_token || tokenRecord.access_token,
      refresh_token:
        newTokens.refresh_token || tokenRecord.refresh_token,
      token_expiry: newTokens.expiry_date
        ? new Date(newTokens.expiry_date).toISOString()
        : tokenRecord.token_expiry,
      scopes: newTokens.scope || tokenRecord.scopes,
    });
  });

  return client;
}
