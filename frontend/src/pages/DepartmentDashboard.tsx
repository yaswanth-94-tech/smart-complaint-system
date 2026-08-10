import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export function DepartmentDashboard() {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-600 flex items-center justify-center text-white font-bold">
            D
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100">Smart Complaint Management</h1>
            <p className="text-xs text-slate-400">Department Staff Portal</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-200">{userProfile?.name}</div>
            <div className="text-xs text-amber-400 font-mono">role: {userProfile?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition-colors border border-slate-600"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Department Staff Console</h2>
              <p className="text-sm text-slate-400">Manage assigned campus complaints and track progress.</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-900/50 border border-amber-700 text-amber-300 text-xs font-semibold uppercase tracking-wider">
              Department Role Verified
            </span>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-700/50 text-sm text-slate-300">
            Logged in as <span className="font-semibold text-amber-300">{userProfile?.email}</span> (Department: {userProfile?.department || 'Unassigned'})
          </div>
        </div>
      </main>
    </div>
  );
}

export default DepartmentDashboard;
