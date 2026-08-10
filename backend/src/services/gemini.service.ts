import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../config/env.config';

export const ALLOWED_CATEGORIES = [
  'Wi-Fi',
  'Classroom',
  'Laboratory',
  'Hostel',
  'Transportation',
  'Washroom',
  'Electrical',
  'Plumbing',
  'Security',
  'Cleanliness',
  'Other',
] as const;

export const ALLOWED_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export const ALLOWED_DEPARTMENTS = [
  'IT Department',
  'Electrical Maintenance',
  'Plumbing/Maintenance',
  'Hostel Administration',
  'Transport Department',
  'Laboratory Maintenance',
  'Civil Maintenance',
  'Sanitation Department',
  'Security Department',
  'Other',
] as const;

export type CategoryType = (typeof ALLOWED_CATEGORIES)[number];
export type PriorityType = (typeof ALLOWED_PRIORITIES)[number];
export type DepartmentType = (typeof ALLOWED_DEPARTMENTS)[number];

export interface ComplaintInput {
  title: string;
  description: string;
  location: string;
}

export interface AIAnalysisResponse {
  category: CategoryType;
  priority: PriorityType;
  department: DepartmentType;
  summary: string;
  confidence: number;
  reason: string;
}

export interface ExistingComplaintSummary {
  id: string;
  title: string;
  description: string;
  location: string;
}

export interface DuplicateMatch {
  complaintId: string;
  title: string;
  reason: string;
  similarityScore: number;
}

export interface DuplicateCheckResponse {
  hasSimilarComplaints: boolean;
  similarComplaints: DuplicateMatch[];
}

export interface ImageAnalysisInput {
  imageBase64: string;
  mimeType?: string;
  context?: {
    title?: string;
    location?: string;
  };
}

export interface ImageAnalysisResponse {
  detectedIssue: string;
  category: CategoryType;
  prioritySuggestion: PriorityType;
  departmentSuggestion: DepartmentType;
  confidence: number;
  reason: string;
  requiresHumanReview: boolean;
}

// 1. Core Text Analysis with Gemini
export async function analyzeComplaintWithGemini(
  input: ComplaintInput
): Promise<AIAnalysisResponse> {
  const apiKey = config.geminiApiKey;

  const getFallbackResult = (reasonMsg: string): AIAnalysisResponse => {
    const text = `${input.title} ${input.description} ${input.location}`.toLowerCase();

    let category: CategoryType = 'Other';
    let department: DepartmentType = 'Other';
    let priority: PriorityType = 'MEDIUM';

    if (text.includes('wifi') || text.includes('wi-fi') || text.includes('internet') || text.includes('network')) {
      category = 'Wi-Fi';
      department = 'IT Department';
      priority = text.includes('outage') || text.includes('down') ? 'HIGH' : 'MEDIUM';
    } else if (text.includes('light') || text.includes('fan') || text.includes('electrical') || text.includes('power') || text.includes('spark') || text.includes('circuit')) {
      category = 'Electrical';
      department = 'Electrical Maintenance';
      priority = text.includes('spark') || text.includes('smoke') || text.includes('short') ? 'CRITICAL' : 'HIGH';
    } else if (text.includes('water') || text.includes('pipe') || text.includes('leak') || text.includes('tap') || text.includes('washroom')) {
      category = text.includes('washroom') ? 'Washroom' : 'Plumbing';
      department = 'Plumbing/Maintenance';
      priority = text.includes('flood') || text.includes('overflow') || text.includes('burst') ? 'CRITICAL' : 'HIGH';
    } else if (text.includes('hostel') || text.includes('room')) {
      category = 'Hostel';
      department = 'Hostel Administration';
    } else if (text.includes('bus') || text.includes('transport')) {
      category = 'Transportation';
      department = 'Transport Department';
    } else if (text.includes('lab') || text.includes('equipment')) {
      category = 'Laboratory';
      department = 'Laboratory Maintenance';
    }

    return {
      category,
      priority,
      department,
      summary: `${input.title} reported at ${input.location || 'Campus'}`,
      confidence: 0.85,
      reason: reasonMsg,
    };
  };

  if (!apiKey) {
    return getFallbackResult('Categorized via intelligent local fallback (GEMINI_API_KEY not configured in backend/.env).');
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Analyze the following student campus complaint and categorize it accurately:
Title: "${input.title}"
Description: "${input.description}"
Location: "${input.location}"

You MUST select EXACTLY ONE option for each field from the allowed lists:
Allowed categories: ${ALLOWED_CATEGORIES.join(', ')}
Allowed priorities: ${ALLOWED_PRIORITIES.join(', ')}
Allowed departments: ${ALLOWED_DEPARTMENTS.join(', ')}

Return a strict JSON object with:
- category (string)
- priority (string)
- department (string)
- summary (concise 1-sentence summary of the issue)
- confidence (number between 0.0 and 1.0)
- reason (short explanation for the classification decisions)`;

    const modelsToTry = ['gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING, enum: [...ALLOWED_CATEGORIES] },
                priority: { type: Type.STRING, enum: [...ALLOWED_PRIORITIES] },
                department: { type: Type.STRING, enum: [...ALLOWED_DEPARTMENTS] },
                summary: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                reason: { type: Type.STRING },
              },
              required: ['category', 'priority', 'department', 'summary', 'confidence', 'reason'],
            },
          },
        });

        const responseText = response.text || '';
        const parsed = JSON.parse(responseText);

        return {
          category: ALLOWED_CATEGORIES.includes(parsed.category) ? parsed.category : 'Other',
          priority: ALLOWED_PRIORITIES.includes(parsed.priority) ? parsed.priority : 'MEDIUM',
          department: ALLOWED_DEPARTMENTS.includes(parsed.department) ? parsed.department : 'Other',
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
          summary: parsed.summary || `${input.title} at ${input.location}`,
          reason: parsed.reason || `Categorized via ${modelName}`,
        };
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError;
  } catch (err: any) {
    console.error('Gemini API execution warning:', err.message || err);
    return getFallbackResult(`Fallback result used: ${err.message || 'API issue'}`);
  }
}

// 2. Duplicate / Similar Complaint Detection with Gemini
export async function checkDuplicateComplaintsWithGemini(
  newInput: ComplaintInput,
  existingComplaints: ExistingComplaintSummary[]
): Promise<DuplicateCheckResponse> {
  const apiKey = config.geminiApiKey;

  if (!existingComplaints || existingComplaints.length === 0) {
    return { hasSimilarComplaints: false, similarComplaints: [] };
  }

  // Local heuristic fallback comparison function
  const runFallbackCheck = (): DuplicateCheckResponse => {
    const matches: DuplicateMatch[] = [];
    const newText = `${newInput.title} ${newInput.description} ${newInput.location}`.toLowerCase();

    for (const item of existingComplaints) {
      const itemText = `${item.title} ${item.description} ${item.location}`.toLowerCase();
      let matchCount = 0;

      // Location match
      if (newInput.location && item.location && newInput.location.toLowerCase() === item.location.toLowerCase()) {
        matchCount += 2;
      }

      // Keyword overlaps
      const keywords = ['wifi', 'wi-fi', 'internet', 'water', 'leak', 'fan', 'light', 'power', 'washroom', 'elevator', 'lift'];
      for (const kw of keywords) {
        if (newText.includes(kw) && itemText.includes(kw)) {
          matchCount += 2;
        }
      }

      if (matchCount >= 2) {
        matches.push({
          complaintId: item.id,
          title: item.title,
          reason: `Potential similarity detected between "${newInput.title}" and existing complaint "${item.title}" at ${item.location || 'the same location'}.`,
          similarityScore: Math.min(0.7 + matchCount * 0.1, 0.95),
        });
      }
    }

    return {
      hasSimilarComplaints: matches.length > 0,
      similarComplaints: matches,
    };
  };

  if (!apiKey) {
    return runFallbackCheck();
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an AI system analyzing student complaints for a university campus.
New Complaint:
Title: "${newInput.title}"
Description: "${newInput.description}"
Location: "${newInput.location}"

Compare this NEW complaint against the following EXISTING active complaints:
${JSON.stringify(existingComplaints, null, 2)}

Determine if any existing complaint describes the SAME underlying issue or a strongly RELATED problem in the same physical or functional area (e.g., Wi-Fi outage in CSE Block vs Internet down in CSE building).

Return a strict JSON object:
- hasSimilarComplaints (boolean)
- similarComplaints (array of objects containing complaintId, title, reason, similarityScore between 0.0 and 1.0)`;

    const modelsToTry = ['gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                hasSimilarComplaints: { type: Type.BOOLEAN },
                similarComplaints: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      complaintId: { type: Type.STRING },
                      title: { type: Type.STRING },
                      reason: { type: Type.STRING },
                      similarityScore: { type: Type.NUMBER },
                    },
                    required: ['complaintId', 'title', 'reason', 'similarityScore'],
                  },
                },
              },
              required: ['hasSimilarComplaints', 'similarComplaints'],
            },
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        return {
          hasSimilarComplaints: Boolean(parsed.hasSimilarComplaints && parsed.similarComplaints?.length > 0),
          similarComplaints: parsed.similarComplaints || [],
        };
      } catch (e) {
        // continue to next model
      }
    }

    return runFallbackCheck();
  } catch (err) {
    console.error('Duplicate detection warning:', err);
    return runFallbackCheck();
  }
}

// 3. Multimodal Image Analysis with Gemini
export async function analyzeComplaintImageWithGemini(
  input: ImageAnalysisInput
): Promise<ImageAnalysisResponse> {
  const apiKey = config.geminiApiKey;

  // Extract pure base64 data if data URL prefix exists
  let pureBase64 = input.imageBase64;
  let detectedMime = input.mimeType || 'image/jpeg';

  if (pureBase64.includes(';base64,')) {
    const parts = pureBase64.split(';base64,');
    detectedMime = parts[0].replace('data:', '') || detectedMime;
    pureBase64 = parts[1];
  }

  const getFallbackResult = (reasonMsg: string): ImageAnalysisResponse => {
    return {
      detectedIssue: input.context?.title ? `Visual inspection related to "${input.context.title}"` : 'Facility equipment issue detected in photo',
      category: 'Other',
      prioritySuggestion: 'MEDIUM',
      departmentSuggestion: 'Other',
      confidence: 0.75,
      reason: reasonMsg,
      requiresHumanReview: true,
    };
  };

  if (!apiKey) {
    return getFallbackResult('Image analysis recommendation generated via local fallback (GEMINI_API_KEY not set).');
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const promptText = `Analyze this uploaded image for a campus complaint system (e.g. broken fan, exposed electrical wire, water leakage, damaged desk, dirty washroom, broken lab equipment).
Context Title: "${input.context?.title || 'Unspecified'}"
Context Location: "${input.context?.location || 'Unspecified'}"

Inspect the photo carefully and provide a structured JSON assessment:
- detectedIssue: Specific concise description of what is visually wrong in the photo.
- category: Select ONE from (${ALLOWED_CATEGORIES.join(', ')})
- prioritySuggestion: Select ONE from (${ALLOWED_PRIORITIES.join(', ')}). Mark as CRITICAL if exposed high-voltage wiring, severe flooding, fire hazard, or immediate danger is visible.
- departmentSuggestion: Select ONE from (${ALLOWED_DEPARTMENTS.join(', ')})
- confidence: Confidence score between 0.0 and 1.0
- reason: Short explanation of the visual findings in the image.
- requiresHumanReview: Boolean (set true for any safety hazards or ambiguous photos)`;

    const imagePart = {
      inlineData: {
        data: pureBase64,
        mimeType: detectedMime,
      },
    };

    const modelsToTry = ['gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [imagePart, promptText],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                detectedIssue: { type: Type.STRING },
                category: { type: Type.STRING, enum: [...ALLOWED_CATEGORIES] },
                prioritySuggestion: { type: Type.STRING, enum: [...ALLOWED_PRIORITIES] },
                departmentSuggestion: { type: Type.STRING, enum: [...ALLOWED_DEPARTMENTS] },
                confidence: { type: Type.NUMBER },
                reason: { type: Type.STRING },
                requiresHumanReview: { type: Type.BOOLEAN },
              },
              required: [
                'detectedIssue',
                'category',
                'prioritySuggestion',
                'departmentSuggestion',
                'confidence',
                'reason',
                'requiresHumanReview',
              ],
            },
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        return {
          detectedIssue: parsed.detectedIssue || 'Issue identified in photo',
          category: ALLOWED_CATEGORIES.includes(parsed.category) ? parsed.category : 'Other',
          prioritySuggestion: ALLOWED_PRIORITIES.includes(parsed.prioritySuggestion) ? parsed.prioritySuggestion : 'MEDIUM',
          departmentSuggestion: ALLOWED_DEPARTMENTS.includes(parsed.departmentSuggestion) ? parsed.departmentSuggestion : 'Other',
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
          reason: parsed.reason || 'Visual image analysis completed.',
          requiresHumanReview: parsed.requiresHumanReview !== undefined ? parsed.requiresHumanReview : true,
        };
      } catch (e) {
        // continue to next model
      }
    }

    return getFallbackResult('Image analysis model fallback.');
  } catch (err: any) {
    console.error('Gemini Vision API error:', err);
    return getFallbackResult(`Image inspection fallback: ${err.message || 'Vision API failed'}`);
  }
}
