import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let firestoreDb: Firestore | null = null;

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
} catch (err) {
  console.warn('Firebase Admin initialization notice:', err);
}

export { firestoreDb };
