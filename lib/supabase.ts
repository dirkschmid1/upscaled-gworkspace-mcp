import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface TokenRecord {
  user_email: string;
  access_token: string | null;
  refresh_token: string;
  token_expiry: string | null;
  scopes: string | null;
}

export async function getTokenByEmail(
  email: string
): Promise<TokenRecord | null> {
  const { data, error } = await supabase
    .from('google_mcp_tokens')
    .select('*')
    .eq('user_email', email)
    .single();

  if (error || !data) return null;
  return data as TokenRecord;
}

export async function upsertToken(token: TokenRecord): Promise<void> {
  const { error } = await supabase.from('google_mcp_tokens').upsert(
    {
      user_email: token.user_email,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      token_expiry: token.token_expiry,
      scopes: token.scopes,
    },
    { onConflict: 'user_email' }
  );

  if (error) throw new Error(`Token upsert failed: ${error.message}`);
}

export async function deleteToken(email: string): Promise<void> {
  await supabase
    .from('google_mcp_tokens')
    .delete()
    .eq('user_email', email);
}
