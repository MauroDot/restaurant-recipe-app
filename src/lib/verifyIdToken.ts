import "server-only";

import jwt from "jsonwebtoken";

// firebase-admin's dependency chain (jwks-rsa -> its own transitive deps)
// hits an ESM/CommonJS interop error under Vercel's serverless bundling, so
// ID tokens are verified manually here instead: decode the token to find
// which Google-published public key signed it, then check the RS256
// signature plus issuer/audience/expiry ourselves.
const CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

type CertCache = { certs: Record<string, string>; expiresAt: number };
let certCache: CertCache | null = null;

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  if (certCache && certCache.expiresAt > Date.now()) {
    return certCache.certs;
  }

  const res = await fetch(CERTS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Firebase public keys: ${res.status}`);
  }
  const certs = (await res.json()) as Record<string, string>;

  // Respect the endpoint's advertised cache lifetime instead of refetching
  // on every request; fall back to a conservative default if the header is
  // missing or unparseable.
  const cacheControl = res.headers.get("cache-control") ?? "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;

  certCache = { certs, expiresAt: Date.now() + maxAgeSeconds * 1000 };
  return certs;
}

export type VerifiedIdToken = {
  uid: string;
  email: string | null;
};

/**
 * Verifies a Firebase Auth ID token server-side without firebase-admin.
 *
 * Throws on ANY failure — missing/malformed token, unknown signing key, bad
 * signature, wrong issuer/audience, or expiry. There is deliberately no
 * "accept anyway if verification fails" fallback: that would make this
 * function pure theater and let an unauthenticated caller through exactly
 * as before it existed. Callers must treat any throw as unauthenticated and
 * respond 401.
 */
export async function verifyFirebaseIdToken(
  idToken: string
): Promise<VerifiedIdToken> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured.");
  }

  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || typeof decoded === "string" || !decoded.header.kid) {
    throw new Error("Malformed ID token.");
  }

  const certs = await getGooglePublicCerts();
  const cert = certs[decoded.header.kid];
  if (!cert) {
    throw new Error("Unknown signing key.");
  }

  const payload = jwt.verify(idToken, cert, {
    algorithms: ["RS256"],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  });

  if (typeof payload === "string" || !payload.sub) {
    throw new Error("Invalid token payload.");
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === "string" ? payload.email : null,
  };
}
