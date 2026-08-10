import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { getAllComplaints } from '../services/complaint.service';
import { Complaint } from '../types/complaint';

export interface RecurringIssueCluster {
  id: string;
  issue: string;
  category: string;
  location: string;
  complaintCount: number;
  affectedStudentsCount: number;
  department: string;
  priority: string;
  firstReported: string;
  lastReported: string;
}

export function AdminAnalyticsPage() {
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
        console.error('Analytics page fetch error:', err);
        setError('Failed to load system complaints for analytics.');
        setLoading(false);
      });
  }, []);

  // Compute real metrics and statistics from Firestore complaints
  const analytics = useMemo(() => {
    const total = complaints.length;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const complaintsThisWeek = complaints.filter(
      (c) => new Date(c.createdAt) >= sevenDaysAgo
    ).length;

    const complaintsThisMonth = complaints.filter(
      (c) => new Date(c.createdAt) >= thirtyDaysAgo
    ).length;

    const resolvedList = complaints.filter((c) => c.status === 'RESOLVED');
    const resolutionRate = total > 0 ? Math.round((resolvedList.length / total) * 100) : 0;

    // Average resolution time in hours
    let totalResolutionHours = 0;
    let resolvedWithTimestampsCount = 0;

    resolvedList.forEach((c) => {
      if (c.createdAt && c.resolvedAt) {
        const start = new Date(c.createdAt).getTime();
        const end = new Date(c.resolvedAt).getTime();
        if (end >= start) {
          totalResolutionHours += (end - start) / (1000 * 60 * 60);
          resolvedWithTimestampsCount++;
        }
      }
    });

    const avgResolutionTimeHours =
      resolvedWithTimestampsCount > 0
        ? Math.round((totalResolutionHours / resolvedWithTimestampsCount) * 10) / 10
        : 0;

    const criticalCount = complaints.filter((c) => c.priority === 'CRITICAL').length;

    // Frequencies
    const categoryFreq: Record<string, number> = {};
    const locationFreq: Record<string, number> = {};
    const deptFreq: Record<string, number> = {};
    const priorityFreq: Record<string, number> = {};
    const statusFreq: Record<string, number> = {};

    complaints.forEach((c) => {
      categoryFreq[c.category] = (categoryFreq[c.category] || 0) + 1;
      locationFreq[c.location] = (locationFreq[c.location] || 0) + 1;
      deptFreq[c.department] = (deptFreq[c.department] || 0) + 1;
      priorityFreq[c.priority] = (priorityFreq[c.priority] || 0) + 1;
      statusFreq[c.status] = (statusFreq[c.status] || 0) + 1;
    });

    const getTopKey = (freq: Record<string, number>): string => {
      let topKey = 'N/A';
      let maxVal = -1;
      Object.entries(freq).forEach(([k, v]) => {
        if (v > maxVal) {
          maxVal = v;
          topKey = k;
        }
      });
      return topKey;
    };

    const mostCommonCategory = getTopKey(categoryFreq);
    const mostProblematicLocation = getTopKey(locationFreq);
    const mostActiveDepartment = getTopKey(deptFreq);

    // Grouping complaints into RECURRING CAMPUS ISSUES by category + location
    const clusterMap: Record<string, Complaint[]> = {};
    complaints.forEach((c) => {
      const key = `${c.category.trim()} @ ${c.location.trim()}`;
      if (!clusterMap[key]) {
        clusterMap[key] = [];
      }
      clusterMap[key].push(c);
    });

    const recurringClusters: RecurringIssueCluster[] = Object.entries(clusterMap)
      .map(([key, items], idx) => {
        const [cat, loc] = key.split(' @ ');
        const studentIds = new Set(items.map((i) => i.userId));

        // Find highest priority in cluster
        const priorityWeight: Record<string, number> = {
          CRITICAL: 4,
          HIGH: 3,
          MEDIUM: 2,
          LOW: 1,
        };

        let highestPriority = 'LOW';
        let maxW = 0;
        items.forEach((i) => {
          const w = priorityWeight[i.priority] || 0;
          if (w > maxW) {
            maxW = w;
            highestPriority = i.priority;
          }
        });

        // Dates
        const dates = items.map((i) => new Date(i.createdAt).getTime()).sort((a, b) => a - b);
        const firstReported = new Date(dates[0]).toLocaleDateString();
        const lastReported = new Date(dates[dates.length - 1]).toLocaleDateString();

        return {
          id: `cluster_${idx + 1}`,
          issue: `Recurring ${cat} problem reported at ${loc}`,
          category: cat,
          location: loc,
          complaintCount: items.length,
          affectedStudentsCount: studentIds.size,
          department: items[0].department,
          priority: highestPriority,
          firstReported,
          lastReported,
        };
      })
      .sort((a, b) => b.complaintCount - a.complaintCount);

    return {
      total,
      complaintsThisWeek,
      complaintsThisMonth,
      resolutionRate,
      avgResolutionTimeHours,
      criticalCount,
      mostCommonCategory,
      mostProblematicLocation,
      mostActiveDepartment,
      categoryFreq,
      priorityFreq,
      deptFreq,
      statusFreq,
      recurringClusters,
    };
  }, [complaints]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
              System Intelligence & Analytics
            </span>
            <h1 className="text-2xl font-bold text-slate-50">Recurring Campus Issue Analytics</h1>
            <p className="text-sm text-slate-400">
              Real-time resolution benchmarks, department workloads, and automated problem clustering.
            </p>
          </div>

          <Link
            to="/admin/complaints"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg border border-slate-700 transition-all text-sm self-start md:self-auto"
          >
            ← Master Complaint List
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm">Calculating intelligence analytics from Firestore...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-900/40 border border-red-700 text-red-300 text-sm">
            {error}
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg space-y-1">
                <span className="text-xs font-semibold text-slate-400 block uppercase">
                  Total Complaints
                </span>
                <div className="text-2xl font-extrabold text-slate-100">{analytics.total}</div>
                <div className="text-[11px] text-slate-400">
                  {analytics.complaintsThisWeek} this week • {analytics.complaintsThisMonth} this month
                </div>
              </div>

              <div className="bg-slate-800 border border-emerald-900/60 rounded-xl p-4 shadow-lg space-y-1">
                <span className="text-xs font-semibold text-slate-400 block uppercase">
                  Resolution Rate
                </span>
                <div className="text-2xl font-extrabold text-emerald-400">
                  {analytics.resolutionRate}%
                </div>
                <div className="text-[11px] text-slate-400">Resolved issues ratio</div>
              </div>

              <div className="bg-slate-800 border border-blue-900/60 rounded-xl p-4 shadow-lg space-y-1">
                <span className="text-xs font-semibold text-slate-400 block uppercase">
                  Avg Resolution Time
                </span>
                <div className="text-2xl font-extrabold text-blue-400">
                  {analytics.avgResolutionTimeHours} <span className="text-xs font-normal text-slate-400">hrs</span>
                </div>
                <div className="text-[11px] text-slate-400">Mean time from submit to resolve</div>
              </div>

              <div className="bg-slate-800 border border-purple-900/60 rounded-xl p-4 shadow-lg space-y-1">
                <span className="text-xs font-semibold text-slate-400 block uppercase">
                  Top Category
                </span>
                <div className="text-lg font-bold text-purple-300 truncate">
                  {analytics.mostCommonCategory}
                </div>
                <div className="text-[11px] text-slate-400">Most frequent campus issue</div>
              </div>

              <div className="bg-slate-800 border border-amber-900/60 rounded-xl p-4 shadow-lg space-y-1">
                <span className="text-xs font-semibold text-slate-400 block uppercase">
                  Problematic Location
                </span>
                <div className="text-lg font-bold text-amber-300 truncate">
                  📍 {analytics.mostProblematicLocation}
                </div>
                <div className="text-[11px] text-slate-400">Highest issue hotspot</div>
              </div>
            </div>

            {/* Recurring Campus Issues Section */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-50 flex items-center space-x-2">
                    <span>🔁</span>
                    <span>Recurring Campus Issues (Pattern Detection)</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Automated clustering of repeated building issues and affected student counts.
                  </p>
                </div>
              </div>

              {analytics.recurringClusters.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No complaint patterns detected.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/80 uppercase text-slate-400 font-mono border-b border-slate-700">
                      <tr>
                        <th className="p-3">Detected Pattern</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Location</th>
                        <th className="p-3">Complaints</th>
                        <th className="p-3">Students</th>
                        <th className="p-3">Department</th>
                        <th className="p-3">Priority</th>
                        <th className="p-3">First Reported</th>
                        <th className="p-3">Last Reported</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60">
                      {analytics.recurringClusters.map((cluster) => (
                        <tr key={cluster.id} className="hover:bg-slate-750 transition-colors">
                          <td className="p-3 font-bold text-slate-100 max-w-xs truncate">
                            {cluster.issue}
                          </td>
                          <td className="p-3 font-medium text-slate-300">{cluster.category}</td>
                          <td className="p-3 font-medium text-slate-300">📍 {cluster.location}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700 font-bold font-mono">
                              {cluster.complaintCount}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-300">
                            👥 {cluster.affectedStudentsCount}
                          </td>
                          <td className="p-3 text-slate-300">{cluster.department}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded font-bold border ${
                                cluster.priority === 'CRITICAL'
                                  ? 'bg-red-950 text-red-300 border-red-700'
                                  : cluster.priority === 'HIGH'
                                  ? 'bg-amber-950 text-amber-300 border-amber-700'
                                  : 'bg-slate-900 text-slate-300 border-slate-700'
                              }`}
                            >
                              {cluster.priority}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-400">{cluster.firstReported}</td>
                          <td className="p-3 font-mono text-slate-400">{cluster.lastReported}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Visual Distribution Meters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category Distribution */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-xl space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700 pb-2">
                  Category Breakdown
                </h3>
                <div className="space-y-3">
                  {Object.entries(analytics.categoryFreq).map(([cat, count]) => {
                    const pct = analytics.total ? Math.round((count / analytics.total) * 100) : 0;
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
                            className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Priority Distribution */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-xl space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700 pb-2">
                  Priority Breakdown
                </h3>
                <div className="space-y-3">
                  {Object.entries(analytics.priorityFreq).map(([prio, count]) => {
                    const pct = analytics.total ? Math.round((count / analytics.total) * 100) : 0;
                    const colorClass =
                      prio === 'CRITICAL'
                        ? 'bg-red-500'
                        : prio === 'HIGH'
                        ? 'bg-amber-500'
                        : prio === 'MEDIUM'
                        ? 'bg-blue-500'
                        : 'bg-slate-500';

                    return (
                      <div key={prio} className="space-y-1 text-xs">
                        <div className="flex justify-between text-slate-300">
                          <span className="font-medium">{prio}</span>
                          <span className="font-mono text-slate-400">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                          <div
                            className={`${colorClass} h-full rounded-full transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminAnalyticsPage;
