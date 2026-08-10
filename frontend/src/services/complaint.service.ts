import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { Complaint, ComplaintUpdate, ComplaintStatus } from '../types/complaint';
import { createNotification } from './notification.service';

// Upload optional image to Firebase Storage
export async function uploadComplaintImage(file: File, userId: string): Promise<string> {
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `complaints/${userId}/${Date.now()}_${sanitizedFileName}`;
  const storageRef = ref(storage, storagePath);

  const snapshot = await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}

// Create new complaint in Firestore and log initial status in complaint_updates
export async function createComplaint(
  complaintData: Omit<Complaint, 'id'>,
  userName: string
): Promise<string> {
  const complaintsRef = collection(db, 'complaints');
  const docRef = await addDoc(complaintsRef, complaintData);

  // Initial timeline record
  const updatesRef = collection(db, 'complaint_updates');
  await addDoc(updatesRef, {
    complaintId: docRef.id,
    status: 'SUBMITTED',
    message: 'Complaint submitted by student.',
    updatedBy: userName || 'Student',
    updatedByRole: 'student',
    createdAt: complaintData.createdAt,
  });

  return docRef.id;
}

// Fetch complaints for a specific student user
export async function getUserComplaints(userId: string): Promise<Complaint[]> {
  try {
    const complaintsRef = collection(db, 'complaints');
    const q = query(
      complaintsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const complaints: Complaint[] = [];

    snapshot.forEach((docSnap) => {
      complaints.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Complaint, 'id'>),
      });
    });

    return complaints;
  } catch (error) {
    console.warn('Firestore index query fallback, fetching unindexed user complaints:', error);
    const complaintsRef = collection(db, 'complaints');
    const q = query(complaintsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const complaints: Complaint[] = [];

    snapshot.forEach((docSnap) => {
      complaints.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Complaint, 'id'>),
      });
    });

    return complaints.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

// Fetch ALL complaints across all students/departments (Admin)
export async function getAllComplaints(): Promise<Complaint[]> {
  const complaintsRef = collection(db, 'complaints');
  const snapshot = await getDocs(complaintsRef);
  const complaints: Complaint[] = [];

  snapshot.forEach((docSnap) => {
    complaints.push({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Complaint, 'id'>),
    });
  });

  return complaints.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Fetch complaints assigned to a specific department (Department Staff)
export async function getDepartmentComplaints(departmentName: string): Promise<Complaint[]> {
  try {
    const complaintsRef = collection(db, 'complaints');
    const q = query(
      complaintsRef,
      where('department', '==', departmentName),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const complaints: Complaint[] = [];

    snapshot.forEach((docSnap) => {
      complaints.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Complaint, 'id'>),
      });
    });

    return complaints;
  } catch (error) {
    console.warn('Firestore index fallback for department complaints:', error);
    const complaintsRef = collection(db, 'complaints');
    const q = query(complaintsRef, where('department', '==', departmentName));
    const snapshot = await getDocs(q);
    const complaints: Complaint[] = [];

    snapshot.forEach((docSnap) => {
      complaints.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Complaint, 'id'>),
      });
    });

    return complaints.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

// Fetch a single complaint by ID
export async function getComplaintById(complaintId: string): Promise<Complaint | null> {
  const docRef = doc(db, 'complaints', complaintId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as Omit<Complaint, 'id'>),
  };
}

// Fetch status progression timeline from complaint_updates collection
export async function getComplaintTimeline(complaintId: string): Promise<ComplaintUpdate[]> {
  try {
    const updatesRef = collection(db, 'complaint_updates');
    const q = query(
      updatesRef,
      where('complaintId', '==', complaintId),
      orderBy('createdAt', 'asc')
    );

    const snapshot = await getDocs(q);
    const updates: ComplaintUpdate[] = [];

    snapshot.forEach((docSnap) => {
      updates.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<ComplaintUpdate, 'id'>),
      });
    });

    return updates;
  } catch (error) {
    console.warn('Firestore timeline index query fallback:', error);
    const updatesRef = collection(db, 'complaint_updates');
    const q = query(updatesRef, where('complaintId', '==', complaintId));
    const snapshot = await getDocs(q);
    const updates: ComplaintUpdate[] = [];

    snapshot.forEach((docSnap) => {
      updates.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<ComplaintUpdate, 'id'>),
      });
    });

    return updates.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

// Update complaint status, optional department/priority, and log timeline event
export async function updateComplaintStatus(
  complaintId: string,
  newStatus: ComplaintStatus,
  message: string,
  updatedBy: string,
  updatedByRole: 'admin' | 'department_staff' | 'student',
  extraUpdates?: Partial<Complaint>
): Promise<void> {
  const now = new Date().toISOString();
  const complaintDocRef = doc(db, 'complaints', complaintId);

  // Fetch complaint details before update to obtain owner userId and title
  let ownerUserId: string | null = null;
  let complaintTitle: string = 'Complaint';

  try {
    const snap = await getDoc(complaintDocRef);
    if (snap.exists()) {
      const data = snap.data();
      ownerUserId = data.userId || null;
      complaintTitle = data.title || 'Complaint';
    }
  } catch (err) {
    console.warn('Failed to fetch complaint details for notification:', err);
  }

  const fieldsToUpdate: Record<string, any> = {
    status: newStatus,
    updatedAt: now,
    ...extraUpdates,
  };

  if (newStatus === 'RESOLVED') {
    fieldsToUpdate.resolvedAt = now;
  }

  await updateDoc(complaintDocRef, fieldsToUpdate);

  // Append to complaint_updates collection
  const updatesRef = collection(db, 'complaint_updates');
  await addDoc(updatesRef, {
    complaintId,
    status: newStatus,
    message,
    updatedBy,
    updatedByRole,
    createdAt: now,
  });

  // Trigger in-app notification to student owner
  if (ownerUserId) {
    try {
      await createNotification({
        userId: ownerUserId,
        title: `Status Updated: ${newStatus}`,
        message: `Your complaint "${complaintTitle}" was updated to ${newStatus}: ${message}`,
        type: 'STATUS_CHANGE',
        complaintId,
        read: false,
        createdAt: now,
      });
    } catch (notifErr) {
      console.warn('Failed to create in-app notification:', notifErr);
    }
  }
}
