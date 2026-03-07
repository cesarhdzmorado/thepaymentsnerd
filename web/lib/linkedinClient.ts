/**
 * LinkedIn API Client
 *
 * Handles OAuth token management, token refresh, and posting to LinkedIn.
 * Tokens are stored in `.linkedin-tokens.json` at the repo root (gitignored).
 *
 * Phase 3: Actual LinkedIn posting automation.
 */

import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LinkedInTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp (ms)
  person_id: string;
  organization_id?: string; // For company page posting
}

export interface LinkedInPostResult {
  success: boolean;
  post_id?: string;
  post_url?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const POSTS_ENDPOINT = "https://api.linkedin.com/v2/ugcPosts";
const USERINFO_ENDPOINT = "https://api.linkedin.com/v2/userinfo";
const TOKEN_ENDPOINT = "https://www.linkedin.com/oauth/v2/accessToken";

// Token file lives at repo root (two levels up from web/lib/)
const TOKEN_FILE_PATH = path.resolve(__dirname, "../../.linkedin-tokens.json");

// ---------------------------------------------------------------------------
// Token Management
// ---------------------------------------------------------------------------

/**
 * Read tokens from disk. Throws if file doesn't exist or is malformed.
 */
export function loadTokens(): LinkedInTokens {
  if (!fs.existsSync(TOKEN_FILE_PATH)) {
    throw new Error(
      `LinkedIn tokens not found at ${TOKEN_FILE_PATH}. ` +
      `Run the auth script first: cd web && LINKEDIN_CLIENT_ID=xxx LINKEDIN_CLIENT_SECRET=xxx npx tsx scripts/linkedinAuth.ts`
    );
  }

  const raw = fs.readFileSync(TOKEN_FILE_PATH, "utf-8");
  const tokens = JSON.parse(raw) as LinkedInTokens;

  if (!tokens.access_token || !tokens.person_id) {
    throw new Error("LinkedIn tokens file is malformed — missing access_token or person_id.");
  }

  return tokens;
}

/**
 * Write tokens to disk (after refresh or initial auth).
 */
export function saveTokens(tokens: LinkedInTokens): void {
  fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(tokens, null, 2), "utf-8");
}

/**
 * Check if the access token is expired (with 5-minute buffer).
 */
function isTokenExpired(tokens: LinkedInTokens): boolean {
  const bufferMs = 5 * 60 * 1000;
  return Date.now() >= tokens.expires_at - bufferMs;
}

/**
 * Refresh the access token using the refresh token.
 * LinkedIn access tokens last ~60 days, refresh tokens ~365 days.
 */
async function refreshAccessToken(tokens: LinkedInTokens): Promise<LinkedInTokens> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET environment variables are required for token refresh. " +
      "If your refresh token is also expired, re-run the auth script."
    );
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `LinkedIn token refresh failed (${res.status}): ${errorText}. ` +
      `Re-run the auth script to get new tokens.`
    );
  }

  const data = await res.json();

  const refreshed: LinkedInTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || tokens.refresh_token, // LinkedIn may not return a new refresh token
    expires_at: Date.now() + data.expires_in * 1000,
    person_id: tokens.person_id,
  };

  saveTokens(refreshed);
  console.log("✅ LinkedIn access token refreshed and saved.");

  return refreshed;
}

/**
 * Get a valid access token, refreshing if expired.
 */
export async function getValidTokens(): Promise<LinkedInTokens> {
  let tokens = loadTokens();

  if (isTokenExpired(tokens)) {
    console.log("⏳ LinkedIn access token expired, refreshing...");
    tokens = await refreshAccessToken(tokens);
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// User Info
// ---------------------------------------------------------------------------

/**
 * Fetch the authenticated user's person ID from LinkedIn.
 */
export async function getPersonId(accessToken: string): Promise<string> {
  const res = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`LinkedIn userinfo failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.sub;
}

// ---------------------------------------------------------------------------
// Posting
// ---------------------------------------------------------------------------

/**
 * Create a post on LinkedIn.
 *
 * On 401, attempts one token refresh and retries.
 */
/**
 * Create a post on LinkedIn.
 *
 * If asOrganization is true (default when organization_id exists), posts as the company page.
 * Otherwise posts as the personal profile.
 *
 * On 401, attempts one token refresh and retries.
 */
export async function createPost(text: string, asOrganization?: boolean): Promise<LinkedInPostResult> {
  let tokens = await getValidTokens();

  // Default to organization posting if org ID exists
  const useOrg = asOrganization ?? !!tokens.organization_id;

  if (useOrg && !tokens.organization_id) {
    return {
      success: false,
      error: "No organization_id in tokens. Re-run auth with an app that has Community Management product.",
    };
  }

  const doPost = async (accessToken: string, personId: string): Promise<Response> => {
    const author = useOrg
      ? `urn:li:organization:${tokens.organization_id}`
      : `urn:li:person:${personId}`;

    const body = {
      author,
      lifecycleState: "PUBLISHED",
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text,
          },
          shareMediaCategory: "NONE",
        },
      },
    };

    return fetch(POSTS_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  };

  let res = await doPost(tokens.access_token, tokens.person_id);

  // On 401, try refreshing token once and retry
  if (res.status === 401) {
    console.log("⚠️ LinkedIn returned 401, attempting token refresh...");
    try {
      tokens = await refreshAccessToken(tokens);
      res = await doPost(tokens.access_token, tokens.person_id);
    } catch (refreshErr) {
      return {
        success: false,
        error: `Token refresh failed after 401: ${refreshErr instanceof Error ? refreshErr.message : String(refreshErr)}`,
      };
    }
  }

  if (!res.ok) {
    const errorText = await res.text();
    return {
      success: false,
      error: `LinkedIn API error (${res.status}): ${errorText}`,
    };
  }

  // Extract post ID from response header or body
  const postId = res.headers.get("x-restli-id") || undefined;
  const postUrl = postId
    ? `https://www.linkedin.com/feed/update/${decodeURIComponent(postId)}/`
    : undefined;

  return {
    success: true,
    post_id: postId ? decodeURIComponent(postId) : undefined,
    post_url: postUrl,
  };
}
