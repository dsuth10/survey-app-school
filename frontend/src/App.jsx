import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LoginPage from './pages/LoginPage';
import CreateSurvey from './pages/CreateSurvey';
import BrowseSurveys from './pages/BrowseSurveys';
import TakeSurvey from './pages/TakeSurvey';
import ResultsDashboard from './pages/ResultsDashboard';
import ManageClass from './pages/ManageClass';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import MainLayout from './components/MainLayout';

const ProtectedRoute = ({ children, noLayout }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  if (noLayout) return <>{children}</>;
  return <MainLayout>{children}</MainLayout>;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route 
              path="/" 
              element={<Navigate to="/dashboard" replace />} 
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute noLayout>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/create" 
              element={
                <ProtectedRoute>
                  <CreateSurvey />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/browse" 
              element={
                <ProtectedRoute>
                  <BrowseSurveys />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/take-survey/:id" 
              element={
                <ProtectedRoute>
                  <TakeSurvey />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/results/:id" 
              element={
                <ProtectedRoute>
                  <ResultsDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manage-class" 
              element={
                <ProtectedRoute>
                  <ManageClass />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
