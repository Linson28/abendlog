import React from 'react';
import { HashRouter, Routes, Route, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar.tsx';
import HomePage from './pages/HomePage.tsx';
import AddLogPage from './pages/AddLogPage.tsx';
import SearchPage from './pages/SearchPage.tsx';

const AppLayoutWithSidebar: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 h-screen overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

const App: React.FC = () => {
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

export default App;