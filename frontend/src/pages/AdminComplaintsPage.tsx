import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Navigation from '../components/Navigation';
import { getAllComplaints, updateComplaintStatus } from '../services/complaint.service';
import {
  Complaint,
  ComplaintStatus,
  ComplaintPriority,
  ComplaintCategory,
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

export function AdminComplaintsPage() {
  const { userProfile } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest');

  // Management Modal state
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [newStatus, setNewStatus] = useState<ComplaintStatus>('SUBMITTED');
  const [newPriority, setNewPriority] = useState<ComplaintPriority>('MEDIUM');
  const [newDepartment, setNewDepartment] = useState<string>('Other');
  const [actionNote, setActionNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const fetchComplaints = () => {
    setLoading(true);
    getAllComplaints()
      .then((data) => {
        setComplaints(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch all complaints error:', err);
        setError('Failed to load complaints from Firestore.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const openManageModal = (c: Complaint) => {
    setSelectedComplaint(c);
    setNewStatus(c.status);
    setNewPriority(c.priority as ComplaintPriority);
    setNewDepartment(c.department);
    setActionNote('');
    setUpdateError(null);
  };

  const closeManageModal = () => {
    setSelectedComplaint(null);
    setActionNote('');
    setUpdateError(null);
  };

  const handleApplyAdminUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !selectedComplaint.id || !userProfile) return;

    if (!actionNote.trim()) {
      setUpdateError('Please enter an internal note or reason for this administrative update.');
      return;
    }

    setUpdating(true);
    setUpdateError(null);

    try {
      const adminName = userProfile.name || 'System Admin';
      await updateComplaintStatus(
        selectedComplaint.id,
        newStatus,
        actionNote.trim(),
        adminName,
        'admin',
        {
          department: newDepartment,
          priority: newPriority,
        }
      );

      closeManageModal();
      fetchComplaints();
    } catch (err: any) {
      console.error('Admin update complaint error:', err);
      setUpdateError(err.message || 'Failed to update complaint.');
    } finally {
      setUpdating(false);
    }
  };

  // Filter and sort complaints
  const filteredComplaints = useMemo(() => {
    return complaints
      .filter((item) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = item.title.toLowerCase().includes(q);
          const matchesDesc = item.description.toLowerCase().includes(q);
          const matchesLoc = item.location.toLowerCase().includes(q);
          if (!matchesTitle && !matchesDesc && !matchesLoc) return false;
        }

        if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
        if (priorityFilter !== 'ALL' && item.priority !== priorityFilter) return false;
        if (departmentFilter !== 'ALL' && item.department !== departmentFilter) return false;
        if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'priority') {
          const weight: Record<string, number> = {
            CRITICAL: 4,
            HIGH: 3,
            MEDIUM: 2,
            LOW: 1,
          };
          return (weight[b.priority] || 0) - (weight[a.priority] || 0);
        }
        return 0;
      });
  }, [
    complaints,
    searchQuery,
    statusFilter,
    priorityFilter,
    departmentFilter,
    categoryFilter,
    sortBy,
  ]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
              Administrator Master Console
            </span>
            <h1 className="text-2xl font-bold text-slate-50">Master Complaint Management</h1>
            <p className="text-sm text-slate-400">
              Reassign departments, override priorities, update resolution statuses, and rejection notes.
            </p>
          </div>

          <Link
            to="/admin"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg border border-slate-700 transition-all text-sm self-start md:self-auto"
          >
            ← View Analytics
          </Link>
        </div>

        {/* Filter Control Bar */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search all complaints..."
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Department</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="priority">Highest Priority</option>
              </select>
            </div>
          </div>
        </div>

        {/* Master Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm">Loading master complaint data...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-900/40 border border-red-700 text-red-300 text-sm">
            {error}
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-12 text-center text-slate-400">
            No complaints match the selected filter criteria.
          </div>
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 uppercase text-slate-400 font-mono border-b border-slate-700">
                  <tr>
                    <th className="p-3.5">Title & Location</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Assigned Dept</th>
                    <th className="p-3.5">Priority</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {filteredComplaints.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-750 transition-colors">
                      <td className="p-3.5 max-w-xs space-y-0.5">
                        <Link
                          to={`/complaints/${item.id}`}
                          className="font-bold text-slate-100 hover:text-indigo-300 transition-colors block truncate"
                        >
                          {item.title}
                        </Link>
                        <div className="text-slate-400 text-[11px] truncate">📍 {item.location}</div>
                        {item.duplicateGroupId && (
                          <div className="pt-0.5">
                            <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-mono font-bold inline-block">
                              🔗 Group: {item.duplicateGroupId}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">{item.category}</td>

                      <td className="p-3.5 font-medium text-slate-200">{item.department}</td>

                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded font-bold border ${
                            item.priority === 'CRITICAL'
                              ? 'bg-red-950 text-red-300 border-red-700'
                              : item.priority === 'HIGH'
                              ? 'bg-amber-950 text-amber-300 border-amber-700'
                              : item.priority === 'MEDIUM'
                              ? 'bg-blue-950 text-blue-300 border-blue-700'
                              : 'bg-slate-900 text-slate-300 border-slate-700'
                          }`}
                        >
                          {item.priority}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-slate-200">
                          {item.status}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>

                      <td className="p-3.5 text-right space-x-2">
                        <Link
                          to={`/complaints/${item.id}`}
                          className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-semibold transition-colors inline-block"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => openManageModal(item)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-semibold transition-colors inline-block shadow"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Management Modal */}
        {selectedComplaint && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in">
              <div className="flex items-start justify-between border-b border-slate-700 pb-3">
                <div>
                  <span className="text-xs font-mono font-bold text-indigo-400">ADMIN CONTROL</span>
                  <h3 className="text-lg font-bold text-slate-100">{selectedComplaint.title}</h3>
                </div>
                <button
                  onClick={closeManageModal}
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

              <form onSubmit={handleApplyAdminUpdate} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Reassign Department
                  </label>
                  <select
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Override Priority
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as ComplaintPriority)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Status State</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as ComplaintStatus)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="SUBMITTED">SUBMITTED</option>
                      <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Internal Note / Update Reason *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    placeholder="Provide a clear reason or administrative note for this status/department update..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={closeManageModal}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={updating}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-md transition-all disabled:opacity-50"
                  >
                    {updating ? 'Saving...' : 'Apply Admin Updates'}
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

export default AdminComplaintsPage;
