import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Navigation from '../components/Navigation';
import { getUserComplaints } from '../services/complaint.service';
import { Complaint, ComplaintStatus, ComplaintPriority } from '../types/complaint';

export function ComplaintsListPage() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest');

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    getUserComplaints(user.uid)
      .then((data) => {
        setComplaints(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch user complaints error:', err);
        setError('Failed to load complaints.');
        setLoading(false);
      });
  }, [user]);

  // Filter and sort complaints dynamically
  const filteredComplaints = useMemo(() => {
    return complaints
      .filter((item) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = item.title.toLowerCase().includes(q);
          const matchesDesc = item.description.toLowerCase().includes(q);
          const matchesLoc = item.location.toLowerCase().includes(q);
          if (!matchesTitle && !matchesDesc && !matchesLoc) return false;
        }

        // Status filter
        if (statusFilter !== 'ALL' && item.status !== statusFilter) {
          return false;
        }

        // Priority filter
        if (priorityFilter !== 'ALL' && item.priority !== priorityFilter) {
          return false;
        }

        // Category filter
        if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
          return false;
        }

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
          const weightA = weight[a.priority] || 0;
          const weightB = weight[b.priority] || 0;
          return weightB - weightA;
        }
        return 0;
      });
  }, [complaints, searchQuery, statusFilter, priorityFilter, categoryFilter, sortBy]);

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

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">My Complaints</h1>
            <p className="text-sm text-slate-400">
              Track and monitor the status of your submitted campus issues.
            </p>
          </div>

          <Link
            to="/complaints/new"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-md transition-all text-sm self-start md:self-auto"
          >
            + Submit New Complaint
          </Link>
        </div>

        {/* Search, Filters, and Sorting Control Panel */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-400 mb-1">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search complaints..."
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
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

        {/* Complaints Grid / List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm">Loading your complaints...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-900/40 border border-red-700 text-red-300 text-sm">
            {error}
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center mx-auto text-slate-400 font-bold text-xl">
              📋
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-200">No Complaints Found</h3>
              <p className="text-sm text-slate-400">
                {complaints.length === 0
                  ? "You haven't submitted any complaints yet."
                  : 'No complaints match your current search and filter criteria.'}
              </p>
            </div>
            {complaints.length === 0 && (
              <Link
                to="/complaints/new"
                className="inline-block py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Submit Your First Complaint
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredComplaints.map((item) => (
              <Link
                key={item.id}
                to={`/complaints/${item.id}`}
                className="block bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 rounded-xl p-5 shadow-lg transition-all space-y-3 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                      {item.title}
                    </h2>
                    <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${getStatusBadgeClass(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 border-t border-slate-700/60 pt-3 gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="bg-slate-900 px-2.5 py-1 rounded border border-slate-700 text-slate-300 font-medium">
                      📁 {item.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-semibold border ${getPriorityBadgeClass(
                        item.priority
                      )}`}
                    >
                      {item.priority}
                    </span>
                    <span className="text-slate-400">📍 {item.location}</span>
                  </div>

                  <span className="font-mono text-slate-500">
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default ComplaintsListPage;
