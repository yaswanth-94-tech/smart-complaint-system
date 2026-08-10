import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Navigation from '../components/Navigation';
import { getDepartmentComplaints, updateComplaintStatus } from '../services/complaint.service';
import { Complaint, ComplaintStatus } from '../types/complaint';

export function DepartmentDashboardPage() {
  const { userProfile } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status Action Modal state
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [targetStatus, setTargetStatus] = useState<ComplaintStatus>('ACKNOWLEDGED');
  const [actionNote, setActionNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const staffDepartment = userProfile?.department || 'IT Department';

  const fetchDepartmentData = () => {
    setLoading(true);
    getDepartmentComplaints(staffDepartment)
      .then((data) => {
        setComplaints(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch department complaints error:', err);
        setError('Failed to load department complaints from Firestore.');
        setLoading(false);
      });
  };

  useEffect(() => {
    if (staffDepartment) {
      fetchDepartmentData();
    }
  }, [staffDepartment]);

  // Compute departmental metric counts
  const metrics = useMemo(() => {
    const total = complaints.length;
    const submitted = complaints.filter((c) => c.status === 'SUBMITTED').length;
    const acknowledged = complaints.filter((c) => c.status === 'ACKNOWLEDGED').length;
    const inProgress = complaints.filter((c) => c.status === 'IN_PROGRESS').length;
    const resolved = complaints.filter((c) => c.status === 'RESOLVED').length;
    const critical = complaints.filter((c) => c.priority === 'CRITICAL').length;

    return { total, submitted, acknowledged, inProgress, resolved, critical };
  }, [complaints]);

  const openActionModal = (c: Complaint, nextStatus: ComplaintStatus) => {
    setSelectedComplaint(c);
    setTargetStatus(nextStatus);
    setActionNote(
      nextStatus === 'ACKNOWLEDGED'
        ? 'Complaint acknowledged by department staff.'
        : nextStatus === 'IN_PROGRESS'
        ? 'Work initiated by maintenance team.'
        : nextStatus === 'RESOLVED'
        ? 'Issue has been successfully inspected and resolved.'
        : ''
    );
    setUpdateError(null);
  };

  const closeActionModal = () => {
    setSelectedComplaint(null);
    setActionNote('');
    setUpdateError(null);
  };

  const handleApplyStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !selectedComplaint.id || !userProfile) return;

    if (!actionNote.trim()) {
      setUpdateError('Please enter a work note or status comment.');
      return;
    }

    setUpdating(true);
    setUpdateError(null);

    try {
      const officerName = userProfile.name || 'Department Officer';
      await updateComplaintStatus(
        selectedComplaint.id,
        targetStatus,
        actionNote.trim(),
        officerName,
        'department_staff'
      );

      closeActionModal();
      fetchDepartmentData();
    } catch (err: any) {
      console.error('Department status update error:', err);
      setUpdateError(err.message || 'Failed to update complaint status.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
              Department Portal
            </span>
            <h1 className="text-2xl font-bold text-slate-50">{staffDepartment} Queue</h1>
            <p className="text-sm text-slate-400">
              Manage, acknowledge, and resolve complaints assigned strictly to your department.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm">Loading department complaint queue...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-900/40 border border-red-700 text-red-300 text-sm">
            {error}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center shadow-lg">
                <div className="text-2xl font-extrabold text-slate-100">{metrics.total}</div>
                <div className="text-xs text-slate-400 mt-1">Assigned Total</div>
              </div>

              <div className="bg-slate-800 border border-blue-900/60 rounded-xl p-4 text-center shadow-lg">
                <div className="text-2xl font-extrabold text-blue-400">{metrics.submitted}</div>
                <div className="text-xs text-slate-400 mt-1">New Submissions</div>
              </div>

              <div className="bg-slate-800 border border-purple-900/60 rounded-xl p-4 text-center shadow-lg">
                <div className="text-2xl font-extrabold text-purple-400">{metrics.acknowledged}</div>
                <div className="text-xs text-slate-400 mt-1">Acknowledged</div>
              </div>

              <div className="bg-slate-800 border border-amber-900/60 rounded-xl p-4 text-center shadow-lg">
                <div className="text-2xl font-extrabold text-amber-400">{metrics.inProgress}</div>
                <div className="text-xs text-slate-400 mt-1">In Progress</div>
              </div>

              <div className="bg-slate-800 border border-emerald-900/60 rounded-xl p-4 text-center shadow-lg">
                <div className="text-2xl font-extrabold text-emerald-400">{metrics.resolved}</div>
                <div className="text-xs text-slate-400 mt-1">Resolved</div>
              </div>

              <div className="bg-slate-800 border border-red-900/60 rounded-xl p-4 text-center shadow-lg">
                <div className="text-2xl font-extrabold text-red-400">{metrics.critical}</div>
                <div className="text-xs text-slate-400 mt-1">Critical Priority</div>
              </div>
            </div>

            {/* Department Queue List */}
            {complaints.length === 0 ? (
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-12 text-center text-slate-400">
                🎉 No active complaints assigned to <strong>{staffDepartment}</strong> at this time.
              </div>
            ) : (
              <div className="space-y-4">
                {complaints.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-700 pb-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span
                            className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                              item.priority === 'CRITICAL'
                                ? 'bg-red-950 text-red-300 border-red-700'
                                : item.priority === 'HIGH'
                                ? 'bg-amber-950 text-amber-300 border-amber-700'
                                : 'bg-slate-900 text-slate-300 border-slate-700'
                            }`}
                          >
                            {item.priority}
                          </span>
                          <span className="px-2.5 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-xs text-slate-200">
                            {item.status}
                          </span>
                          <span className="text-xs text-slate-400">📁 {item.category}</span>
                        </div>
                        <h2 className="text-lg font-bold text-slate-100">{item.title}</h2>
                      </div>

                      <div className="text-xs text-slate-400 font-mono">
                        Submitted: {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                      <div className="text-slate-400">📍 Location: <strong className="text-slate-200">{item.location}</strong></div>

                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/complaints/${item.id}`}
                          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-semibold transition-colors"
                        >
                          View Details
                        </Link>

                        {item.status === 'SUBMITTED' && (
                          <button
                            onClick={() => openActionModal(item, 'ACKNOWLEDGED')}
                            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold transition-colors shadow"
                          >
                            Acknowledge
                          </button>
                        )}

                        {item.status === 'ACKNOWLEDGED' && (
                          <button
                            onClick={() => openActionModal(item, 'IN_PROGRESS')}
                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold transition-colors shadow"
                          >
                            Start Work
                          </button>
                        )}

                        {item.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => openActionModal(item, 'RESOLVED')}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors shadow"
                          >
                            Mark Resolved
                          </button>
                        )}

                        {item.status !== 'RESOLVED' && item.status !== 'REJECTED' && (
                          <button
                            onClick={() => openActionModal(item, 'REJECTED')}
                            className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-700 rounded-lg font-semibold transition-colors"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Status Action Modal */}
        {selectedComplaint && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-start justify-between border-b border-slate-700 pb-3">
                <div>
                  <span className="text-xs font-mono font-bold text-indigo-400 uppercase">
                    Status Transition: {targetStatus}
                  </span>
                  <h3 className="text-base font-bold text-slate-100">{selectedComplaint.title}</h3>
                </div>
                <button
                  onClick={closeActionModal}
                  className="text-slate-400 hover:text-white font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              {updateError && (
                <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-xs">
                  {updateError}
                </div>
              )}

              <form onSubmit={handleApplyStatusUpdate} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Work Progress / Resolution Note *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    placeholder="Enter details about actions taken or reason for status update..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={closeActionModal}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={updating}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-md transition-all disabled:opacity-50"
                  >
                    {updating ? 'Updating...' : `Confirm ${targetStatus}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default DepartmentDashboardPage;
