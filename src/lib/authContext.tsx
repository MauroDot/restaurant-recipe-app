"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type UserProfile = {
  restaurantId: string;
  email: string | null;
};

type AuthContextValue = {
  currentUser: User | null;
  loading: boolean;
  profile: UserProfile | null;
  profileLoading: boolean;
  /**
   * True once the signed-in user's ID token actually carries a
   * `restaurantId` custom claim matching their profile. A Cloud Function
   * mirrors users/{uid}.restaurantId onto the token asynchronously (see
   * functions/src/index.ts), so there's a brief window after signup/first
   * load where this is false even though `profile` is already populated —
   * gate claim-dependent features (Storage access) on this, not on
   * `profile` alone.
   */
  claimsReady: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  currentUser: null,
  loading: true,
  profile: null,
  profileLoading: true,
  claimsReady: false,
});

// Tags fetched profile data with the uid it belongs to, so "loading" can be
// derived by comparing against the current user instead of being reset via
// a synchronous setState call in the effect body (which triggers
// react-hooks/set-state-in-effect).
type ProfileState = { uid: string; profile: UserProfile | null };
type ClaimsState = { uid: string; ready: boolean };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileState, setProfileState] = useState<ProfileState | null>(null);
  const [claimsState, setClaimsState] = useState<ClaimsState | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Once a user is signed in, keep their users/{uid} profile doc (which
  // carries restaurantId) in sync — this is the single source of truth for
  // restaurantId used across the dashboard.
  useEffect(() => {
    if (!currentUser) {
      return;
    }
    const uid = currentUser.uid;
    const unsubscribe = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        const data = snap.data();
        setProfileState({
          uid,
          profile: data
            ? { restaurantId: data.restaurantId, email: data.email ?? null }
            : null,
        });
      },
      () => {
        setProfileState({ uid, profile: null });
      }
    );
    return unsubscribe;
  }, [currentUser]);

  const profile =
    currentUser && profileState?.uid === currentUser.uid
      ? profileState.profile
      : null;
  const profileLoading = currentUser
    ? profileState?.uid !== currentUser.uid
    : false;

  // A claim set by the Cloud Function after the profile doc is written does
  // not appear in an already-issued ID token — force a refresh, and retry
  // with a short backoff since the function needs a moment to fire. Inlined
  // into the effect (no useCallback-by-reference call, no impure work in
  // the render body) per this project's React Compiler lint rules.
  useEffect(() => {
    if (!currentUser || !profile) return;
    let cancelled = false;

    (async () => {
      let result = await currentUser.getIdTokenResult();
      const backoffMs = [500, 1000, 1500, 2000, 3000];
      let attempt = 0;
      while (
        result.claims.restaurantId !== profile.restaurantId &&
        attempt < backoffMs.length &&
        !cancelled
      ) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs[attempt]));
        if (cancelled) return;
        await currentUser.getIdToken(true); // force refresh
        result = await currentUser.getIdTokenResult();
        attempt++;
      }
      if (!cancelled) {
        setClaimsState({
          uid: currentUser.uid,
          ready: result.claims.restaurantId === profile.restaurantId,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser, profile]);

  const claimsReady =
    currentUser && claimsState?.uid === currentUser.uid
      ? claimsState.ready
      : false;

  return (
    <AuthContext.Provider
      value={{ currentUser, loading, profile, profileLoading, claimsReady }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
