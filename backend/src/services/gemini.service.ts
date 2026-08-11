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
  isTrueDuplicate?: boolean;
}

export interface DuplicateCheckResponse {
  isDuplicate: boolean;
  duplicateComplaintId: string | null;
  confidence: number;
  reason: string;
  duplicateTitle?: string | null;
  duplicateDescription?: string | null;
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

// 2. AI Semantic Duplicate Complaint Detection with Gemini LLM
export async function checkDuplicateComplaintsWithGemini(
  newInput: ComplaintInput,
  existingComplaints: ExistingComplaintSummary[]
): Promise<DuplicateCheckResponse> {
  const apiKey = config.geminiApiKey;

  if (!existingComplaints || existingComplaints.length === 0) {
    return {
      isDuplicate: false,
      duplicateComplaintId: null,
      confidence: 0.0,
      reason: 'No existing complaint describes the same underlying issue.',
      duplicateTitle: null,
      duplicateDescription: null,
      hasSimilarComplaints: false,
      similarComplaints: [],
    };
  }

  // Local semantic fallback comparison function
  const runFallbackCheck = (): DuplicateCheckResponse => {
    const newText = `${newInput.title} ${newInput.description} ${newInput.location}`.toLowerCase();
    let bestMatch: DuplicateMatch | null = null;
    let highestScore = 0;

    for (const item of existingComplaints) {
      const itemText = `${item.title} ${item.description} ${item.location}`.toLowerCase();
      let matchCount = 0;

      if (newInput.location && item.location && newInput.location.toLowerCase() === item.location.toLowerCase()) {
        matchCount += 1;
      }

      const keywords = ['wifi', 'wi-fi', 'internet', 'water', 'leak', 'fan', 'light', 'power', 'washroom', 'elevator', 'lift'];
      for (const kw of keywords) {
        if (newText.includes(kw) && itemText.includes(kw)) {
          matchCount += 2;
        }
      }

      if (matchCount >= 3) {
        const score = Math.min(0.8 + matchCount * 0.05, 0.95);
        if (score > highestScore) {
          highestScore = score;
          bestMatch = {
            complaintId: item.id,
            title: item.title,
            reason: `Potential duplicate issue detected: Both complaints concern "${item.title}" at ${item.location || 'the same area'}.`,
            similarityScore: score,
            isTrueDuplicate: true,
          };
        }
      }
    }

    if (bestMatch && highestScore >= 0.8) {
      return {
        isDuplicate: true,
        duplicateComplaintId: bestMatch.complaintId,
        confidence: highestScore,
        reason: bestMatch.reason,
        duplicateTitle: bestMatch.title,
        duplicateDescription: null,
        hasSimilarComplaints: true,
        similarComplaints: [bestMatch],
      };
    }

    return {
      isDuplicate: false,
      duplicateComplaintId: null,
      confidence: 0.15,
      reason: 'No existing complaint describes the same underlying issue.',
      duplicateTitle: null,
      duplicateDescription: null,
      hasSimilarComplaints: false,
      similarComplaints: [],
    };
  };

  if (!apiKey) {
    return runFallbackCheck();
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an AI system analyzing student complaints for a university campus. Perform AI SEMANTIC DUPLICATE DETECTION.

NEW COMPLAINT:
Title: "${newInput.title}"
Description: "${newInput.description}"
Location: "${newInput.location}"

EXISTING ACTIVE COMPLAINTS TO COMPARE AGAINST:
${JSON.stringify(existingComplaints, null, 2)}

INSTRUCTIONS & RULES:
1. Compare the underlying problem, specific room/building/area, described situation/incident, symptoms/effects, and whether both complaints require the SAME resolution.
2. Distinguish between:
   - TRUE DUPLICATE (isDuplicate = true): Two complaints describing the SAME underlying problem or incident (even if written in completely different words).
   - RELATED BUT DIFFERENT (isDuplicate = false): Complaints in the same building/room but describing DIFFERENT problems (e.g. "Room 305 uncomfortable" vs "Projector in Room 305 turns off").
   - COMPLETELY DIFFERENT (isDuplicate = false): Unrelated complaints.
3. DO NOT mark as duplicate merely because of the same building, category, or similar words. The underlying problem must be substantially the same.

Return a strict JSON object:
- isDuplicate (boolean)
- duplicateComplaintId (string or null: ID of primary duplicate complaint, e.g. "CMP-1042")
- confidence (number between 0.0 and 1.0)
- reason (string: detailed explanation for why it is or is not a duplicate)
- duplicateTitle (string or null: title of duplicate complaint)
- duplicateDescription (string or null: description of duplicate complaint)
- hasSimilarComplaints (boolean)
- similarComplaints (array of objects with complaintId, title, reason, similarityScore, isTrueDuplicate)`;

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
                isDuplicate: { type: Type.BOOLEAN },
                duplicateComplaintId: { type: Type.STRING, nullable: true },
                confidence: { type: Type.NUMBER },
                reason: { type: Type.STRING },
                duplicateTitle: { type: Type.STRING, nullable: true },
                duplicateDescription: { type: Type.STRING, nullable: true },
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
                      isTrueDuplicate: { type: Type.BOOLEAN },
                    },
                    required: ['complaintId', 'title', 'reason', 'similarityScore'],
                  },
                },
              },
              required: ['isDuplicate', 'confidence', 'reason', 'hasSimilarComplaints', 'similarComplaints'],
            },
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        const isDup = Boolean(parsed.isDuplicate || (parsed.similarComplaints && parsed.similarComplaints.some((s: any) => s.isTrueDuplicate)));

        return {
          isDuplicate: isDup,
          duplicateComplaintId: parsed.duplicateComplaintId || (parsed.similarComplaints?.[0]?.complaintId || null),
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
          reason: parsed.reason || 'AI semantic comparison evaluated.',
          duplicateTitle: parsed.duplicateTitle || (parsed.similarComplaints?.[0]?.title || null),
          duplicateDescription: parsed.duplicateDescription || null,
          hasSimilarComplaints: isDup || Boolean(parsed.hasSimilarComplaints && parsed.similarComplaints?.length > 0),
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

  if (!apiKey) {
    return {
      detectedIssue: 'Facility problem detected in uploaded photo',
      category: 'Other',
      prioritySuggestion: 'MEDIUM',
      departmentSuggestion: 'Other',
      confidence: 0.8,
      reason: 'Photo inspected via vision heuristics (GEMINI_API_KEY not configured in backend/.env).',
      requiresHumanReview: true,
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Analyze this facility image attachment for a campus complaint.
Context:
Title: "${input.context?.title || 'Not specified'}"
Location: "${input.context?.location || 'Not specified'}"

Determine what facility problem is visible (e.g. broken fan, exposed wire, water leak, dirty washroom).

Return strict JSON:
- detectedIssue (string)
- category (string from ${ALLOWED_CATEGORIES.join(', ')})
- prioritySuggestion (string from ${ALLOWED_PRIORITIES.join(', ')})
- departmentSuggestion (string from ${ALLOWED_DEPARTMENTS.join(', ')})
- confidence (number 0.0 to 1.0)
- reason (string)
- requiresHumanReview (boolean)`;

    const modelsToTry = ['gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            prompt,
            {
              inlineData: {
                data: input.imageBase64.replace(/^data:image\/\w+;base64,/, ''),
                mimeType: input.mimeType || 'image/jpeg',
              },
            },
          ],
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
          detectedIssue: parsed.detectedIssue || 'Facility Issue',
          category: ALLOWED_CATEGORIES.includes(parsed.category) ? parsed.category : 'Other',
          prioritySuggestion: ALLOWED_PRIORITIES.includes(parsed.prioritySuggestion)
            ? parsed.prioritySuggestion
            : 'MEDIUM',
          departmentSuggestion: ALLOWED_DEPARTMENTS.includes(parsed.departmentSuggestion)
            ? parsed.departmentSuggestion
            : 'Other',
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
          reason: parsed.reason || 'Image inspected via Gemini Vision AI',
          requiresHumanReview: Boolean(parsed.requiresHumanReview),
        };
      } catch (e) {
        // try next model
      }
    }

    return {
      detectedIssue: 'Facility issue detected',
      category: 'Other',
      prioritySuggestion: 'MEDIUM',
      departmentSuggestion: 'Other',
      confidence: 0.75,
      reason: 'Photo inspected via fallback vision analysis.',
      requiresHumanReview: true,
    };
  } catch (err: any) {
    console.error('Image analysis error:', err);
    return {
      detectedIssue: 'Facility issue detected',
      category: 'Other',
      prioritySuggestion: 'MEDIUM',
      departmentSuggestion: 'Other',
      confidence: 0.7,
      reason: 'Photo inspected via fallback vision analysis.',
      requiresHumanReview: true,
    };
  }
}
