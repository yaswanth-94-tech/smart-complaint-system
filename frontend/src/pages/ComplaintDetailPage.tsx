import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { getComplaintById, getComplaintTimeline } from '../services/complaint.service';
import { Complaint, ComplaintUpdate, ComplaintStatus } from '../types/complaint';

export function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [timeline, setTimeline] = useState<ComplaintUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    Promise.all([getComplaintById(id), getComplaintTimeline(id)])
      .then(([complaintData, timelineData]) => {
        if (!complaintData) {
          setError('Complaint not found.');
        } else {
          setComplaint(complaintData);
          setTimeline(timelineData);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch complaint detail error:', err);
        setError('Failed to load complaint details.');
        setLoading(false);
      });
  }, [id]);

  const getStatusBadgeClass = (status: ComplaintStatus) => {
    switch (status) {
      case 'SUBMITTED':
        return 'bg-blue-950 text-blue-300 border-blue-700';
      case 'ACKNOWLEDGED':
        return 'bg-purple-950 text-purple-300 border-purple-700';
      case 'IN_PROGRESS':
        return 'bg-amber-950 text-amber-300 border-amber-700';
      case 'RESOLVED':
        return 'bg-emerald-950 text-emerald-300 border-emerald-700';
      case 'REJECTED':
        return 'bg-red-950 text-red-300 border-red-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-900/40 text-red-300 border-red-700';
      case 'HIGH':
        return 'bg-amber-900/40 text-amber-300 border-amber-700';
      case 'MEDIUM':
        return 'bg-blue-900/40 text-blue-300 border-blue-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">
        <div>
          <Link
            to="/complaints"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1"
          >
            <span>← Back to My Complaints</span>
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm">Loading complaint details...</p>
          </div>
        ) : error || !complaint ? (
          <div className="p-6 rounded-xl bg-red-900/40 border border-red-700 text-red-300 text-sm">
            {error || 'Complaint not found.'}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-700 pb-4">
                <div>
                  <div className="flex items-center space-x-3 mb-1">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(
                        complaint.status
                      )}`}
                    >
                      {complaint.status}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-bold border ${getPriorityBadgeClass(
                        complaint.priority
                      )}`}
                    >
                      {complaint.priority} Priority
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-slate-50">{complaint.title}</h1>
                </div>

                <div className="text-right text-xs text-slate-400 font-mono">
                  <div>ID: {complaint.id}</div>
                  <div>
                    Submitted:{' '}
                    {new Date(complaint.createdAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </div>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
                  <span className="text-slate-400 block mb-0.5">Category</span>
                  <span className="font-semibold text-slate-100 text-sm">{complaint.category}</span>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
                  <span className="text-slate-400 block mb-0.5">Assigned Department</span>
                  <span className="font-semibold text-slate-100 text-sm">{complaint.department}</span>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
                  <span className="text-slate-400 block mb-0.5">Campus Location</span>
                  <span className="font-semibold text-slate-100 text-sm">📍 {complaint.location}</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Description
                </h3>
                <p className="text-sm text-slate-200 bg-slate-900/40 p-4 rounded-lg border border-slate-700/50 leading-relaxed whitespace-pre-line">
                  {complaint.description}
                </p>
              </div>

              {/* Image Preview */}
              {complaint.imageUrl && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Attached Image
                  </h3>
                  <a
                    href={complaint.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block group"
                  >
                    <img
                      src={complaint.imageUrl}
                      alt="Complaint attachment"
                      className="max-h-72 rounded-lg border border-slate-700 object-cover group-hover:opacity-90 transition-opacity shadow-md"
                    />
                  </a>
                </div>
              )}
            </div>

            {/* AI Analysis Breakdown */}
            {complaint.aiAnalysis && (
              <div className="bg-slate-800 border border-indigo-500/40 rounded-xl p-6 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-300">
                      Gemini AI Analysis Breakdown
                    </h3>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded bg-indigo-950 border border-indigo-700 text-indigo-300 font-mono font-bold">
                    Confidence: {Math.round(complaint.aiAnalysis.confidence * 100)}%
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">AI Summary</span>
                    <p className="text-sm font-medium text-slate-200 bg-slate-900/60 p-3 rounded border border-slate-800">
                      {complaint.aiAnalysis.summary}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">Classification Rationale</span>
                    <p className="text-slate-300 bg-slate-900/60 p-3 rounded border border-slate-800 italic">
                      "{complaint.aiAnalysis.reason}"
                    </p>
                  </div>

                  {complaint.aiAnalysis.recommendedAction && (
                    <div>
                      <span className="text-slate-400 block mb-0.5">Recommended Action</span>
                      <p className="text-slate-200 bg-indigo-950/40 p-3 rounded border border-indigo-900 font-medium">
                        {complaint.aiAnalysis.recommendedAction}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeline Progress Section */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl space-y-6">
              <div className="border-b border-slate-700 pb-3">
                <h3 className="text-lg font-bold text-slate-100">Status Progression Timeline</h3>
                <p className="text-xs text-slate-400">
                  Track real-time status updates and department action history.
                </p>
              </div>

              {timeline.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No timeline history recorded.</p>
              ) : (
                <div className="relative border-l-2 border-slate-700 ml-4 space-y-6 pl-6 py-2">
                  {timeline.map((update, idx) => (
                    <div key={update.id || idx} className="relative group">
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-indigo-500 bg-slate-900 shadow" />

                      <div className="bg-slate-900/60 border border-slate-700/60 rounded-lg p-4 space-y-1.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2.5 py-0.5 rounded text-xs font-bold border ${getStatusBadgeClass(
                              update.status
                            )}`}
                          >
                            {update.status}
                          </span>

                          <span className="text-xs font-mono text-slate-500">
                            {new Date(update.createdAt).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>

                        <p className="text-sm text-slate-200 pt-1">{update.message}</p>

                        <div className="text-xs text-slate-400 pt-1 border-t border-slate-800/80 flex items-center justify-between">
                          <span>Updated by: <strong className="text-slate-300">{update.updatedBy}</strong></span>
                          <span className="font-mono text-indigo-400">({update.updatedByRole})</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ComplaintDetailPage;
