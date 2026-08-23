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
};

const AuthContext = createContext<AuthContextValue>({
  currentUser: null,
  loading: true,
  profile: null,
  profileLoading: true,
});

// Tags fetched profile data with the uid it belongs to, so "loading" can be
// derived by comparing against the current user instead of being reset via
// a synchronous setState call in the effect body (which triggers
// react-hooks/set-state-in-effect).
type ProfileState = { uid: string; profile: UserProfile | null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileState, setProfileState] = useState<ProfileState | null>(null);

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

  return (
    <AuthContext.Provider
      value={{ currentUser, loading, profile, profileLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
