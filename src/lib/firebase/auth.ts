import { getAuth, onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { isAdminEmail } from "@/config/firebase-admins";
import { getFirebaseApp } from "@/lib/firebase/client";

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export async function ensurePublicFirebaseSession() {
  const auth = getFirebaseAuth();
  if (auth.currentUser?.isAnonymous || isAdminEmail(auth.currentUser?.email)) return auth.currentUser;
  if (auth.currentUser) await signOut(auth);
  return (await signInAnonymously(auth)).user;
}

export { onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut };