export type UserRole = 'student' | 'department_staff' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterStudentData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}
