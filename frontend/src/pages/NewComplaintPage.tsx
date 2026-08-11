import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Navigation from '../components/Navigation';
import {
  analyzeComplaint,
  checkDuplicateComplaints,
  AIAnalysisData,
  CheckDuplicatesResponse,
} from '../services/api';
import { createComplaint, updateComplaintStatus } from '../services/complaint.service';
import {
  ComplaintCategory,
  ComplaintPriority,
  Complaint,
} from '../types/complaint';

export function NewComplaintPage() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  // AI Text Analysis state
  const [analyzingText, setAnalyzingText] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisData | null>(null);

  // AI Duplicate Detection state
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateResult, setDuplicateResult] = useState<CheckDuplicatesResponse['data'] | null>(null);
  const [overrideDuplicate, setOverrideDuplicate] = useState(false);
  const [appendNoteText, setAppendNoteText] = useState('');
  const [isAppendingNote, setIsAppendingNote] = useState(false);

  // AI determined complaint values
  const [category, setCategory] = useState<ComplaintCategory>('Other');
  const [priority, setPriority] = useState<ComplaintPriority>('MEDIUM');
  const [department, setDepartment] = useState<string>('Other');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAIAnalysisAndDuplicateCheck = async (): Promise<{ aiData: AIAnalysisData; dupData: any }> => {
    // 1. Classification via Backend AI
    const textResponse = await analyzeComplaint({
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
    });
    const aiData = textResponse.data;

    // 2. AI Semantic Duplicate Detection via Backend (backend queries Firestore)
    const dupResponse = await checkDuplicateComplaints({
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
    });
    const dupData = dupResponse.data || null;

    return { aiData, dupData };
  };

  const handleRunAIAnalysis = async () => {
    setError(null);
    if (!title.trim() || !description.trim()) {
      setError('Please fill in the title and description before running AI analysis.');
      return;
    }

    setAnalyzingText(true);
    setCheckingDuplicates(true);
    setOverrideDuplicate(false);

    try {
      const { aiData, dupData } = await runAIAnalysisAndDuplicateCheck();
      setAiAnalysis(aiData);
      setCategory(aiData.category as ComplaintCategory);
      setPriority(aiData.priority as ComplaintPriority);
      setDepartment(aiData.department);
      setDuplicateResult(dupData);
    } catch (err: any) {
      console.error('AI Analysis Execution Error:', err);
      setError(`AI Analysis Error: ${err.message || 'Failed to connect to AI analysis backend'}`);
      setAiAnalysis(null);
      setDuplicateResult(null);
    } finally {
      setAnalyzingText(false);
      setCheckingDuplicates(false);
    }
  };

  const handleAddInfoToExisting = async () => {
    if (!duplicateResult?.duplicateComplaintId || !user || !userProfile) return;
    const note = appendNoteText.trim() || `Additional update from student: ${description.trim()}`;

    setIsAppendingNote(true);
    try {
      await updateComplaintStatus(
        duplicateResult.duplicateComplaintId,
        'SUBMITTED',
        `[Student Additional Report] ${note}`,
        userProfile.name || 'Student',
        'student'
      );
      navigate(`/complaints/${duplicateResult.duplicateComplaintId}`);
    } catch (err: any) {
      console.error('Failed to append information:', err);
      setError('Failed to update existing complaint.');
    } finally {
      setIsAppendingNote(false);
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

    let currentAiAnalysis = aiAnalysis;
    let currentDupResult = duplicateResult;

    // Automatically trigger backend AI analysis & duplicate check if not yet executed
    if (!currentAiAnalysis) {
      setAnalyzingText(true);
      setCheckingDuplicates(true);
      try {
        const { aiData, dupData } = await runAIAnalysisAndDuplicateCheck();
        currentAiAnalysis = aiData;
        currentDupResult = dupData;
        setAiAnalysis(aiData);
        setCategory(aiData.category as ComplaintCategory);
        setPriority(aiData.priority as ComplaintPriority);
        setDepartment(aiData.department);
        setDuplicateResult(dupData);
      } catch (err: any) {
        setAnalyzingText(false);
        setCheckingDuplicates(false);
        setError(`AI Analysis Error: ${err.message || 'Failed to connect to AI analysis backend'}`);
        return;
      }
      setAnalyzingText(false);
      setCheckingDuplicates(false);
    }

    // Intercept if AI detected a true duplicate and student hasn't clicked "Submit as New Complaint"
    if (currentDupResult?.isDuplicate && !overrideDuplicate) {
      setError('AI detected a likely duplicate complaint. Please review the duplicate warning below or click "Submit as New Complaint" to proceed.');
      return;
    }

    setSubmitting(true);

    try {
      const now = new Date().toISOString();
      const complaintData: Omit<Complaint, 'id'> = {
        userId: user.uid,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        category: currentAiAnalysis ? currentAiAnalysis.category : category,
        priority: currentAiAnalysis ? currentAiAnalysis.priority : priority,
        department: currentAiAnalysis ? currentAiAnalysis.department : department,
        status: 'SUBMITTED',
        imageUrl: null,
        aiAnalysis: currentAiAnalysis
          ? {
              category: currentAiAnalysis.category,
              priority: currentAiAnalysis.priority,
              department: currentAiAnalysis.department,
              summary: currentAiAnalysis.summary,
              confidence: currentAiAnalysis.confidence,
              reason: currentAiAnalysis.reason,
              recommendedAction: currentAiAnalysis.recommendedAction,
            }
          : null,
        duplicateOf: currentDupResult?.duplicateComplaintId || null,
        duplicateGroupId: currentDupResult?.duplicateComplaintId ? `group_${currentDupResult.duplicateComplaintId}` : null,
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
            Describe the problem and let our AI system automatically route it to the right department.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-900/40 border border-red-700 text-red-300 text-sm space-y-1">
            <span className="font-bold block">Submission Alert:</span>
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
                    <span>Analyzing & Checking Duplicates via AI...</span>
                  </>
                ) : (
                  <span>✨ Analyze & Check Duplicates with Gemini AI</span>
                )}
              </button>
            </div>
          </div>

          {/* AI Semantic Duplicate Detection Card */}
          {duplicateResult?.isDuplicate && (
            <div className="bg-amber-950/40 border-2 border-amber-500 rounded-xl p-6 shadow-2xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-amber-700/80 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">⚠️</span>
                  <h3 className="text-sm font-black uppercase tracking-wider text-amber-200">
                    POSSIBLE DUPLICATE FOUND
                  </h3>
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-amber-900 border border-amber-600 text-amber-100 font-mono font-bold">
                  AI Confidence: {Math.round((duplicateResult.confidence || 0.9) * 100)}%
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-200">
                <div>
                  <span className="text-amber-400 font-bold uppercase tracking-wider text-[11px] block">
                    Existing Complaint:
                  </span>
                  <span className="text-sm font-bold text-slate-100 block">
                    {duplicateResult.duplicateComplaintId || 'Existing Complaint'} - "{duplicateResult.duplicateTitle || title}"
                  </span>
                </div>

                <div>
                  <span className="text-amber-400 font-bold uppercase tracking-wider text-[11px] block">
                    Why:
                  </span>
                  <p className="p-3 rounded bg-amber-900/30 border border-amber-800 text-amber-100 italic leading-relaxed">
                    "{duplicateResult.reason}"
                  </p>
                </div>

                <div className="pt-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Add note to existing complaint (Optional):
                  </label>
                  <input
                    type="text"
                    value={appendNoteText}
                    onChange={(e) => setAppendNoteText(e.target.value)}
                    placeholder="e.g. Also happening in afternoon class today"
                    className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-amber-800/60">
                {duplicateResult.duplicateComplaintId && (
                  <button
                    type="button"
                    onClick={() => window.open(`/complaints/${duplicateResult.duplicateComplaintId}`, '_blank')}
                    className="w-full sm:w-auto px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg border border-slate-600 transition-colors"
                  >
                    🔍 View Existing Complaint
                  </button>
                )}

                {duplicateResult.duplicateComplaintId && (
                  <button
                    type="button"
                    onClick={handleAddInfoToExisting}
                    disabled={isAppendingNote}
                    className="w-full sm:w-auto px-3.5 py-2 bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs rounded-lg shadow transition-colors disabled:opacity-50"
                  >
                    {isAppendingNote ? 'Adding Information...' : '➕ Add Information to Existing Complaint'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setOverrideDuplicate(true)}
                  className={`w-full sm:w-auto px-3.5 py-2 text-xs font-bold rounded-lg border transition-colors ${
                    overrideDuplicate
                      ? 'bg-emerald-800 text-emerald-100 border-emerald-600'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'
                  }`}
                >
                  {overrideDuplicate ? '✓ Will Submit as New Complaint' : 'Submit as New Complaint'}
                </button>
              </div>
            </div>
          )}

          {/* AI CLASSIFICATION Display */}
          {aiAnalysis && (
            <div className="bg-slate-800 border-2 border-indigo-500/50 rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-black text-[10px] uppercase tracking-wider">
                    AI Generated
                  </span>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-300">
                    AI CLASSIFICATION
                  </h3>
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-indigo-950 border border-indigo-700 text-indigo-300 font-mono font-bold">
                  AI Confidence: {Math.round((aiAnalysis.confidence || 0.9) * 100)}%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700">
                  <span className="text-slate-400 block mb-0.5 font-semibold">Category</span>
                  <span className="font-bold text-slate-100 text-sm">{aiAnalysis.category}</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700">
                  <span className="text-slate-400 block mb-0.5 font-semibold">Priority</span>
                  <span className="font-bold text-amber-400 text-sm">{aiAnalysis.priority}</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700">
                  <span className="text-slate-400 block mb-0.5 font-semibold">Assigned Department</span>
                  <span className="font-bold text-slate-100 text-sm">{aiAnalysis.department}</span>
                </div>
              </div>

              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <span className="text-indigo-400 font-bold uppercase tracking-wider text-[11px] block mb-1">
                    Why?
                  </span>
                  <p className="p-3 rounded bg-slate-900/60 border border-slate-700 text-slate-200 leading-relaxed italic">
                    "{aiAnalysis.reason}"
                  </p>
                </div>

                {aiAnalysis.recommendedAction && (
                  <div>
                    <span className="text-indigo-400 font-bold uppercase tracking-wider text-[11px] block mb-1">
                      Recommended Action:
                    </span>
                    <p className="p-3 rounded bg-indigo-950/40 border border-indigo-900 text-indigo-100 font-medium leading-relaxed">
                      {aiAnalysis.recommendedAction}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || analyzingText || checkingDuplicates}
            className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all text-base disabled:opacity-50"
          >
            {submitting
              ? 'Submitting Complaint...'
              : analyzingText || checkingDuplicates
              ? 'Running AI Analysis...'
              : 'Submit Complaint'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default NewComplaintPage;
