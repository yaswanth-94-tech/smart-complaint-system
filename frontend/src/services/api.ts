const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface HealthResponse {
  success: boolean;
  message: string;
}

export interface AnalyzeComplaintPayload {
  title: string;
  description: string;
  location: string;
}

export interface AIAnalysisData {
  category: string;
  priority: string;
  department: string;
  summary: string;
  confidence: number;
  reason: string;
}

export interface AnalyzeComplaintResponse {
  success: boolean;
  data: AIAnalysisData;
  error?: string;
}

export interface DuplicateMatchItem {
  complaintId: string;
  title: string;
  reason: string;
  similarityScore: number;
}

export interface CheckDuplicatesResponse {
  success: boolean;
  data: {
    hasSimilarComplaints: boolean;
    similarComplaints: DuplicateMatchItem[];
  };
}

export interface ImageAnalysisData {
  detectedIssue: string;
  category: string;
  prioritySuggestion: string;
  departmentSuggestion: string;
  confidence: number;
  reason: string;
  requiresHumanReview: boolean;
}

export interface AnalyzeImageResponse {
  success: boolean;
  data: ImageAnalysisData;
}

export async function checkBackendHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed with status: ${response.status}`);
  }
  return response.json();
}

export async function analyzeComplaint(
  payload: AnalyzeComplaintPayload
): Promise<AnalyzeComplaintResponse> {
  const response = await fetch(`${API_BASE_URL}/complaints/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to analyze complaint with AI');
  }

  return data;
}

export async function checkDuplicateComplaints(payload: {
  title: string;
  description: string;
  location: string;
  existingComplaints: Array<{ id: string; title: string; description: string; location: string }>;
}): Promise<CheckDuplicatesResponse> {
  const response = await fetch(`${API_BASE_URL}/complaints/check-duplicates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to check duplicate complaints');
  }

  return data;
}

export async function analyzeComplaintImage(payload: {
  imageBase64: string;
  mimeType?: string;
  context?: { title?: string; location?: string };
}): Promise<AnalyzeImageResponse> {
  const response = await fetch(`${API_BASE_URL}/complaints/analyze-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to analyze complaint image');
  }

  return data;
}
