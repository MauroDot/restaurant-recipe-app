import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// apiKey/authDomain/projectId/storageBucket are what Auth, Firestore, and Storage
// actually need to initialize. messagingSenderId/appId are optional in Firebase's own
// FirebaseOptions type — they matter for Analytics/FCM, not the SDKs this app uses —
// so they're read but not required here.
const requiredEnvVars = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

function assertFirebaseEnv(
  vars: typeof requiredEnvVars,
): asserts vars is Record<keyof typeof requiredEnvVars, string> {
  const missing = Object.entries(vars)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Firebase environment variables: ${missing
        .map((key) => `NEXT_PUBLIC_FIREBASE_${key.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`)
        .join(", ")}. Check .env.local.`,
    );
  }
}

assertFirebaseEnv(requiredEnvVars);

const firebaseConfig: FirebaseOptions = {
  ...requiredEnvVars,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Avoid re-initializing the app on hot reload / multiple imports.
const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
