import React, { useState } from 'react';
import { analyzeComplaint, AIAnalysisData } from '../services/api';

export function ComplaintAnalyzerTest() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AIAnalysisData | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!title.trim() || !description.trim()) {
      setError('Please provide both a title and a description for your complaint.');
      return;
    }

    setLoading(true);

    try {
      const response = await analyzeComplaint({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
      });
      setResult(response.data);
    } catch (err: any) {
      console.error('Complaint analysis error:', err);
      setError(err.message || 'Failed to analyze complaint with AI');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-950 text-red-300 border-red-700';
      case 'HIGH':
        return 'bg-amber-950 text-amber-300 border-amber-700';
      case 'MEDIUM':
        return 'bg-blue-950 text-blue-300 border-blue-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl space-y-6">
      <div className="flex items-center space-x-3 border-b border-slate-700 pb-4">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow">
          AI
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-100">Smart Complaint AI Analyzer</h2>
          <p className="text-xs text-slate-400">
            Powered by Gemini AI (Backend Express Route `POST /api/complaints/analyze`)
          </p>
        </div>
      </div>

      <form onSubmit={handleAnalyze} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            Complaint Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Wi-Fi problem"
            className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            Detailed Description *
          </label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Wi-Fi is not working in CSE block since morning..."
            className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            Campus Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. CSE Block, Room 302"
            className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-indigo-500/20 transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Analyzing with Gemini AI...</span>
            </>
          ) : (
            <span>Analyze Complaint</span>
          )}
        </button>
      </form>

      {/* Error Display */}
      {error && (
        <div className="p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm space-y-1">
          <span className="font-bold">Analysis Failed:</span>
          <p>{error}</p>
        </div>
      )}

      {/* AI Result Card */}
      {result && (
        <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span>AI Analysis Result</span>
            </span>
            <span className="text-xs px-2.5 py-1 rounded bg-indigo-950 border border-indigo-700 text-indigo-300 font-mono font-bold">
              Confidence: {Math.round(result.confidence * 100)}%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60">
              <span className="text-slate-400 text-xs block mb-1">Category</span>
              <span className="font-semibold text-slate-100 text-sm">{result.category}</span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60">
              <span className="text-slate-400 text-xs block mb-1">Priority</span>
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${getPriorityBadgeClass(result.priority)}`}>
                {result.priority}
              </span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60">
              <span className="text-slate-400 text-xs block mb-1">Department</span>
              <span className="font-semibold text-slate-100 text-sm">{result.department}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-slate-400 text-xs block">AI Summary</span>
              <p className="text-sm font-medium text-slate-200 bg-slate-800/50 p-2.5 rounded border border-slate-800">
                {result.summary}
              </p>
            </div>

            <div>
              <span className="text-slate-400 text-xs block">Classification Reason</span>
              <p className="text-xs text-slate-300 bg-slate-800/50 p-2.5 rounded border border-slate-800 italic">
                "{result.reason}"
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComplaintAnalyzerTest;
