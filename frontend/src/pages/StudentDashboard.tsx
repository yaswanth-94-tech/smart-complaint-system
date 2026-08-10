import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Navigation from '../components/Navigation';
import { getUserComplaints } from '../services/complaint.service';
import { Complaint } from '../types/complaint';

export function StudentDashboard() {
  const { user, userProfile } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getUserComplaints(user.uid)
      .then((data) => {
        setComplaints(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch student complaints overview error:', err);
        setLoading(false);
      });
  }, [user]);

  const activeCount = complaints.filter(
    (c) => c.status === 'SUBMITTED' || c.status === 'ACKNOWLEDGED' || c.status === 'IN_PROGRESS'
  ).length;

  const resolvedCount = complaints.filter((c) => c.status === 'RESOLVED').length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        {/* Welcome Banner */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700 pb-4">
            <div>
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
                Student Portal
              </span>
              <h1 className="text-2xl font-bold text-slate-50">Welcome, {userProfile?.name}!</h1>
              <p className="text-sm text-slate-400">
                Submit campus complaints and let Gemini AI categorize & assign them automatically.
              </p>
            </div>

            <Link
              to="/complaints/new"
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all text-sm flex items-center justify-center space-x-2 self-start md:self-auto hover:scale-105 active:scale-95"
            >
              <span className="text-lg">+</span>
              <span>Submit New Complaint</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50 space-y-1">
              <span className="text-slate-400 text-xs uppercase font-semibold">Total Submitted</span>
              <p className="text-2xl font-extrabold text-slate-100">{complaints.length}</p>
            </div>
            <div className="bg-slate-900/60 p-4 rounded-xl border border-amber-900/40 space-y-1">
              <span className="text-slate-400 text-xs uppercase font-semibold">Active & In Progress</span>
              <p className="text-2xl font-extrabold text-amber-400">{activeCount}</p>
            </div>
            <div className="bg-slate-900/60 p-4 rounded-xl border border-emerald-900/40 space-y-1">
              <span className="text-slate-400 text-xs uppercase font-semibold">Resolved Issues</span>
              <p className="text-2xl font-extrabold text-emerald-400">{resolvedCount}</p>
            </div>
          </div>
        </div>

        {/* Quick Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Submit New Complaint Card */}
          <Link
            to="/complaints/new"
            className="bg-gradient-to-br from-indigo-900/40 to-slate-800 border border-indigo-500/40 hover:border-indigo-400 rounded-2xl p-6 shadow-xl transition-all group hover:scale-[1.01]"
          >
            <div className="flex items-center space-x-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                ✍️
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                  Submit a New Complaint
                </h3>
                <p className="text-xs text-slate-400">
                  Report Wi-Fi, classroom, electrical, or hostel issues with instant Gemini AI classification.
                </p>
              </div>
            </div>
            <div className="text-xs font-semibold text-indigo-400 flex items-center space-x-1 pt-2">
              <span>Open Submission Form →</span>
            </div>
          </Link>

          {/* View My Complaints Card */}
          <Link
            to="/complaints"
            className="bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 rounded-2xl p-6 shadow-xl transition-all group hover:scale-[1.01]"
          >
            <div className="flex items-center space-x-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-slate-700 text-white font-bold text-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                📋
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                  View My Complaints ({complaints.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Search, filter, and track real-time resolution progress and department updates.
                </p>
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-400 flex items-center space-x-1 pt-2">
              <span>Go to Complaints List →</span>
            </div>
          </Link>
        </div>

        {/* Recent Student Complaints Preview */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Your Recent Complaints
            </h3>
            <Link to="/complaints" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
              View All ({complaints.length}) →
            </Link>
          </div>

          {loading ? (
            <div className="p-6 text-center text-slate-400 text-xs">Loading complaints...</div>
          ) : complaints.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm text-slate-400">You haven't submitted any complaints yet.</p>
              <Link
                to="/complaints/new"
                className="inline-block py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors shadow"
              >
                Submit Your First Complaint Now
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {complaints.slice(0, 3).map((item) => (
                <Link
                  key={item.id}
                  to={`/complaints/${item.id}`}
                  className="block bg-slate-900/60 hover:bg-slate-900 border border-slate-700/60 rounded-xl p-4 transition-colors space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                      {item.title}
                    </h4>
                    <span className="px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-300">
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>📁 {item.category} • 📍 {item.location}</span>
                    <span className="font-mono">{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default StudentDashboard;
