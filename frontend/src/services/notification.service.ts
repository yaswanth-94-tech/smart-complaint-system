import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { AppNotification } from '../types/notification';

// Create a new notification document in Firestore
export async function createNotification(
  data: Omit<AppNotification, 'id'>
): Promise<string> {
  const ref = collection(db, 'notifications');
  const docRef = await addDoc(ref, data);
  return docRef.id;
}

// Fetch notifications for a specific user
export async function getUserNotifications(userId: string): Promise<AppNotification[]> {
  try {
    const ref = collection(db, 'notifications');
    const q = query(
      ref,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const notifications: AppNotification[] = [];

    snapshot.forEach((docSnap) => {
      notifications.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<AppNotification, 'id'>),
      });
    });

    return notifications;
  } catch (error) {
    console.warn('Firestore notification index fallback:', error);
    const ref = collection(db, 'notifications');
    const q = query(ref, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const notifications: AppNotification[] = [];

    snapshot.forEach((docSnap) => {
      notifications.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<AppNotification, 'id'>),
      });
    });

    return notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

// Mark a single notification as read
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const docRef = doc(db, 'notifications', notificationId);
  await updateDoc(docRef, { read: true });
}

// Mark all notifications for a user as read
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const ref = collection(db, 'notifications');
  const q = query(ref, where('userId', '==', userId), where('read', '==', false));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.forEach((docSnap) => {
    batch.update(docSnap.ref, { read: true });
  });

  await batch.commit();
}
