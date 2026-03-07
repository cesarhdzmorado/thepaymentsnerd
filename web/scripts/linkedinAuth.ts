#!/usr/bin/env tsx

/**
 * LinkedIn OAuth 2.0 - One-Time Authorization Script
 *
 * Run once to authorize the LinkedIn app and store tokens.
 * After completion, tokens are saved to `.linkedin-tokens.json` at repo root.
 *
 * Usage:
 *   cd web
 *   LINKEDIN_CLIENT_ID=xxx LINKEDIN_CLIENT_SECRET=xxx npx tsx scripts/linkedinAuth.ts
 *
 * Prerequisites:
 *   1. Create a LinkedIn app at https://www.linkedin.com/developers/
 *   2. Add http://localhost:9876/callback as an authorized redirect URL
 *   3. Request the following scopes: openid, profile, w_member_social
 */

import http from "http";
import { URL } from "url";
import crypto from "crypto";
import path from "path";
import fs from "fs";

import type { LinkedInTokens } from "../lib/linkedinClient";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = 9876;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const SCOPES = "w_organization_social r_organization_social";
const TOKEN_FILE = path.resolve(__dirname, "../../.linkedin-tokens.json");

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("❌ Missing environment variables.");
    console.error("   Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET before running.");
    console.error("");
    console.error("   Example:");
    console.error("   LINKEDIN_CLIENT_ID=xxx LINKEDIN_CLIENT_SECRET=xxx npx tsx scripts/linkedinAuth.ts");
    process.exit(1);
  }

  const state = crypto.randomBytes(16).toString("hex");

  const authUrl =
    `${AUTH_URL}?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&state=${encodeURIComponent(state)}`;

  console.log("🔗 LinkedIn OAuth 2.0 Authorization");
  console.log("=".repeat(60));
  console.log("");
  console.log("Open this URL in your browser to authorize:");
  console.log("");
  console.log(authUrl);
  console.log("");

  // Try to open in browser (macOS)
  try {
    const { execSync } = await import("child_process");
    execSync(`open "${authUrl}"`, { stdio: "ignore" });
    console.log("✅ Browser opened automatically.");
  } catch {
    console.log("ℹ️  Copy and paste the URL above into your browser.");
  }

  console.log("⏳ Waiting for callback on http://localhost:" + PORT + "...");
  console.log("");

  // Start local server and wait for callback
  const code = await waitForCallback(state);

  console.log("✅ Authorization code received. Exchanging for tokens...");

  // Exchange code for tokens
  const tokenData = await exchangeCodeForTokens(code, clientId, clientSecret);

  console.log("✅ Tokens received. Fetching person ID...");

  // Fetch person ID
  const personId = await fetchPersonId(tokenData.access_token);

  // Fetch organization IDs (companies the user administers)
  console.log("✅ Fetching organization admin roles...");
  let organizationId: string | undefined;
  try {
    const orgRes = await fetch(
      `https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organizationalTarget))`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    if (orgRes.ok) {
      const orgData = await orgRes.json();
      const elements = orgData.elements || [];
      if (elements.length > 0) {
        // Extract org ID from URN like "urn:li:organization:12345"
        const orgUrn = elements[0].organizationalTarget;
        organizationId = orgUrn.replace("urn:li:organization:", "");
        console.log(`✅ Found organization: ${orgUrn}`);
        if (elements.length > 1) {
          console.log(`   (${elements.length} orgs found — using the first one. Edit .linkedin-tokens.json to change.)`);
          elements.forEach((el: { organizationalTarget: string }, i: number) => {
            console.log(`   [${i}] ${el.organizationalTarget}`);
          });
        }
      } else {
        console.log("⚠️  No organizations found. You may not be an admin of any LinkedIn page.");
      }
    } else {
      console.log(`⚠️  Could not fetch organizations (${orgRes.status}). Continuing without org ID.`);
    }
  } catch (err) {
    console.log("⚠️  Could not fetch organizations. Continuing without org ID.");
  }

  // Save tokens
  const tokens: Record<string, unknown> = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: Date.now() + tokenData.expires_in * 1000,
    person_id: personId,
    ...(organizationId ? { organization_id: organizationId } : {}),
  };

  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), "utf-8");

  const expiryDate = new Date(tokens.expires_at as number).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  console.log("");
  console.log("=".repeat(60));
  console.log("✅ LinkedIn authorization complete!");
  console.log("");
  console.log(`   Person ID:      ${personId}`);
  if (organizationId) console.log(`   Organization ID: ${organizationId}`);
  console.log(`   Token expiry:   ${expiryDate}`);
  console.log(`   Saved to:       ${TOKEN_FILE}`);
  console.log("");
  console.log("You can now run the posting script:");
  console.log("   cd web && npx tsx scripts/linkedinPost.ts --dry-run");
  console.log("=".repeat(60));

  process.exit(0);
}

// ---------------------------------------------------------------------------
// OAuth Helpers
// ---------------------------------------------------------------------------

function waitForCallback(expectedState: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || "/", `http://localhost:${PORT}`);

      if (url.pathname !== "/callback") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
        return;
      }

      const code = url.searchParams.get("code");
      const returnedState = url.searchParams.get("state");
      const error = url.searchParams.get("error");
      const errorDescription = url.searchParams.get("error_description");

      if (error) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`<h1>❌ Authorization Failed</h1><p>${errorDescription || error}</p>`);
        server.close();
        reject(new Error(`LinkedIn OAuth error: ${errorDescription || error}`));
        return;
      }

      if (returnedState !== expectedState) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end("<h1>❌ State mismatch</h1><p>Possible CSRF attack. Try again.</p>");
        server.close();
        reject(new Error("OAuth state mismatch"));
        return;
      }

      if (!code) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end("<h1>❌ No authorization code received</h1>");
        server.close();
        reject(new Error("No authorization code in callback"));
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        "<h1>✅ Authorization successful!</h1>" +
        "<p>You can close this tab and return to the terminal.</p>"
      );
      server.close();
      resolve(code);
    });

    server.listen(PORT, () => {
      // Server is listening
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error("Timed out waiting for OAuth callback (5 minutes)."));
    }, 5 * 60 * 1000);
  });
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${errorText}`);
  }

  return res.json();
}

async function fetchPersonId(accessToken: string): Promise<string> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch person ID (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.sub;
}

main().catch((err) => {
  console.error("❌ Authorization failed:", err.message);
  process.exit(1);
});
