export type NotificationType = 'STATUS_CHANGE' | 'ASSIGNMENT' | 'SYSTEM';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  complaintId: string;
  read: boolean;
  createdAt: string;
}
