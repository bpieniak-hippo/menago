#!/usr/bin/env node
// Jednorazowy skrypt do uzyskania GOOGLE_REFRESH_TOKEN dla Agenta Promo.
//
// Użycie:
//   1. W Google Cloud Console (console.cloud.google.com) utwórz OAuth client
//      typu "Web application", dodaj Authorized redirect URI:
//      http://localhost:53682/oauth2callback
//      Włącz Gmail API dla projektu.
//   2. GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... node scripts/google-oauth.mjs
//   3. Otwórz wypisany link, zaloguj się kontem Gmail, którego ma używać Menago.
//   4. Skrypt wypisze GOOGLE_REFRESH_TOKEN — wklej go do .env.local / Vercel.

import http from "node:http";
import { google } from "googleapis";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = "http://localhost:53682/oauth2callback";

if (!clientId || !clientSecret) {
  console.error(
    "Ustaw GOOGLE_CLIENT_ID i GOOGLE_CLIENT_SECRET w zmiennych środowiskowych przed uruchomieniem.",
  );
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
  ],
});

console.log("\nOtwórz ten link w przeglądarce i zaloguj się:\n");
console.log(authUrl, "\n");

const server = http.createServer(async (req, res) => {
  if (!req.url?.startsWith("/oauth2callback")) {
    res.writeHead(404);
    res.end();
    return;
  }

  const url = new URL(req.url, redirectUri);
  const code = url.searchParams.get("code");

  if (!code) {
    res.writeHead(400);
    res.end("Brak kodu w odpowiedzi.");
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Gotowe — wróć do terminala.");
    console.log("\nGOOGLE_REFRESH_TOKEN=" + tokens.refresh_token + "\n");
    server.close();
  } catch (err) {
    res.writeHead(500);
    res.end("Błąd wymiany kodu na token.");
    console.error(err);
    server.close();
  }
});

server.listen(53682);
