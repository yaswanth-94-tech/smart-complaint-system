import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let firestoreDb: Firestore | null = null;

// Only initialize Firebase Admin Firestore if Google/Firebase Credentials exist
const hasCredentials = Boolean(
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
  process.env.FIREBASE_PRIVATE_KEY
);

if (hasCredentials) {
  try {
    if (!getApps().length) {
      const projectId =
        process.env.VITE_FIREBASE_PROJECT_ID ||
        process.env.FIREBASE_PROJECT_ID ||
        'scms-hackathon';

      initializeApp({
        projectId,
      });
    }
    firestoreDb = getFirestore();
  } catch (err: any) {
    console.warn('Firebase Admin initialization skipped:', err.message || err);
    firestoreDb = null;
  }
} else {
  console.log('[SCMS Backend] Firebase Admin SDK skipped on local (no ADC credentials file). Direct Gemini AI features active.');
}

export { firestoreDb };
