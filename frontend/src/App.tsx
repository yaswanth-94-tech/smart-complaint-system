import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { DepartmentDashboardPage } from './pages/DepartmentDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminComplaintsPage } from './pages/AdminComplaintsPage';
import { AdminAnalyticsPage } from './pages/AdminAnalyticsPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { NewComplaintPage } from './pages/NewComplaintPage';
import { ComplaintsListPage } from './pages/ComplaintsListPage';
import { ComplaintDetailPage } from './pages/ComplaintDetailPage';

function HomeRedirect() {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-100">
        <div className="flex items-center space-x-3 bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="font-medium text-slate-300">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return <Navigate to="/login" replace />;
  }

  switch (userProfile.role) {
    case 'student':
      return <Navigate to="/student" replace />;
    case 'department_staff':
      return <Navigate to="/department" replace />;
    case 'admin':
      return <Navigate to="/admin" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Student Protected Routes */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/complaints"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <ComplaintsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/complaints/new"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <NewComplaintPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/complaints/:id"
            element={
              <ProtectedRoute allowedRoles={['student', 'department_staff', 'admin']}>
                <ComplaintDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Department Staff Protected Route */}
          <Route
            path="/department"
            element={
              <ProtectedRoute allowedRoles={['department_staff']}>
                <DepartmentDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/complaints"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminComplaintsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAnalyticsPage />
              </ProtectedRoute>
            }
          />

          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
