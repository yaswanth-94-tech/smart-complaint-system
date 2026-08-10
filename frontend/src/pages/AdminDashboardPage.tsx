import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { getAllComplaints } from '../services/complaint.service';
import { Complaint } from '../types/complaint';

export function AdminDashboardPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getAllComplaints()
      .then((data) => {
        setComplaints(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Admin Dashboard fetch error:', err);
        setError('Failed to load system complaints from Firestore.');
        setLoading(false);
      });
  }, []);

  // Compute real metrics from Firestore complaints array
  const metrics = useMemo(() => {
    const total = complaints.length;
    const submitted = complaints.filter((c) => c.status === 'SUBMITTED').length;
    const acknowledged = complaints.filter((c) => c.status === 'ACKNOWLEDGED').length;
    const inProgress = complaints.filter((c) => c.status === 'IN_PROGRESS').length;
    const resolved = complaints.filter((c) => c.status === 'RESOLVED').length;
    const rejected = complaints.filter((c) => c.status === 'REJECTED').length;
    const critical = complaints.filter((c) => c.priority === 'CRITICAL').length;
    const high = complaints.filter((c) => c.priority === 'HIGH').length;

    // Breakdowns
    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byDepartment: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    complaints.forEach((c) => {
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;
      byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;
      byDepartment[c.department] = (byDepartment[c.department] || 0) + 1;
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    });

    const criticalList = complaints.filter((c) => c.priority === 'CRITICAL' && c.status !== 'RESOLVED');
    const recentList = complaints.slice(0, 5);

    return {
      total,
      submitted,
      acknowledged,
      inProgress,
      resolved,
      rejected,
      critical,
      high,
      byCategory,
      byPriority,
      byDepartment,
      byStatus,
      criticalList,
      recentList,
    };
  }, [complaints]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
              Administrator Portal
            </span>
            <h1 className="text-2xl font-bold text-slate-50">Campus System Analytics</h1>
            <p className="text-sm text-slate-400">
              Live monitoring, department performance metrics, and complaint health.
            </p>
          </div>

          <Link
            to="/admin/complaints"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-md transition-all text-sm self-start md:self-auto"
          >
            Manage All Complaints →
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm">Calculating real-time Firestore analytics...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-900/40 border border-red-700 text-red-300 text-sm">
            {error}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Stat Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center shadow-lg">
                <div className="text-2xl font-extrabold text-slate-100">{metrics.total}</div>
                <div className="text-xs text-slate-400 mt-1">Total Issues</div>
              </div>

              <div className="bg-slate-800 border border-blue-900/60 rounded-xl p-4 text-center shadow-lg">
                <div className="text-2xl font-extrabold text-blue-400">{metrics.submitted}</div>
                <div className="text-xs text-slate-400 mt-1">Submitted</div>
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
                <div className="text-xs text-slate-400 mt-1">Critical</div>
              </div>

              <div className="bg-slate-800 border border-amber-900/60 rounded-xl p-4 text-center shadow-lg">
                <div className="text-2xl font-extrabold text-amber-300">{metrics.high}</div>
                <div className="text-xs text-slate-400 mt-1">High Priority</div>
              </div>
            </div>

            {/* Critical Complaints Section */}
            {metrics.criticalList.length > 0 && (
              <div className="bg-red-950/30 border border-red-700/60 rounded-xl p-5 shadow-xl space-y-3">
                <div className="flex items-center space-x-2 border-b border-red-800/60 pb-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                  <h3 className="text-sm font-bold text-red-200 uppercase tracking-wider">
                    Unresolved Critical Complaints ({metrics.criticalList.length})
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {metrics.criticalList.map((item) => (
                    <Link
                      key={item.id}
                      to={`/complaints/${item.id}`}
                      className="bg-slate-900/80 hover:bg-slate-900 border border-red-900/60 rounded-lg p-3 space-y-1 block transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-red-300 truncate">{item.title}</span>
                        <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 font-mono">
                          {item.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center justify-between">
                        <span>📍 {item.location}</span>
                        <span className="text-indigo-400">{item.department}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Breakdown Visual Distribution Meters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Complaints by Department */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-xl space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700 pb-2">
                  Complaints by Department
                </h3>

                <div className="space-y-3">
                  {Object.entries(metrics.byDepartment).map(([dept, count]) => {
                    const pct = metrics.total ? Math.round((count / metrics.total) * 100) : 0;
                    return (
                      <div key={dept} className="space-y-1 text-xs">
                        <div className="flex justify-between text-slate-300">
                          <span className="font-medium">{dept}</span>
                          <span className="font-mono text-slate-400">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Complaints by Category */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-xl space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700 pb-2">
                  Complaints by Category
                </h3>

                <div className="space-y-3">
                  {Object.entries(metrics.byCategory).map(([cat, count]) => {
                    const pct = metrics.total ? Math.round((count / metrics.total) * 100) : 0;
                    return (
                      <div key={cat} className="space-y-1 text-xs">
                        <div className="flex justify-between text-slate-300">
                          <span className="font-medium">{cat}</span>
                          <span className="font-mono text-slate-400">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-purple-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recent Complaints Master Table Preview */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                  Recent System Submissions
                </h3>
                <Link
                  to="/admin/complaints"
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  View All Complaints →
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/60 uppercase text-slate-400 font-mono border-b border-slate-700">
                    <tr>
                      <th className="p-3">Title</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {metrics.recentList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-750 transition-colors">
                        <td className="p-3 font-semibold text-slate-100 max-w-xs truncate">
                          {item.title}
                        </td>
                        <td className="p-3">{item.category}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              item.priority === 'CRITICAL'
                                ? 'bg-red-950 text-red-400 border border-red-800'
                                : item.priority === 'HIGH'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-slate-900 text-slate-300'
                            }`}
                          >
                            {item.priority}
                          </span>
                        </td>
                        <td className="p-3">{item.department}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-slate-300">
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <Link
                            to={`/complaints/${item.id}`}
                            className="text-indigo-400 hover:text-indigo-300 font-semibold"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboardPage;
