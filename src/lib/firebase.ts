import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Auth, GoogleAuthProvider, getAuth, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "casaemharmonia-4df2d";
const configuredAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`;
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "";
const senderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "";

const productionAuthDomain = "tarefasefinanceirodeb.vercel.app";

function resolveAuthDomain(): string {
  if (typeof window !== "undefined" && window.location.hostname === productionAuthDomain) {
    return productionAuthDomain;
  }
  return configuredAuthDomain;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(apiKey && projectId && appId);
}

function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured() || typeof window === "undefined") return null;
  const config = {
    apiKey,
    authDomain: resolveAuthDomain(),
    projectId,
    appId,
    ...(senderId ? { messagingSenderId: senderId } : {}),
  };
  return getApps().length ? getApp() : initializeApp(config);
}

export function getFirebaseServices(): { app: FirebaseApp; auth: Auth; db: Firestore } | null {
  const app = getFirebaseApp();
  if (!app) return null;
  return { app, auth: getAuth(app), db: getFirestore(app) };
}

export async function signInWithGoogle(auth: Auth): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  if (window.matchMedia("(max-width: 700px)").matches) {
    await signInWithRedirect(auth, provider);
    return;
  }
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw error;
  }
}
