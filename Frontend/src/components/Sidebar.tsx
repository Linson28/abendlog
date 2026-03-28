import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, PlusCircleIcon, SearchIcon } from './icons';

const navItems = [
  { path: '/', icon: HomeIcon, label: 'Home' },
  { path: '/add', icon: PlusCircleIcon, label: 'Add New Log' },
  { path: '/search', icon: SearchIcon, label: 'Search Logs' },
];

const Sidebar: React.FC = () => {
  return (
    <aside className="w-16 flex flex-col items-center bg-white border-r border-gray-200 py-4 space-y-4">
      <nav className="flex flex-col items-center space-y-3 pt-4">
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
    </aside>
  );
};

export default Sidebar;