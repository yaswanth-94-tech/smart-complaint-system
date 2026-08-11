export type ComplaintCategory =
  | 'Wi-Fi'
  | 'Classroom'
  | 'Laboratory'
  | 'Hostel'
  | 'Transportation'
  | 'Washroom'
  | 'Electrical'
  | 'Plumbing'
  | 'Security'
  | 'Cleanliness'
  | 'Other';

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ComplaintStatus =
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED';

export interface AIAnalysisResult {
  category: ComplaintCategory | string;
  priority: ComplaintPriority | string;
  department: string;
  summary: string;
  confidence: number;
  reason: string;
  recommendedAction?: string;
}

export interface Complaint {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: ComplaintCategory | string;
  priority: ComplaintPriority | string;
  department: string;
  location: string;
  imageUrl?: string | null;
  status: ComplaintStatus;
  aiAnalysis?: AIAnalysisResult | null;
  duplicateOf?: string | null;
  duplicateGroupId?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}

export interface ComplaintUpdate {
  id?: string;
  complaintId: string;
  status: ComplaintStatus;
  message: string;
  updatedBy: string;
  updatedByRole: 'student' | 'department_staff' | 'admin';
  createdAt: string;
}
