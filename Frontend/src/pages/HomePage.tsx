
import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircleIcon, SearchIcon } from '../components/icons';

const ActionCard: React.FC<{ to: string; icon: React.ReactNode; title: string; description: string }> = ({ to, icon, title, description }) => (
  <Link to={to} className="group">
    <div className="bg-white p-8 rounded-xl border-2 border-dashed border-gray-300 group-hover:border-blue-500 group-hover:shadow-lg transition-all duration-300 text-center flex flex-col items-center">
      <div className="text-blue-600 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-gray-500">{description}</p>
    </div>
  </Link>
);

const HomePage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-start h-full text-center p-8 pt-32">
      <h1 className="text-5xl font-bold text-gray-800">Abend Logs</h1>
      <p className="mt-4 text-xl text-gray-600 max-w-xl">
        Track and analyze abends efficiently
      </p>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
        <ActionCard
          to="/add"
          icon={<PlusCircleIcon className="w-12 h-12" />}
          title="Add New Log"
          description="Document a new abend"
        />
        <ActionCard
          to="/search"
          icon={<SearchIcon className="w-12 h-12" />}
          title="Search Logs"
          description="Find and analyze existing Abend logs"
        />
      </div>
    </div>
  );
};

export default HomePage;