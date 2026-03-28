import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, PlusCircleIcon, SearchIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { path: '/', icon: HomeIcon, label: 'Home' },
  { path: '/add', icon: PlusCircleIcon, label: 'Add New Log' },
  { path: '/search', icon: SearchIcon, label: 'Search Logs' },
];

const SignOutIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

const Sidebar: React.FC = () => {
  const { logout, session } = useAuth();

  const initial = (session?.display_name || session?.user_id || '?')
    .charAt(0)
    .toUpperCase();

  return (
    <aside className="w-16 flex flex-col items-center bg-white border-r border-gray-200 py-4">
      <nav className="flex flex-col items-center space-y-3 pt-4 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={item.label}
            className={({ isActive }) =>
              `p-3 rounded-lg hover:bg-blue-50 transition-colors ${
                isActive && item.path !== '/' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'
              }`
            }
          >
            <item.icon className="w-6 h-6" />
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-col items-center gap-2 mt-auto pb-2">
        <div
          title={session?.display_name || session?.user_id}
          className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold select-none"
        >
          {initial}
        </div>
        <button
          onClick={logout}
          title="Sign Out"
          className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <SignOutIcon />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
