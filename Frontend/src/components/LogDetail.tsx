import React from 'react';
import type { AbendLog } from '../types';
import { EditIcon, CopyIcon, TrashIcon, XIcon } from './icons';

interface LogDetailProps {
  log: AbendLog;
  onClose: () => void;
  onDelete: (log: AbendLog) => void;
  onCopy: (log: AbendLog) => void;
  onEdit: (log: AbendLog) => void;
}

const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <p className="text-sm font-medium text-black-1000">{label}</p>
    <p className="mt-1 text-gray-800">{value || '-'}</p>
  </div>
);

const DetailSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white p-6 rounded-lg border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
    <div className="space-y-4">{children}</div>
  </div>
);

const LogDetail: React.FC<LogDetailProps> = ({ log, onClose, onDelete, onCopy, onEdit }) => {
  const handleDelete = () => {
    onDelete(log);
  };

  const handleEdit = () => {
    onEdit(log);
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      <header className="p-4 flex items-center justify-between bg-white border-b border-gray-200 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-800 space-x-2 truncate">
          <span className="font-bold">Log Number: {String(log.log_number).padStart(4, '0')}</span>
        </h2>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button onClick={handleEdit} title="Edit Log" className="p-2 rounded-md hover:bg-gray-100 text-gray-500"><EditIcon className="w-5 h-5"/></button>
          <button onClick={() => onCopy(log)} title="Copy Log" className="p-2 rounded-md hover:bg-gray-100 text-gray-500"><CopyIcon className="w-5 h-5"/></button>
          <button onClick={handleDelete} title="Delete Log" className="p-2 rounded-md hover:bg-red-100 text-red-500"><TrashIcon className="w-5 h-5"/></button>
          <button onClick={onClose} title="Close" className="p-2 rounded-md hover:bg-gray-100 text-gray-500"><XIcon className="w-5 h-5"/></button>
        </div>
      </header>

      <div className="flex-grow p-6 overflow-y-auto space-y-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Log Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <DetailItem label="Log Number" value={<strong>{String(log.log_number).padStart(4, '0')}</strong>} />
            <DetailItem label="Subsystem" value={log.subsystem} />
            <DetailItem label="Composite" value={log.composite} />
            <DetailItem label="Program" value={log.program} />
            <DetailItem label="Abend Code" value={log.abend_code} />
            <DetailItem label="Job Name" value={log.job_name} />
            <DetailItem label="Job Number" value={log.job_number} />
            <DetailItem label="Step" value={log.step} />
            <DetailItem label="Abend Date" value={log.abend_date} />
            <DetailItem label="SE Name" value={log.se_name} />
            <DetailItem label="Category" value={log.category} />
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-200 pt-4">
             <DetailItem label="Entry Info" value={`By ${log.entered_by} on ${log.entered_date || ''} at ${log.entered_time || ''}`} />
             {log.updated_by && (
                <DetailItem label="Last Update" value={`By ${log.updated_by} on ${log.updated_date || ''} at ${log.updated_time || ''}`} />
             )}
          </div>
          <div className="mt-4 space-y-4 border-t border-gray-200 pt-4">
              <DetailItem label="Description" value={log.description} />
              <DetailItem label="Files" value={<span className="font-mono text-sm">{log.files}</span>} />
          </div>
        </div>

        <DetailSection title="Detailed Analysis">
          <DetailItem label="Problem :" value={log.problem_detail} />
          <DetailItem label="Resolution :" value={log.resolution_steps} />
          <DetailItem label="Recovery :" value={log.recovery_required} />
          <DetailItem label="Results :" value={log.results_code} />
          <DetailItem label="Prevention :" value={log.prevention_note} />
        </DetailSection>
      </div>
    </div>
  );
};

export default LogDetail;