import React from 'react';
import { HashRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar.tsx';
import HomePage from './pages/HomePage.tsx';
import AddLogPage from './pages/AddLogPage.tsx';
import SearchPage from './pages/SearchPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import PasswordResetPage from './pages/PasswordResetPage.tsx';
import AdminConsolePage from './pages/AdminConsolePage.tsx';

const AppLayoutWithSidebar: React.FC = () => (
  <div className="flex h-screen bg-gray-50">
    <Sidebar />
    <main className="flex-1 h-screen overflow-hidden">
      <Outlet />
    </main>
  </div>
);

const AppContent: React.FC = () => {
  const { session } = useAuth();

  if (!session) return <LoginPage />;
  if (session.must_reset_pw) return <PasswordResetPage />;
  if (session.login_mode === 'admin') return <AdminConsolePage />;

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route element={<AppLayoutWithSidebar />}>
          <Route path="add" element={<AddLogPage />} />
          <Route path="edit/:year/:log_number" element={<AddLogPage />} />
          <Route path="search" element={<SearchPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
