import { NextRequest, NextResponse } from "next/server";
import { makeCode } from "@/lib/oauth-codes";

export async function GET(req: NextRequest) {
  const redirectUri = req.nextUrl.searchParams.get("redirect_uri") || "";
  const state = req.nextUrl.searchParams.get("state") || "";
  const codeChallenge = req.nextUrl.searchParams.get("code_challenge") || "";

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Google Workspace MCP — Authorize</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#0a0a0a;color:#fff}
  .card{background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:2rem;max-width:400px;width:90%}
  h1{font-size:1.3rem;margin:0 0 .5rem}
  p{color:#888;font-size:.9rem;margin:0 0 1.5rem}
  input{width:100%;padding:.75rem;border:1px solid #333;border-radius:8px;background:#111;color:#fff;font-size:1rem;box-sizing:border-box;margin-bottom:1rem}
  button{width:100%;padding:.75rem;border:none;border-radius:8px;background:#3b82f6;color:#fff;font-size:1rem;cursor:pointer}
  button:hover{background:#2563eb}
</style></head>
<body><div class="card">
  <h1>🔐 Google Workspace MCP</h1>
  <p>Enter the access password to connect.</p>
  <form method="POST" action="/api/oauth/authorize">
    <input type="hidden" name="redirect_uri" value="${redirectUri}">
    <input type="hidden" name="state" value="${state}">
    <input type="hidden" name="code_challenge" value="${codeChallenge}">
    <input type="password" name="password" placeholder="Password" autofocus required>
    <button type="submit">Authorize</button>
  </form>
</div></body></html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}

export async function POST(req: NextRequest) {
  const ct = req.headers.get("content-type") || "";
  let password = "", redirectUri = "", state = "", codeChallenge = "";
  if (ct.includes("multipart/form-data") || ct.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    password = (form.get("password") as string) || "";
    redirectUri = (form.get("redirect_uri") as string) || "";
    state = (form.get("state") as string) || "";
    codeChallenge = (form.get("code_challenge") as string) || "";
  } else {
    const text = await req.text();
    const params = new URLSearchParams(text);
    password = params.get("password") || "";
    redirectUri = params.get("redirect_uri") || "";
    state = params.get("state") || "";
    codeChallenge = params.get("code_challenge") || "";
  }

  const secret = process.env.AUTH_SECRET || "";
  if (password.trim() !== secret.trim() || !secret) {
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Google Workspace MCP — Authorize</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#0a0a0a;color:#fff}
  .card{background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:2rem;max-width:400px;width:90%}
  h1{font-size:1.3rem;margin:0 0 .5rem}
  .err{color:#ef4444;font-size:.85rem;margin-bottom:1rem}
  input{width:100%;padding:.75rem;border:1px solid #333;border-radius:8px;background:#111;color:#fff;font-size:1rem;box-sizing:border-box;margin-bottom:1rem}
  button{width:100%;padding:.75rem;border:none;border-radius:8px;background:#3b82f6;color:#fff;font-size:1rem;cursor:pointer}
</style></head>
<body><div class="card">
  <h1>🔐 Google Workspace MCP</h1>
  <div class="err">Invalid password. Try again.</div>
  <form method="POST" action="/api/oauth/authorize">
    <input type="hidden" name="redirect_uri" value="${redirectUri}">
    <input type="hidden" name="state" value="${state}">
    <input type="hidden" name="code_challenge" value="${codeChallenge}">
    <input type="password" name="password" placeholder="Password" autofocus required>
    <button type="submit">Authorize</button>
  </form>
</div></body></html>`;
    return new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html" } });
  }

  const code = makeCode(redirectUri, codeChallenge);
  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);
  return NextResponse.redirect(url.toString(), 302);
}
