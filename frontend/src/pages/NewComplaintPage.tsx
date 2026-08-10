import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Navigation from '../components/Navigation';
import {
  analyzeComplaint,
  checkDuplicateComplaints,
  analyzeComplaintImage,
  AIAnalysisData,
  DuplicateMatchItem,
  ImageAnalysisData,
} from '../services/api';
import { uploadComplaintImage, createComplaint, getAllComplaints } from '../services/complaint.service';
import {
  ComplaintCategory,
  ComplaintPriority,
  Complaint,
} from '../types/complaint';

const CATEGORIES: ComplaintCategory[] = [
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
];

const PRIORITIES: ComplaintPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const DEPARTMENTS = [
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
];

export function NewComplaintPage() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // AI Text Analysis state
  const [analyzingText, setAnalyzingText] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisData | null>(null);

  // AI Duplicate Detection state
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatchItem[]>([]);
  const [selectedDuplicateId, setSelectedDuplicateId] = useState<string | null>(null);

  // AI Multimodal Image Analysis state
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysisData | null>(null);

  // User confirmed/overridden complaint values
  const [category, setCategory] = useState<ComplaintCategory>('Other');
  const [priority, setPriority] = useState<ComplaintPriority>('MEDIUM');
  const [department, setDepartment] = useState<string>('Other');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));

      // Convert to base64 for Gemini vision API
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImageBase64(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunAIAnalysis = async () => {
    setError(null);
    if (!title.trim() || !description.trim()) {
      setError('Please fill in the title and description before running AI analysis.');
      return;
    }

    setAnalyzingText(true);
    setCheckingDuplicates(true);

    try {
      // 1. Text Analysis
      const textResponse = await analyzeComplaint({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
      });

      const aiData = textResponse.data;
      setAiAnalysis(aiData);

      if (CATEGORIES.includes(aiData.category as ComplaintCategory)) {
        setCategory(aiData.category as ComplaintCategory);
      }
      if (PRIORITIES.includes(aiData.priority as ComplaintPriority)) {
        setPriority(aiData.priority as ComplaintPriority);
      }
      if (aiData.department) {
        setDepartment(aiData.department);
      }

      // 2. Duplicate Detection
      try {
        const existing = await getAllComplaints();
        const activeExisting = existing.filter((c) => c.status !== 'RESOLVED' && c.status !== 'REJECTED');

        const dupResponse = await checkDuplicateComplaints({
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          existingComplaints: activeExisting.map((c) => ({
            id: c.id,
            title: c.title,
            description: c.description,
            location: c.location,
          })),
        });

        if (dupResponse.data.hasSimilarComplaints) {
          setDuplicateMatches(dupResponse.data.similarComplaints);
        } else {
          setDuplicateMatches([]);
        }
      } catch (dupErr) {
        console.warn('Duplicate check warning:', dupErr);
      }
    } catch (err: any) {
      console.error('AI Analysis Error:', err);
      setError(err.message || 'Failed to analyze complaint with AI.');
    } finally {
      setAnalyzingText(false);
      setCheckingDuplicates(false);
    }
  };

  const handleRunImageAnalysis = async () => {
    if (!imageBase64) return;

    setAnalyzingImage(true);
    setError(null);

    try {
      const response = await analyzeComplaintImage({
        imageBase64,
        context: {
          title: title.trim(),
          location: location.trim(),
        },
      });

      const imgData = response.data;
      setImageAnalysis(imgData);

      if (CATEGORIES.includes(imgData.category as ComplaintCategory)) {
        setCategory(imgData.category as ComplaintCategory);
      }
      if (PRIORITIES.includes(imgData.prioritySuggestion as ComplaintPriority)) {
        setPriority(imgData.prioritySuggestion as ComplaintPriority);
      }
      if (imgData.departmentSuggestion) {
        setDepartment(imgData.departmentSuggestion);
      }
    } catch (err: any) {
      console.error('Image Analysis Error:', err);
      setError(err.message || 'Failed to analyze uploaded photo.');
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user || !userProfile) {
      setError('You must be logged in to submit a complaint.');
      return;
    }

    if (!title.trim() || !description.trim() || !location.trim()) {
      setError('Please complete all required fields (Title, Description, Location).');
      return;
    }

    setSubmitting(true);

    try {
      let uploadedImageUrl: string | null = null;
      if (imageFile) {
        try {
          uploadedImageUrl = await uploadComplaintImage(imageFile, user.uid);
        } catch (storageErr: any) {
          console.warn('Firebase Storage upload skipped/failed:', storageErr.message || storageErr);
        }
      }

      const now = new Date().toISOString();
      const complaintData: Omit<Complaint, 'id'> = {
        userId: user.uid,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        category,
        priority,
        department,
        status: 'SUBMITTED',
        imageUrl: uploadedImageUrl,
        aiAnalysis: aiAnalysis
          ? {
              category: aiAnalysis.category,
              priority: aiAnalysis.priority,
              department: aiAnalysis.department,
              summary: aiAnalysis.summary,
              confidence: aiAnalysis.confidence,
              reason: aiAnalysis.reason,
            }
          : null,
        duplicateOf: selectedDuplicateId || null,
        duplicateGroupId: selectedDuplicateId ? `group_${selectedDuplicateId}` : null,
        createdAt: now,
        updatedAt: now,
        resolvedAt: null,
      };

      const newId = await createComplaint(complaintData, userProfile.name || 'Student');
      navigate(`/complaints/${newId}`);
    } catch (err: any) {
      console.error('Submit Complaint Error:', err);
      setError(err.message || 'Failed to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-3xl w-full mx-auto p-6 space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-bold text-slate-50">Submit a New Campus Complaint</h1>
          <p className="text-sm text-slate-400">
            Describe the problem and let our AI system route it to the right department.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-900/40 border border-red-700 text-red-300 text-sm space-y-1">
            <span className="font-bold block">Submission Warning / Error:</span>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmitComplaint} className="space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-semibold text-slate-200 border-b border-slate-700 pb-2">
              1. Issue Details
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Wi-Fi router flashing red in CSE Block 2nd floor"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Detailed Description *
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details about what happened, how many students are affected, etc."
                className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Campus Location *
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. CSE Block, Room 204 or Hostel 2 Washroom B"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Optional Attachment (Photo)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600 transition-colors"
              />
              {imagePreviewUrl && (
                <div className="mt-3 space-y-3">
                  <img
                    src={imagePreviewUrl}
                    alt="Complaint preview"
                    className="max-h-48 rounded-lg border border-slate-700 object-cover"
                  />

                  <button
                    type="button"
                    onClick={handleRunImageAnalysis}
                    disabled={analyzingImage}
                    className="w-full py-2 px-3 bg-purple-900/40 hover:bg-purple-900/60 text-purple-200 border border-purple-700 font-semibold rounded-lg text-xs transition-all flex items-center justify-center space-x-2"
                  >
                    {analyzingImage ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        <span>Analyzing Photo with Gemini Vision...</span>
                      </>
                    ) : (
                      <span>📸 Inspect Photo with Gemini AI Vision</span>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleRunAIAnalysis}
                disabled={analyzingText || checkingDuplicates}
                className="w-full py-2.5 px-4 bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 font-semibold rounded-lg border border-indigo-500/40 text-sm transition-all flex items-center justify-center space-x-2"
              >
                {analyzingText ? (
                  <>
                    <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing & Checking Duplicates...</span>
                  </>
                ) : (
                  <span>✨ Analyze & Check Duplicates with Gemini AI</span>
                )}
              </button>
            </div>
          </div>

          {/* Multimodal Image Analysis Card */}
          {imageAnalysis && (
            <div className="bg-purple-950/30 border border-purple-700/60 rounded-xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-purple-800/60 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                  📸 Gemini Vision Image Analysis Result
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900 border border-purple-700 text-purple-200 font-mono">
                  {Math.round(imageAnalysis.confidence * 100)}% Visual Match
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <p className="font-bold text-slate-100">
                  Detected Issue: <span className="text-purple-300">{imageAnalysis.detectedIssue}</span>
                </p>
                <p className="text-slate-300 italic">"{imageAnalysis.reason}"</p>

                {imageAnalysis.requiresHumanReview && (
                  <div className="mt-2 p-2.5 rounded bg-amber-950/50 border border-amber-800 text-amber-300 text-[11px] flex items-center space-x-2">
                    <span>⚠️ Safety Recommendation Notice: Image analysis is a recommendation and requires human staff review for safety hazards.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Duplicate Warning Card */}
          {duplicateMatches.length > 0 && (
            <div className="bg-amber-950/30 border border-amber-700/60 rounded-xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-amber-800/60 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  ⚠️ Similar Complaints Already Exist in this Location
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-900 text-amber-200 font-bold">
                  {duplicateMatches.length} Match(es)
                </span>
              </div>

              <p className="text-xs text-slate-300">
                Gemini detected related active complaints. You can link your issue to an existing complaint group or proceed with submitting a new complaint.
              </p>

              <div className="space-y-2">
                {duplicateMatches.map((match) => (
                  <div
                    key={match.complaintId}
                    className={`p-3 rounded-lg border text-xs space-y-1 transition-colors ${
                      selectedDuplicateId === match.complaintId
                        ? 'bg-amber-900/40 border-amber-500 text-amber-100'
                        : 'bg-slate-900/60 border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100">{match.title}</span>
                      <span className="font-mono text-amber-400">
                        {Math.round(match.similarityScore * 100)}% Match
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 italic">"{match.reason}"</p>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedDuplicateId(
                          selectedDuplicateId === match.complaintId ? null : match.complaintId
                        )
                      }
                      className="mt-1 px-3 py-1 bg-amber-800/60 hover:bg-amber-800 text-amber-200 rounded text-[11px] font-semibold transition-colors"
                    >
                      {selectedDuplicateId === match.complaintId
                        ? '✓ Linked as Duplicate'
                        : 'Link to this Complaint Group'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Result Review Card */}
          {aiAnalysis && (
            <div className="bg-slate-800 border border-indigo-500/40 rounded-xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Gemini AI Suggested Classification
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-950 border border-indigo-700 text-indigo-300 font-mono font-bold">
                  {Math.round(aiAnalysis.confidence * 100)}% Confidence
                </span>
              </div>
              <p className="text-xs text-slate-300 italic">"{aiAnalysis.reason}"</p>
            </div>
          )}

          {/* Categorization & Department Review */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-semibold text-slate-200 border-b border-slate-700 pb-2">
              2. Classification & Department Assignment
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Priority Level
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PRIORITIES.map((prio) => (
                    <option key={prio} value={prio}>
                      {prio}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Assigned Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all text-base disabled:opacity-50"
          >
            {submitting ? 'Submitting Complaint...' : 'Confirm & Submit Complaint'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default NewComplaintPage;
