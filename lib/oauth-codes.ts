import crypto from "crypto";

export function makeCode(redirectUri: string, codeChallenge: string): string {
  const payload = JSON.stringify({ redirectUri, codeChallenge, exp: Date.now() + 300000 });
  const b64 = Buffer.from(payload).toString("base64url");
  const sig = crypto.createHmac("sha256", process.env.AUTH_SECRET || "secret").update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export function verifyCode(code: string): { redirectUri: string; codeChallenge: string } | null {
  const [b64, sig] = code.split(".");
  if (!b64 || !sig) return null;
  const expected = crypto.createHmac("sha256", process.env.AUTH_SECRET || "secret").update(b64).digest("base64url");
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}
