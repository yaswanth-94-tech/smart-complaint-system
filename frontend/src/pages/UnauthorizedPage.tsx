import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function UnauthorizedPage() {
  const { userProfile } = useAuth();

  const getHomePath = () => {
    if (!userProfile) return '/login';
    switch (userProfile.role) {
      case 'student':
        return '/student';
      case 'department_staff':
        return '/department';
      case 'admin':
        return '/admin';
      default:
        return '/login';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 bg-red-900/40 border border-red-700 rounded-full flex items-center justify-center mx-auto text-red-400 font-bold text-2xl">
          !
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-50">Access Denied</h1>
          <p className="text-sm text-slate-400">
            Your account <span className="font-semibold text-slate-200">({userProfile?.role || 'Guest'})</span> does not have authorization to view this section.
          </p>
        </div>

        <Link
          to={getHomePath()}
          className="inline-block py-2.5 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-md transition-all text-sm"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default UnauthorizedPage;
