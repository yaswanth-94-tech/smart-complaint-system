import React, { createContext, useEffect, useState, ReactNode } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserProfile, RegisterStudentData, LoginData } from '../types/user';

export interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  registerStudent: (data: RegisterStudentData) => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch or construct Firestore user profile
  const fetchUserProfile = async (firebaseUser: FirebaseUser): Promise<UserProfile> => {
    const fallbackProfile: UserProfile = {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || 'Student User',
      email: firebaseUser.email || '',
      role: 'student',
      department: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const snapshot = await getDoc(userDocRef);

      if (snapshot.exists()) {
        return snapshot.data() as UserProfile;
      } else {
        await setDoc(userDocRef, fallbackProfile);
        return fallbackProfile;
      }
    } catch (error: any) {
      console.error('Firestore User Profile Lookup/Creation Error:', error);
      return fallbackProfile;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profile = await fetchUserProfile(currentUser);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const registerStudent = async ({ name, email, password }: RegisterStudentData) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const createdUser = userCredential.user;

      if (name) {
        await updateProfile(createdUser, { displayName: name });
      }

      const newProfile: UserProfile = {
        uid: createdUser.uid,
        name,
        email,
        role: 'student',
        department: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'users', createdUser.uid), newProfile);
      } catch (firestoreErr: any) {
        console.error('Firestore setDoc failed during registration:', firestoreErr);
        throw new Error(
          `Firebase Auth registered successfully, but Firestore denied document creation: ${firestoreErr.message || 'Permission Denied'}. Please update Security Rules in Firebase Console.`
        );
      }

      setUserProfile(newProfile);
    } finally {
      setLoading(false);
    }
  };

  const login = async ({ email, password }: LoginData) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profile = await fetchUserProfile(cred.user);
      setUserProfile(profile);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        registerStudent,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
