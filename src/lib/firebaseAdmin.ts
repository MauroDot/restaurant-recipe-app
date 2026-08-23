import "server-only";

import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";

function getAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) {
    return existing[0]!;
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // Service account private keys are typically stored in env vars with
  // literal "\n" escape sequences — un-escape them into real newlines.
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentials are not configured. Set FIREBASE_ADMIN_CLIENT_EMAIL " +
        "and FIREBASE_ADMIN_PRIVATE_KEY (NEXT_PUBLIC_FIREBASE_PROJECT_ID is reused for projectId)."
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

/**
 * Verifies a Firebase Auth ID token server-side. Throws if the token is
 * missing, expired, malformed, or otherwise invalid — callers should treat
 * any rejection as "unauthenticated" and respond 401.
 */
export async function verifyIdToken(idToken: string): Promise<DecodedIdToken> {
  return getAuth(getAdminApp()).verifyIdToken(idToken);
}
