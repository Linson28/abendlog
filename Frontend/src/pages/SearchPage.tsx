import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { AbendLog, AbendLogFilter } from '../types';
import { api } from '../services/api';
import LogDetail from '../components/LogDetail';
import { SearchIcon } from '../components/icons';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';

const PAGE_SIZE = 50;

const getInitialState = <T,>(key: string, fallback: T): T => {
    try {
        const savedState = sessionStorage.getItem(key);
        return savedState ? JSON.parse(savedState) : fallback;
    } catch (e) {
        console.error(`Failed to parse session storage item "${key}"`, e);
        sessionStorage.removeItem(key);
        return fallback;
    }
};

const Pagination: React.FC<{
  currentPage: number;
  totalLogs: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}> = ({ currentPage, totalLogs, pageSize, onPageChange, isLoading }) => {
  const totalPages = Math.ceil(totalLogs / pageSize);

  if (totalPages <= 1) {
    return null;
  }
  
  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-white sticky bottom-0">
      <p className="text-sm text-gray-700">
        Showing{' '}
        <span className="font-medium">{Math.min((currentPage - 1) * pageSize + 1, totalLogs)}</span>
        {' '}to{' '}
        <span className="font-medium">{Math.min(currentPage * pageSize, totalLogs)}</span>
        {' '}of{' '}
        <span className="font-medium">{totalLogs}</span>
        {' '}results
      </p>
      <nav className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </nav>
    </div>
  );
};


const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [filters, setFilters] = useState<AbendLogFilter>(() => getInitialState('abendLogFilters', {}));
  const [results, setResults] = useState<AbendLog[]>(() => getInitialState('abendLogResults', []));
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState<boolean>(() => !!sessionStorage.getItem('abendLogFilters'));
  const [selectedLog, setSelectedLog] = useState<AbendLog | null>(null);
  const [logToDelete, setLogToDelete] = useState<AbendLog | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showFilterWarning, setShowFilterWarning] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(() => getInitialState('abendLogCurrentPage', 1));
  const [totalLogs, setTotalLogs] = useState<number>(() => getInitialState('abendLogTotalLogs', 0));

  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  });

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    if (showFilterWarning) {
      setShowFilterWarning(false);
    }
  };

  const performSearch = useCallback(async (pageToFetch: number) => {
    const currentFilters = filtersRef.current;
    const hasActiveFilter = Object.values(currentFilters).some(v => v && String(v).trim() !== '');

    if (!hasActiveFilter) {
      setShowFilterWarning(true);
      setSearched(true);
      setResults([]);
      setTotalLogs(0);
      setCurrentPage(1);
      sessionStorage.removeItem('abendLogFilters');
      sessionStorage.removeItem('abendLogResults');
      sessionStorage.removeItem('abendLogTotalLogs');
      sessionStorage.removeItem('abendLogCurrentPage');
      return;
    }

    setShowFilterWarning(false);
    setIsLoading(true);
    setSearched(true);
    setSelectedLog(null);
    try {
      const data = await api.getLogs(currentFilters, pageToFetch, PAGE_SIZE);
      setResults(data.logs);
      setTotalLogs(data.totalCount);
      setCurrentPage(pageToFetch);

      sessionStorage.setItem('abendLogFilters', JSON.stringify(currentFilters));
      sessionStorage.setItem('abendLogResults', JSON.stringify(data.logs));
      sessionStorage.setItem('abendLogTotalLogs', JSON.stringify(data.totalCount));
      sessionStorage.setItem('abendLogCurrentPage', JSON.stringify(pageToFetch));
    } catch (error) {
      console.error("Failed to fetch logs", error);
      alert("Failed to fetch logs.");
      setResults([]);
      setTotalLogs(0);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const handleSearch = useCallback(() => {
    performSearch(1);
  }, [performSearch]);

  useEffect(() => {
    if (location.state?.refreshSearch) {
        handleSearch();
        navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, handleSearch, navigate, location.pathname]);

  const handleClear = () => {
    setFilters({});
    setResults([]);
    setSearched(false);
    setSelectedLog(null);
    setShowFilterWarning(false);
    setCurrentPage(1);
    setTotalLogs(0);
    sessionStorage.removeItem('abendLogFilters');
    sessionStorage.removeItem('abendLogResults');
    sessionStorage.removeItem('abendLogCurrentPage');
    sessionStorage.removeItem('abendLogTotalLogs');
  };
  
  const handleDeleteRequest = (log: AbendLog) => {
    setLogToDelete(log);
  };

  const confirmDelete = async () => {
    if (!logToDelete) return;
    const yearToDelete = parseInt(logToDelete.abend_date.substring(0, 4), 10);
    const logNumberToDelete = logToDelete.log_number;
    
    setSelectedLog(null);
    setLogToDelete(null);

    try {
      await api.deleteLog(yearToDelete, logNumberToDelete);
      setToastMessage(`Log #${String(logNumberToDelete).padStart(4, '0')} deleted.`);
      // Refresh the current page to reflect deletion
      performSearch(currentPage);
    } catch (error) {
      console.error("Failed to delete log", error);
      alert('Failed to delete log.');
    }
  };

  const handleCopy = (log: AbendLog) => {
    setSelectedLog(null);
    navigate('/add', { state: { logToCopy: log } });
  };

  const handleEdit = (log: AbendLog) => {
    setSelectedLog(null);
    const year = parseInt(log.abend_date.substring(0, 4), 10);
    navigate(`/edit/${year}/${log.log_number}`);
  };

  const headers = [
    { key: 'subsystem', label: 'Subsystem' },
    { key: 'composite', label: 'Composite' },
    { key: 'program', label: 'Program' },
    { key: 'abend_code', label: 'Abend' },
    { key: 'job_name', label: 'Job Name' },
    { key: 'year', label: 'Year' },
    { key: 'mmdd', label: 'MMDD' },
    { key: 'log_number', label: 'Log Num' },
    { key: 'se_name', label: 'SE Name' },
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= Math.ceil(totalLogs / PAGE_SIZE)) {
        performSearch(newPage);
    }
  };

  const renderTableBody = () => {
    if (isLoading) {
      return <tbody><tr><td colSpan={headers.length} className="text-center p-16 text-gray-500">Loading results...</td></tr></tbody>;
    }
    if (showFilterWarning) {
        return <tbody><tr><td colSpan={headers.length} className="text-center p-16 text-gray-500"><p>Please apply at least one filter to perform a search.</p></td></tr></tbody>;
    }
    if (!searched) {
      return <tbody><tr><td colSpan={headers.length} className="text-center p-16 text-gray-500"><div className="flex flex-col items-center"><SearchIcon className="w-16 h-16 text-gray-300 mb-4" /><p>Enter criteria in the filter fields above and click Search.</p></div></td></tr></tbody>;
    }
    if (results.length === 0) {
      return <tbody><tr><td colSpan={headers.length} className="text-center p-16 text-gray-500">No results found for your criteria.</td></tr></tbody>;
    }
    return (
      <tbody className="">
        {results.map(log => (
          <React.Fragment key={log.log_id}>
              {/* Top row with a top, left, and right border */}
              <tr className="hover:bg-blue-50 cursor-pointer border-t-2 border-r-2 border-l-2 border-blue-300" onClick={() => setSelectedLog(log)}>
                {headers.map(header => {
                    let value: React.ReactNode;
                    const tdClassName = `px-3 py-3 text-sm whitespace-nowrap truncate`;
                    switch (header.key) {
                        case 'log_number':
                            value = String(log.log_number).padStart(4, '0');
                            return <td key={header.key} className={`${tdClassName} font-semibold`}>{value}</td>;
                        case 'year':
                            value = log.abend_date.substring(0, 4);
                            break;
                        case 'mmdd':
                            value = log.abend_date.substring(5).replace('-', '');
                            break;
                        default:
                            value = log[header.key as keyof AbendLog] ?? '-';
                            break;
                    }
                    return <td key={header.key} className={tdClassName}>{value}</td>;
                })}
              </tr>
                {/* Bottom row with a bottom, left, and right border */}
              <tr className="hover:bg-blue-50 cursor-pointer border-b-2 border-r-2 border-l-2 border-blue-300" onClick={() => setSelectedLog(log)}>
                <td colSpan={headers.length} className="px-3 py-2 pb-3 pt-0 text-sm text-gray-700">
                    <strong className="font-semibold text-gray-500">Description:</strong> {log.description}
                </td>
              </tr>
          </React.Fragment>
        ))}
      </tbody>
    );
  };


  return (
    <div className="h-full relative fade-in">
      <div className="p-8 h-full flex flex-col">
        <header className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Search Logs</h1>
            {searched && !isLoading && !showFilterWarning && <p className="text-sm text-gray-600 mt-1">{totalLogs} result{totalLogs !== 1 && 's'} found</p>}
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={handleClear} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Clear</button>
            <button onClick={handleSearch} disabled={isLoading} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400">{isLoading ? 'Searching...' : 'Search'}</button>
          </div>
        </header>

        <div className="bg-white border border-gray-200 rounded-lg flex-grow flex flex-col overflow-hidden">
          <div className="flex-grow overflow-y-auto relative">
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0 z-10 divide-y-2 divide-gray-200">
                  <tr>
                    {headers.map(h => <th key={h.key} className="px-3 py-2 text-left text-xs font-semibold text-black-500 uppercase tracking-wider">{h.label}</th>)}
                  </tr>
                  <tr>
                    {headers.map(h => (
                      <th key={h.key} className="px-2 pb-2 font-normal">
                        <input type="text" name={h.key} value={filters[h.key as keyof AbendLogFilter] || ''} onChange={handleFilterChange} onKeyDown={handleKeyDown} className="w-full px-2 py-1.5 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" autoComplete="off" />
                      </th>
                    ))}
                  </tr>
              </thead>
              {renderTableBody()}
            </table>
          </div>
           <Pagination 
            currentPage={currentPage}
            totalLogs={totalLogs}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
            isLoading={isLoading}
          />
        </div>
      </div>
      
      {selectedLog && (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40 p-4"
            onClick={() => setSelectedLog(null)}
            aria-modal="true"
            role="dialog"
        >
          <div 
            className="bg-gray-50 rounded-lg shadow-xl w-[85vw] h-[85vh] max-w-7xl max-h-[900px] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'zoomIn 0.2s ease-out' }}
          >
            <LogDetail 
              log={selectedLog} 
              onClose={() => setSelectedLog(null)}
              onDelete={handleDeleteRequest}
              onCopy={handleCopy}
              onEdit={handleEdit}
            />
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!logToDelete}
        title="Confirm Deletion"
        message={
            logToDelete && (
                <p>Are you sure you want to delete log <strong>#{String(logToDelete.log_number).padStart(4, '0')}</strong>? This action cannot be undone.</p>
            )
        }
        onConfirm={confirmDelete}
        onCancel={() => setLogToDelete(null)}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
};

export default SearchPage;