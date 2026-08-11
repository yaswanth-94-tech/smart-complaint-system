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
  isTrueDuplicate?: boolean;
}

export interface CheckDuplicatesResponse {
  success: boolean;
  data: {
    isDuplicate: boolean;
    duplicateComplaintId: string | null;
    confidence: number;
    reason: string;
    duplicateTitle?: string | null;
    duplicateDescription?: string | null;
    hasSimilarComplaints: boolean;
    similarComplaints: DuplicateMatchItem[];
  };
  error?: string;
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
  error?: string;
}

// Helper to safely parse JSON response and avoid 'Unexpected end of JSON input'
async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text || text.trim().length === 0) {
    throw new Error(`Server returned empty response (HTTP ${response.status})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON response from server (HTTP ${response.status})`);
  }
}

export async function checkBackendHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return parseJsonResponse<HealthResponse>(response);
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

  const data = await parseJsonResponse<AnalyzeComplaintResponse>(response);

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

  const data = await parseJsonResponse<CheckDuplicatesResponse>(response);
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

  const data = await parseJsonResponse<AnalyzeImageResponse>(response);
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to analyze complaint image');
  }

  return data;
}

// Smart Local Fallback Classifier for guaranteed offline/resilient classification
export function getLocalSmartClassification(title: string, description: string, location: string): AIAnalysisData {
  const text = `${title} ${description} ${location}`.toLowerCase();

  let category = 'Other';
  let priority = 'MEDIUM';
  let department = 'Other';

  if (text.includes('wifi') || text.includes('wi-fi') || text.includes('internet') || text.includes('network') || text.includes('router') || text.includes('lan')) {
    category = 'Wi-Fi';
    department = 'IT Department';
  } else if (text.includes('fan') || text.includes('light') || text.includes('switch') || text.includes('power') || text.includes('wire') || text.includes('electric') || text.includes('ac') || text.includes('cooler')) {
    category = 'Electrical';
    department = 'Electrical Maintenance';
  } else if (text.includes('water') || text.includes('leak') || text.includes('tap') || text.includes('pipe') || text.includes('flush') || text.includes('drain') || text.includes('plumbing')) {
    category = 'Plumbing';
    department = 'Plumbing/Maintenance';
  } else if (text.includes('hostel') || text.includes('room') || text.includes('bed') || text.includes('mess')) {
    category = 'Hostel';
    department = 'Hostel Administration';
  } else if (text.includes('bus') || text.includes('transport') || text.includes('vehicle') || text.includes('shuttle')) {
    category = 'Transportation';
    department = 'Transport Department';
  } else if (text.includes('clean') || text.includes('dust') || text.includes('garbage') || text.includes('trash') || text.includes('smell') || text.includes('dirty')) {
    category = 'Cleanliness';
    department = 'Sanitation Department';
  } else if (text.includes('lab') || text.includes('computer') || text.includes('pc') || text.includes('equipment')) {
    category = 'Laboratory';
    department = 'Laboratory Maintenance';
  } else if (text.includes('washroom') || text.includes('toilet') || text.includes('restroom')) {
    category = 'Washroom';
    department = 'Sanitation Department';
  } else if (text.includes('bench') || text.includes('chair') || text.includes('board') || text.includes('projector') || text.includes('classroom')) {
    category = 'Classroom';
    department = 'Civil Maintenance';
  } else if (text.includes('guard') || text.includes('security') || text.includes('theft') || text.includes('gate') || text.includes('stolen')) {
    category = 'Security';
    department = 'Security Department';
  }

  if (text.includes('fire') || text.includes('spark') || text.includes('smoke') || text.includes('urgent') || text.includes('emergency') || text.includes('hazard') || text.includes('danger') || text.includes('broken wire')) {
    priority = 'CRITICAL';
  } else if (text.includes('not working') || text.includes('completely down') || text.includes('severe') || text.includes('block') || text.includes('entire')) {
    priority = 'HIGH';
  }

  return {
    category,
    priority,
    department,
    summary: `Complaint regarding ${category.toLowerCase()} reported at ${location || 'campus'}.`,
    confidence: 0.95,
    reason: `Automated smart routing based on issue keywords in "${title}".`,
  };
}
